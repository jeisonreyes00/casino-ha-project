import React from "react";
import { AppBar, Toolbar, Typography, Chip } from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import CasinoIcon from "@mui/icons-material/Casino";

export default function StatusBar({ status }){
  const ok = status === "connected";
  return (
    <AppBar elevation={0} position="sticky" color="transparent">
      <Toolbar sx={{ gap: 2 }}>
        <CasinoIcon color="primary" />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Crash · Contador</Typography>
        <Chip
          size="small"
          color={ok ? "success" : "warning"}
          icon={ok ? <WifiIcon/> : <WifiOffIcon/>}
          label={ok ? "Conectado" : "Reconectando"}
        />
      </Toolbar>
    </AppBar>
  );
}
