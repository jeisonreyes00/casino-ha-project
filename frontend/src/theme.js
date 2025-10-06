import { createTheme } from "@mui/material";
export default createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#22c55e" },
    secondary: { main: "#60a5fa" },
    background: { default: "#0b0f12", paper: "#11161b" }
  },
  shape: { borderRadius: 16 },
  typography: { h1: { fontSize: "clamp(2.8rem, 9vw, 6rem)", fontWeight: 800, letterSpacing: 1 } },
  components: {
    MuiCard: { styleOverrides: { root: { boxShadow: "0 8px 24px rgba(0,0,0,.25)" } } },
    MuiButton: { defaultProps: { disableElevation: true } }
  }
});
