import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  ThemeProvider, createTheme, CssBaseline,
  AppBar, Toolbar, Container, Box, Stack,
  Typography, Card, CardContent, TextField, Button,
  List, ListItem, ListItemAvatar, Avatar, ListItemText,
  Divider, Chip, Snackbar, Alert, InputAdornment, IconButton, Paper
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonIcon from "@mui/icons-material/Person";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

const API = import.meta.env.VITE_API_BASE;
const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const theme = createTheme({
  palette: { mode: "dark", primary: { main: "#6ee7b7" }, secondary: { main: "#60a5fa" } },
  shape: { borderRadius: 16 }
});

const randomUser = () => "jugador-" + Math.floor(1000 + Math.random() * 9000);

export default function App() {
  const [bets, setBets] = useState([]);
  const [user, setUser] = useState(localStorage.getItem("user") || randomUser());
  const [amount, setAmount] = useState(1000);
  const [status, setStatus] = useState("connecting");
  const [toast, setToast] = useState(null);

  useEffect(() => localStorage.setItem("user", user), [user]);

  const socket = useMemo(() => io(API, { path: "/socket.io/", reconnection: true }), [API]);

  useEffect(() => {
    fetch(`${API}/api/bets`).then(r => r.json()).then(setBets).catch(() => {});
    socket.on("connect", () => { setStatus("connected"); setToast({ sev: "success", msg: "Conectado" }); });
    socket.on("disconnect", () => { setStatus("reconnecting"); setToast({ sev: "warning", msg: "Reconectando..." }); });
    socket.on("reconnect", () => { setStatus("connected"); setToast({ sev: "success", msg: "Conexión restablecida" }); });
    socket.on("bet:new", b => setBets(prev => [b, ...prev].slice(0, 100)));
    return () => socket.close();
  }, [API, socket]);

  const place = () => {
    if (!user?.trim()) return setToast({ sev: "error", msg: "Ingresa un nombre de usuario" });
    if (!amount || amount < 100 || !Number.isFinite(+amount)) return setToast({ sev: "error", msg: "Monto inválido" });
    socket.emit("bet:place", { user, amount: +amount, round: "R1" });
  };

  const regenerate = () => setUser(randomUser());

  const StatusChip = (
    <Chip
      size="small"
      color={status === "connected" ? "success" : "warning"}
      icon={status === "connected" ? <WifiIcon /> : <WifiOffIcon />}
      label={status === "connected" ? "Conectado" : "Reconectando"}
      variant={status === "connected" ? "filled" : "outlined"}
    />
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar elevation={0} position="sticky" color="transparent">
        <Toolbar sx={{ gap: 2 }}>
          <CasinoIcon color="primary" />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Sala de Apuestas · Alta Disponibilidad</Typography>
          {StatusChip}
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Panel usuario */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="subtitle1">Identidad del jugador</Typography>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="Usuario"
                  value={user}
                  onChange={e => setUser(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
                <IconButton color="secondary" onClick={regenerate} title="Generar usuario">
                  <RefreshIcon />
                </IconButton>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Panel apostar */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="subtitle1">Realizar apuesta</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  label="Monto (COP)"
                  type="number"
                  size="small"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  inputProps={{ min: 100, step: 100 }}
                  sx={{ width: { xs: "100%", sm: 220 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoneyIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
                <Box flex={1} />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={place}
                  disabled={status !== "connected"}
                  sx={{ px: 4 }}
                >
                  Apostar
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Mostrando valores en pesos colombianos.
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        {/* Lista de apuestas */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1">Últimas apuestas</Typography>
          <Chip size="small" label={`${bets.length} registros`} />
        </Stack>
        
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <List dense disablePadding sx={{ width: "100%" }}>
            {bets.map((b, i) => {
              const initials = (b.user || "?").slice(0, 2).toUpperCase();
              const amt = typeof b.amount === "string" ? Number(b.amount) : b.amount;
              return (
                <React.Fragment key={b._id || i}>
                  <ListItem sx={{ py: 1.5 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: "secondary.main" }}>{initials}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primaryTypographyProps={{ variant: "body1", fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: "caption" }}
                      primary={`${b.user} apostó ${COP.format(amt || 0)}`}
                      secondary={`${new Date(b.createdAt).toLocaleTimeString()} · Ronda ${b.round || "R1"}`}
                    />
                  </ListItem>
                  {i < bets.length - 1 && <Divider component="li" />}
                </React.Fragment>
              );
            })}
            {bets.length === 0 && (
              <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                Aún no hay apuestas. Sé el primero en apostar.
              </Box>
            )}
          </List>
        </Paper>
      </Container>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast && <Alert severity={toast.sev} variant="filled" onClose={() => setToast(null)}>{toast.msg}</Alert>}
      </Snackbar>
    </ThemeProvider>
  );
}
