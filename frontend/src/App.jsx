import React,{ useState } from "react";
import { ThemeProvider, CssBaseline, Container, Snackbar, Alert } from "@mui/material";
import theme from "./theme";
import useCrashSocket from "./hooks/useCrashSocket";
import StatusBar from "./components/StatusBar";
import CounterBoard from "./components/CounterBoard";
import BalancePanel from "./components/BalancePanel";
import BetControls from "./components/BetControls";

const API = import.meta.env.VITE_API_BASE || "";

export default function App(){
  const { status, phase, multiplier, roundCode, user, setUser, balance, betActive, place, cashout, deposit, fmtCOP } = useCrashSocket(API);
  const [amount, setAmount] = useState(1000);
  const [toast, setToast] = useState(null);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <StatusBar status={status} />
      <Container maxWidth={false} sx={{ px:{ xs:2, sm:3 }, py:{ xs:3, sm:4 } }}>
        <CounterBoard roundCode={roundCode} phase={phase} multiplier={multiplier} />
        <BalancePanel user={user} setUser={setUser} balance={balance} onDeposit={deposit} onToast={setToast} />
        <BetControls phase={phase} betActive={betActive} amount={amount} setAmount={setAmount} onPlace={place} onCashout={cashout} multiplier={multiplier} onToast={setToast} />
      </Container>
      <Snackbar open={!!toast} autoHideDuration={2200} onClose={()=>setToast(null)} anchorOrigin={{ vertical:"bottom", horizontal:"center" }}>
        {toast && <Alert severity={toast.sev} variant="filled" onClose={()=>setToast(null)}>{toast.msg}</Alert>}
      </Snackbar>
    </ThemeProvider>
  );
}
