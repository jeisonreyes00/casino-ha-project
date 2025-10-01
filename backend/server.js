import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import modelsFactory from "./models.js";
import client from "prom-client";
client.collectDefaultMetrics(); // CPU, memoria, event loop

const betsTotal   = new client.Counter({ name: "bets_total", help: "Apuestas creadas" });
const betsErrors  = new client.Counter({ name: "bets_errors_total", help: "Errores al crear apuesta" });
const betsLatency = new client.Histogram({
  name: "bet_process_ms",
  help: "Tiempo de procesamiento de POST /api/bets",
  buckets: [10, 25, 50, 100, 200, 500, 1000]
});
const wsClients = new client.Gauge({ name: "ws_clients", help: "Conexiones WebSocket activas" });



const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in env");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// endpoint de métricas
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

const server = http.createServer(app);
const io = new Server(server, {
  path: "/socket.io/",
  cors: { origin: "*" }
});

// Redis adapter for multi-node broadcasting
const pub = createClient({ url: REDIS_URL });
const sub = pub.duplicate();
await pub.connect(); await sub.connect();
io.adapter(createAdapter(pub, sub));

// DB connection (reads prefer secondary)
const conn = await mongoose.createConnection(MONGODB_URI, {
  dbName: "casino",
  readPreference: "secondaryPreferred",
  serverSelectionTimeoutMS: 15000
}).asPromise();

const { User, Round, Bet } = modelsFactory(conn);

app.get("/health", (_req, res) => res.json({ ok: true }));

// Bets API
app.get("/api/bets", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
  const docs = await Bet.find().sort({ createdAt: -1 }).limit(limit).lean();
  docs.forEach(d => {
    if (d.amount) d.amount = d.amount.toString();
    if (d.payout) d.payout = d.payout.toString();
  });
  res.json(docs);
});

app.post("/api/bets", async (req, res) => {
  const end = betsLatency.startTimer(); // --- métrica de latencia ---
  try {
    const { user, amount, round } = req.body || {};
    if (!user || amount == null) {
      betsErrors.inc();
      return res.status(400).json({ error: "user y amount requeridos" });
    }
    const bet = await Bet.create({
      user,
      amount: mongoose.Types.Decimal128.fromString(String(amount)),
      round: round || "R1",
      status: "placed"
    });
    betsTotal.inc(); // --- contador de apuestas ---
    const payload = { ...bet.toObject(), amount: bet.amount.toString() };
    io.emit("bet:new", payload);
    res.status(201).json(payload);
  } catch (e) {
    betsErrors.inc();
    res.status(500).json({ error: "fail", detail: e.message });
  } finally {
    end(); // ---- fin métrica de latencia ----
  }
});

// Open/close round endpoints (simple demo)
app.post("/api/rounds/open", async (_req, res) => {
  const code = `R${Date.now()}`;
  const r = await Round.create({ code, state: "open", openedAt: new Date() });
  res.json(r);
});

app.post("/api/rounds/close", async (req, res) => {
  const { code, crashMultiplier } = req.body || {};
  const r = await Round.findOneAndUpdate(
    { code },
    {
      state: "closed",
      closedAt: new Date(),
      crashMultiplier: crashMultiplier
        ? mongoose.Types.Decimal128.fromString(String(crashMultiplier))
        : undefined
    },
    { new: true }
  );
  res.json(r);
});

// Socket.IO handlers
io.on("connection", (socket) => {
  wsClients.inc();                      // --- gauge WS ---
  socket.emit("hello", { id: socket.id });
  socket.on("disconnect", () => wsClients.dec());

  socket.on("bet:place", async (p) => {
    if (!p?.user || p?.amount == null) return;
    const bet = await Bet.create({
      user: p.user,
      amount: mongoose.Types.Decimal128.fromString(String(p.amount)),
      round: p.round ?? "R1",
      status: "placed"
    });
    io.emit("bet:new", { ...bet.toObject(), amount: bet.amount.toString() });
  });
});

server.listen(PORT, () => console.log(`API on :${PORT}`));
