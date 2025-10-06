import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import modelsFactory from "./models.js";

// --- config ---
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
if (!MONGODB_URI) { console.error("Missing MONGODB_URI"); process.exit(1); }

// --- app & io ---
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { path: "/socket.io/", cors: { origin: "*" } });

// --- redis adapter ---
const pub = createClient({ url: REDIS_URL });
const sub = pub.duplicate();
await pub.connect(); await sub.connect();
io.adapter(createAdapter(pub, sub));

// --- mongo ---
const conn = await mongoose.createConnection(MONGODB_URI, {
  dbName: "casino",
  readPreference: "secondaryPreferred",
  serverSelectionTimeoutMS: 15000
}).asPromise();
const { User, Round, Bet } = modelsFactory(conn);

// --- utils ---
const now = () => new Date();
const toDec = (n) => mongoose.Types.Decimal128.fromString(String(n));
const decToNum = (d) => (d ? Number(d.toString()) : 0);
const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max));
const remainingMs = (u)=> Math.max(0, (u?.sessionEndAt?.getTime()||0) - Date.now());

// --- sesiones 30-60 min ---
async function ensureSession(username, initial=0){
  let u = await User.findOne({ username });
  const end = new Date(Date.now() + randInt(30,60)*60*1000);
  if (!u) {
    u = await User.create({ username, balance: toDec(initial||0), sessionEndAt: end });
  } else if (!u.sessionEndAt || u.sessionEndAt < now()) {
    u.sessionEndAt = end;
    if (initial>0) u.balance = toDec(decToNum(u.balance)+initial);
    await u.save();
  }
  return u;
}

// --- motor Crash ---
const T_BETTING   = 5000;   // ventana de apuestas
const T_ENGINE    = 80;     // paso motor multiplicador
const T_TICK      = 200;    // tick UI
const T_COOLDOWN  = 20000;  // pausa entre rondas

let current = {
  round: null,
  phase: "closed",
  multiplier: 1.00,
  engineTimer: null,
  tickTimer: null
};

// distribución pesada de cola
function sampleCrashMultiplier(){
  const u = Math.max(0.01, Math.random());
  return Math.min(10, 1 + 1/(u*4));
}

function clearTimers(){
  if (current.engineTimer) { clearInterval(current.engineTimer); current.engineTimer = null; }
  if (current.tickTimer)   { clearInterval(current.tickTimer);   current.tickTimer   = null; }
}

async function startRound(){
  clearTimers();

  const code = `R${Date.now()}`;
  const openedAt = now();
  const bettingEndsAt = new Date(openedAt.getTime() + T_BETTING);

  current.multiplier = 1.00;
  current.phase = "betting";
  current.round = await Round.create({ code, phase:"betting", openedAt, bettingEndsAt });

  io.emit("round:open", { code, phase:"betting", openedAt, bettingEndsAt, multiplier: current.multiplier, now: now() });

  current.tickTimer = setInterval(()=>{
    io.emit("round:tick", {
      code,
      phase: current.phase,
      multiplier: Number(current.multiplier.toFixed(2)),
      openedAt, bettingEndsAt, now: now()
    });
  }, T_TICK);

  setTimeout(()=> startFlying(code), bettingEndsAt.getTime() - Date.now());
}

async function startFlying(code){
  if (!current.round || current.round.code !== code) return;
  current.phase = "flying";
  await Round.updateOne({ code }, { $set: { phase:"flying" } });

  const crashAt = sampleCrashMultiplier();
  const startTs = Date.now();

  current.engineTimer = setInterval(async ()=>{
    const t = (Date.now() - startTs) / 1000;
    const growth = Math.pow(1.018, t*10);
    current.multiplier = Math.max(1.00, 1.00 * growth);

    if (current.multiplier >= crashAt) {
      clearInterval(current.engineTimer);
      current.engineTimer = null;
      await doCrash(code, crashAt);
    }
  }, T_ENGINE);
}

async function doCrash(code, crashAt){
  current.phase = "crashed";
  const crashedAt = now();
  await Round.updateOne({ code }, { $set: { phase:"crashed", crashedAt, crashMultiplier: toDec(crashAt) } });

  await Bet.updateMany({ roundCode: code, status:"placed" }, { $set: { status:"lost" } });

  io.emit("round:crash", { code, crashMultiplier: Number(crashAt.toFixed(2)), crashedAt });

  // cerrar y anunciar próxima ronda con countdown
  setTimeout(async ()=>{
    clearTimers();
    const nextOpenAt = new Date(Date.now() + T_COOLDOWN);
    await Round.updateOne({ code }, { $set: { phase:"closed", closedAt: now() } });
    current.phase = "closed";
    current.multiplier = 1.00;
    io.emit("round:closed", { code, nextOpenAt, now: now() });
    setTimeout(startRound, T_COOLDOWN);
  }, 600);
}

// --- APIs ---
app.get("/health", (_req,res)=>res.json({ ok:true }));

app.post("/api/users/login", async (req,res)=>{
  try{
    const { username, initialDeposit=0 } = req.body || {};
    if (!username) return res.status(400).json({ error:"username requerido" });
    const u = await ensureSession(username, Number(initialDeposit||0));
    res.json({ username:u.username, balance: decToNum(u.balance), sessionEndAt: u.sessionEndAt, remainingMs: remainingMs(u), now: now() });
  }catch(e){ res.status(500).json({ error:"fail", detail:e.message }); }
});

app.post("/api/users/deposit", async (req,res)=>{
  try{
    const { username, amount } = req.body || {};
    if (!username || !amount) return res.status(400).json({ error:"username y amount requeridos" });
    const u = await User.findOne({ username });
    if (!u) return res.status(404).json({ error:"usuario no existe" });
    if (!u.sessionEndAt || u.sessionEndAt<now()) return res.status(403).json({ error:"sesión expirada" });
    u.balance = toDec(decToNum(u.balance) + Number(amount));
    await u.save();
    const out = { username:u.username, balance: decToNum(u.balance), sessionEndAt: u.sessionEndAt, remainingMs: remainingMs(u) };
    io.emit("user:update", out);
    res.json(out);
  }catch(e){ res.status(500).json({ error:"fail", detail:e.message }); }
});

app.get("/api/rounds/current", async (_req,res)=>{
  if (!current.round) return res.json(null);
  const { code, openedAt, bettingEndsAt } = current.round;
  res.json({
    code, openedAt, bettingEndsAt,
    phase: current.phase,
    multiplier: Number(current.multiplier.toFixed(2)),
    now: now()
  });
});

app.get("/api/bets", async (req,res)=>{
  const limit = Math.min(parseInt(req.query.limit||"50",10), 200);
  const docs = await Bet.find().sort({ createdAt:-1 }).limit(limit).lean();
  docs.forEach(d=>{
    if (d.amount) d.amount = d.amount.toString();
    if (d.payout) d.payout = d.payout.toString();
    if (d.cashoutMultiplier) d.cashoutMultiplier = d.cashoutMultiplier.toString();
  });
  res.json(docs);
});

app.post("/api/bets", async (req,res)=>{
  try{
    const { username, amount } = req.body || {};
    if (!username || amount==null) return res.status(400).json({ error:"username y amount requeridos" });
    const u = await User.findOne({ username });
    if (!u) return res.status(404).json({ error:"usuario no existe" });
    if (!u.sessionEndAt || u.sessionEndAt<now()) return res.status(403).json({ error:"sesión expirada" });

    if (!current.round || current.phase!=="betting") return res.status(409).json({ error:"fuera de ventana de apuestas" });

    const val = Number(amount);
    if (!Number.isFinite(val) || val<=0) return res.status(400).json({ error:"monto inválido" });
    if (decToNum(u.balance) < val) return res.status(402).json({ error:"saldo insuficiente" });

    await User.updateOne({ _id:u._id }, { $inc: { balance: toDec(-val) } });
    const bet = await Bet.create({
      user: username,
      roundCode: current.round.code,
      amount: toDec(val),
      status: "placed"
    });
    const payload = { ...bet.toObject(), amount: val };
    io.emit("bet:new", payload);
    res.status(201).json(payload);
  }catch(e){ res.status(500).json({ error:"fail", detail:e.message }); }
});

app.post("/api/bets/cashout", async (req,res)=>{
  try{
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error:"username requerido" });
    if (!current.round || current.phase!=="flying") return res.status(409).json({ error:"no disponible" });

    const bet = await Bet.findOne({ user: username, roundCode: current.round.code, status:"placed" });
    if (!bet) return res.status(404).json({ error:"no hay apuesta activa" });

    const mult = Number(current.multiplier.toFixed(2));
    const base = decToNum(bet.amount);
    const payout = Math.floor(base * mult);

    bet.status = "cashed";
    bet.cashedAt = now();
    bet.cashoutMultiplier = toDec(mult);
    bet.payout = toDec(payout);
    await bet.save();

    await User.updateOne({ username }, { $inc: { balance: toDec(payout) } });

    const out = {
      _id: bet._id.toString(),
      user: bet.user,
      roundCode: bet.roundCode,
      cashoutMultiplier: mult,
      payout
    };
    io.emit("bet:cashed", out);
    const u = await User.findOne({username});
    io.emit("user:update", { username, balance: u.balance, sessionEndAt: u.sessionEndAt, remainingMs: remainingMs(u) });
    res.json(out);
  }catch(e){ res.status(500).json({ error:"fail", detail:e.message }); }
});

// sockets (atajos equivalentes)
io.on("connection",(socket)=>{
  socket.on("bet:place", async ({ username, amount })=>{
    try{ await fetchPost("/api/bets",{ username, amount }); }catch(_e){}
  });
  socket.on("bet:cashout", async ({ username })=>{
    try{ await fetchPost("/api/bets/cashout",{ username }); }catch(_e){}
  });
});

async function fetchPost(path, body){
  const url = `http://127.0.0.1:${PORT}${path}`;
  await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
}

// start
server.listen(PORT, async ()=>{
  console.log(`API on :${PORT}`);
  await startRound();
});
