import React from "react";
import { Card, CardContent, Stack, TextField, Chip, Button, InputAdornment, IconButton } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import RefreshIcon from "@mui/icons-material/Refresh";

const randomUser = ()=>"jugador-"+Math.floor(1000+Math.random()*9000);
const formatCOPLocal = (n)=> new Intl.NumberFormat("es-CO",{ style:"currency", currency:"COP", maximumFractionDigits:0 }).format(Math.floor(Number(n||0)));

export default function BalancePanel({ user, setUser, balance, onDeposit, onToast }){
  const handleDeposit = async (e)=>{
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const amount = Number(data.get("deposit") || 0);
    const r = await onDeposit(amount);
    if (r.ok) onToast({ sev:"success", msg:"Recarga exitosa" });
    else onToast({ sev:"error", msg:r.msg || "Error de recarga" });
    if (e?.currentTarget?.reset) e.currentTarget.reset();
  };

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleDeposit}>
          <Stack direction={{ xs:"column", sm:"row" }} gap={2} alignItems="center">
            <TextField label="Usuario" size="small" value={user} onChange={e=>setUser(e.target.value)}
              InputProps={{ startAdornment:<InputAdornment position="start"><PersonIcon fontSize="small"/></InputAdornment> }} sx={{ flex:1 }} fullWidth />
            <Chip color="info" label={`Saldo: ${formatCOPLocal(balance)}`} sx={{ height:36, fontWeight:700 }} />
            <TextField name="deposit" label="Recargar (COP)" type="number" size="small"
              inputProps={{ min:100, step:100 }} sx={{ width:{ xs:"100%", sm:200 } }} fullWidth
              InputProps={{ startAdornment:<InputAdornment position="start">$</InputAdornment> }} />
            <Button type="submit" variant="contained" startIcon={<AttachMoneyIcon/>}>Recargar</Button>
            <IconButton onClick={()=>setUser(randomUser())} title="Generar usuario"><RefreshIcon/></IconButton>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
