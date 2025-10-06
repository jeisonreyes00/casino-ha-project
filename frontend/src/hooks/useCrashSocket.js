import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const fmtCOP = (n)=> new Intl.NumberFormat("es-CO",{ style:"currency", currency:"COP", maximumFractionDigits:0 }).format(Math.floor(Number(n||0)));
const randomUser = ()=>"jugador-"+Math.floor(1000+Math.random()*9000);

export default function useCrashSocket(apiBase){
  const base = (apiBase && apiBase.trim()) ? apiBase.replace(/\/+$/,"") : "";
  const url = (p)=> `${base}${p.startsWith("/") ? p : `/${p}`}`;

  const socket = useMemo(
    () => io(base || undefined, { path:"/socket.io/", reconnection:true, transports:["websocket","polling"] }),
    [base]
  );

  const [status,setStatus] = useState("connecting");
  const [phase,setPhase] = useState("closed");
  const [multiplier,setMultiplier] = useState(1.00);
  const [roundCode,setRoundCode] = useState(null);
  const [user,setUser] = useState(localStorage.getItem("user") || randomUser());
  const [balance,setBalance] = useState(0);
  const [betActive,setBetActive] = useState(false);
  const [bets,setBets] = useState([]);

  useEffect(()=> localStorage.setItem("user", user), [user]);

  const refreshBets = async ()=>{
    try{ const list = await fetch(url("/api/bets?limit=100")).then(r=>r.json()); setBets(Array.isArray(list)?list:[]); }catch{}
  };

  useEffect(()=>{
    let cancelled=false;
    (async ()=>{
      try{
        const u = await fetch(url("/api/users/login"),{
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ username:user })
        }).then(r=>r.json());
        if(!cancelled && u?.username) setBalance(u.balance||0);
      }catch{}
      try{
        const r = await fetch(url("/api/rounds/current")).then(r=>r.json()).catch(()=>null);
        if(!cancelled && r){ setRoundCode(r.code); setPhase(r.phase); setMultiplier(r.multiplier||1.00); }
      }catch{}
      if(!cancelled) refreshBets();
    })();
    return ()=>{ cancelled=true; };
  }, [base, user]);

  useEffect(()=>{
    const onConnect = ()=> setStatus("connected");
    const onDisconnect = ()=> setStatus("reconnecting");
    const onOpen = (r)=>{ setRoundCode(r.code); setPhase("betting"); setMultiplier(1.00); setBetActive(false); };
    const onTick = (r)=>{ setPhase(r.phase); setMultiplier(r.multiplier||1.00); setRoundCode(r.code); };
    const onCrash = (r)=>{ setPhase("crashed"); setMultiplier(r.crashMultiplier||1.00); setBetActive(false); setTimeout(refreshBets,350); };
    const onBetNew = (b)=>{
      setBets(prev=>[{...b,status:b.status||"placed",createdAt:b.createdAt||new Date().toISOString()}, ...prev].slice(0,150));
      if (b.user===user && b.roundCode===roundCode) setBetActive(true);
      if (b.user===user) setBalance(v=>Math.max(0, v-Number(b.amount||0)));
    };
    const onBetCashed = (b)=>{
      setBets(prev=>[{ _id:b._id,user:b.user,roundCode:b.roundCode,status:"cashed",payout:b.payout,cashoutMultiplier:b.cashoutMultiplier,createdAt:new Date().toISOString() }, ...prev].slice(0,150));
      if (b.user===user) setBetActive(false);
    };
    const onUserUpdate = (u)=>{ if(u.username===user){ const n=Number(u.balance?.toString?.()||u.balance||0); setBalance(Number.isFinite(n)?n:0);} };

    socket.on("connect",onConnect);
    socket.on("disconnect",onDisconnect);
    socket.on("round:open",onOpen);
    socket.on("round:tick",onTick);
    socket.on("round:crash",onCrash);
    socket.on("bet:new",onBetNew);
    socket.on("bet:cashed",onBetCashed);
    socket.on("user:update",onUserUpdate);

    return ()=>{
      socket.off("connect",onConnect);
      socket.off("disconnect",onDisconnect);
      socket.off("round:open",onOpen);
      socket.off("round:tick",onTick);
      socket.off("round:crash",onCrash);
      socket.off("bet:new",onBetNew);
      socket.off("bet:cashed",onBetCashed);
      socket.off("user:update",onUserUpdate);
      socket.close();
    };
  }, [socket, user, roundCode]);

  const place = (amount)=>{
    if (phase!=="betting") return { ok:false, msg:"Solo durante apuestas" };
    if (!amount || amount<100) return { ok:false, msg:"Mínimo 100" };
    if (balance < amount) return { ok:false, msg:"Saldo insuficiente" };
    socket.emit("bet:place", { username:user, amount:+amount });
    return { ok:true };
  };

  const cashout = ()=>{
    if (phase!=="flying" || !betActive) return { ok:false, msg:"No hay retiro disponible" };
    socket.emit("bet:cashout", { username:user });
    return { ok:true };
  };

  const deposit = async (amount)=>{
    if (!amount || amount<=0) return { ok:false, msg:"Monto inválido" };
    const r = await fetch(url("/api/users/deposit"),{
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ username:user, amount:Number(amount) })
    }).then(r=>r.json()).catch(()=>null);
    if (r?.balance!=null){ setBalance(r.balance); return { ok:true, balance:r.balance }; }
    return { ok:false, msg:"No se pudo recargar" };
  };

  return { status, phase, multiplier, roundCode, user, setUser, balance, betActive, place, cashout, deposit, bets, fmtCOP };
}
