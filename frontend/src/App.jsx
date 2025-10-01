import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Container, TextField, Button, Typography,
  List, ListItem, ListItemText, Stack, Paper, Alert
} from "@mui/material";

const API = import.meta.env.VITE_API_BASE; 

export default function App() {
  const [bets,setBets] = useState([]);
  const [user,setUser] = useState("user1");
  const [amount,setAmount] = useState(10);
  const [status,setStatus] = useState("connecting");

  const socket = useMemo(() => io(API, {
    path: "/socket.io/",
    reconnection: true
  }), [API]);

  useEffect(() => {
    fetch(`${API}/api/bets`)
      .then(r=>r.json())
      .then(setBets)
      .catch(()=>{});
    socket.on("connect", ()=> setStatus("connected"));
    socket.on("disconnect", ()=> setStatus("reconnecting"));
    socket.on("reconnect", ()=> setStatus("connected"));
    socket.on("bet:new", b => setBets(prev => [b, ...prev].slice(0,100)));
    return () => socket.close();
  }, [API, socket]);

  const place = () => socket.emit("bet:place",{ user, amount, round:"R1" });

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" gutterBottom>Sala de Apuestas (HA)</Typography>
      {status !== "connected" && <Alert severity="info">Estado: {status}</Alert>}
      <Paper sx={{ p:2, mb:2 }}>
        <Stack spacing={2} direction="row">
          <TextField label="Usuario" value={user} onChange={e=>setUser(e.target.value)} size="small"/>
          <TextField label="Apuesta" type="number" value={amount} onChange={e=>setAmount(+e.target.value)} size="small"/>
          <Button variant="contained" onClick={place}>Apostar</Button>
        </Stack>
      </Paper>
      <Typography variant="subtitle1">Últimas apuestas</Typography>
      <List dense>
        {bets.map(b=>(
          <ListItem key={b._id} divider>
            <ListItemText primary={`${b.user} apostó ${b.amount}`} secondary={new Date(b.createdAt).toLocaleTimeString()}/>
          </ListItem>
        ))}
      </List>
    </Container>
  );
}
