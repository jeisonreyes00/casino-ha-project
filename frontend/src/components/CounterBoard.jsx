import React from "react";
import { Card, CardContent, Chip, Stack, Typography, Box } from "@mui/material";

const phaseMap = {
  betting: { label: "Apuestas abiertas", color: "success" },
  flying:  { label: "En vuelo",          color: "info"    },
  crashed: { label: "Crash",             color: "error"   },
  closed:  { label: "Cerrado",           color: "default" }
};

export default function CounterBoard({ roundCode, phase, multiplier }){
  const p = phaseMap[phase] || phaseMap.closed;

  return (
    <Card sx={{ p:{ xs:1, sm:2 }, border: "1px solid rgba(255,255,255,.06)" }}>
      <CardContent sx={{ p:{ xs:2, sm:3 } }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="subtitle2" color="text.secondary">Ronda: {roundCode || "-"}</Typography>

          {/* Ventana tipo Spaceman */}
          <Box
            sx={{
              width: "40%",
              aspectRatio: { xs:"5 / 3", sm:"16 / 9" },
              borderRadius: 6,
              display: "grid",
              placeItems: "center",
              background:
                "radial-gradient(1200px 500px at 50% -20%, rgba(96,165,250,.18), transparent 60%)," +
                "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
              boxShadow: "inset 0 -30px 60px rgba(0,0,0,.35)"
            }}
          >
            <Typography variant="h1">x{Number(multiplier).toFixed(2)}</Typography>
          </Box>

          <Chip sx={{ fontWeight:700, px:1.5 }} label={p.label} color={p.color} />
        </Stack>
      </CardContent>
    </Card>
  );
}
