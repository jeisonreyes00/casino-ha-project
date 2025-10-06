import React from "react";
import {
  Card, CardContent, List, ListItem, ListItemAvatar, Avatar,
  ListItemText, Chip, Divider, Box, Typography
} from "@mui/material";

const fmtCOP = (n)=> new Intl.NumberFormat("es-CO",{ style:"currency", currency:"COP", maximumFractionDigits:0 })
  .format(Math.floor(Number(n||0)));

function rowInfo(b){
  if (b.status === "cashed") {
    return {
      color: "success",
      label: `Retiró x${Number(b.cashoutMultiplier||0).toFixed(2)} · +${fmtCOP(b.payout)}`
    };
  }
  if (b.status === "lost") {
    return { color: "error", label: "Perdió" };
  }
  return { color: "default", label: `Apostó ${fmtCOP(b.amount)}` }; // placed
}

export default function BetsPanel({ bets=[], me }){
  return (
    <Card sx={{ border: "1px solid rgba(255,255,255,.06)", height: "100%" }}>
      <CardContent sx={{ p:{ xs:1.5, sm:2 } }}>
        <Typography variant="subtitle1" sx={{ px:1, pb:1 }}>Actividad reciente</Typography>
        <Box sx={{ maxHeight:{ xs: 260, md: 540 }, overflow:"auto" }}>
          <List dense disablePadding>
            {bets.map((b,i)=>{
              const initials = (b.user||"?").slice(0,2).toUpperCase();
              const info = rowInfo(b);
              const you = b.user === me;
              return (
                <React.Fragment key={b._id||`${b.user}-${i}`}>
                  <ListItem sx={{ px:1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: you ? "secondary.main" : "grey.800" }}>{initials}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display:"flex", alignItems:"center", gap:1, flexWrap:"wrap" }}>
                          <Typography component="span" fontWeight={700}>{b.user}</Typography>
                          <Chip size="small" label={info.label} color={info.color} />
                          {b.roundCode && (
                            <Chip size="small" variant="outlined" label={b.roundCode} sx={{ borderColor:"rgba(255,255,255,.12)" }} />
                          )}
                        </Box>
                      }
                      secondary={new Date(b.createdAt || Date.now()).toLocaleTimeString()}
                    />
                  </ListItem>
                  {i < bets.length-1 && <Divider component="li" />}
                </React.Fragment>
              );
            })}
            {bets.length===0 && <Box sx={{ p:3, textAlign:"center", color:"text.secondary" }}>Sin actividad.</Box>}
          </List>
        </Box>
      </CardContent>
    </Card>
  );
}
