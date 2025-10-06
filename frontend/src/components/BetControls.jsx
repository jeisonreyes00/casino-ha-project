import React from "react";
import { Card, CardContent, Stack, TextField, Button, InputAdornment, Typography, Box } from "@mui/material";

export default function BetControls({
  phase, betActive, amount, setAmount, onPlace, onCashout, multiplier, onToast
}){
  const handlePlace = ()=>{
    const r = onPlace(amount);
    if (!r.ok) onToast({ sev:"warning", msg:r.msg });
  };
  const handleCashout = ()=>{
    const r = onCashout();
    if (!r.ok) onToast({ sev:"warning", msg:r.msg });
  };

  const projected = betActive && phase==="flying"
    ? `(${new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(Math.floor((amount||0)*Number(multiplier)))})`
    : "";

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs:"column", sm:"row" }} gap={2} alignItems="center">
          <TextField
            label="Monto (COP)" type="number" size="small" value={amount}
            onChange={e=>setAmount(Number(e.target.value))}
            inputProps={{ min:100, step:100 }}
            sx={{ width:{ xs:"100%", sm:240 } }} fullWidth
            InputProps={{ startAdornment:<InputAdornment position="start">$</InputAdornment> }}
          />
          <Box flex={1} />
          <Button fullWidth variant="contained" color="primary" disabled={phase!=="betting"} onClick={handlePlace}>
            Apostar
          </Button>
          <Button fullWidth variant="contained" color="secondary" disabled={!betActive || phase!=="flying"} onClick={handleCashout}>
            Retirar {projected}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display:"block", mt:1.5 }}>
          Apuesta durante “Apuestas abiertas”. Retira mientras está “En vuelo”.
        </Typography>
      </CardContent>
    </Card>
  );
}
