import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#e30613', dark: '#bd0010', light: '#fff1f2' },
    error: { main: '#dc2626' },
    text: { primary: '#17202e', secondary: '#64748b' },
    background: { default: '#f8fafc', paper: '#ffffff' },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          transition: 'background-color 160ms ease, box-shadow 160ms ease',
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
          '&.Mui-focused': { boxShadow: '0 0 0 4px rgba(227, 6, 19, 0.08)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1.5 },
        },
        notchedOutline: { borderColor: '#e2e8f0' },
        input: { fontSize: 14 },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontSize: 14, fontWeight: 600, color: '#475569' } },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 2, marginRight: 2, fontSize: 11 } },
    },
    MuiCheckbox: {
      styleOverrides: { root: { borderRadius: 8, color: '#94a3b8' } },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, minHeight: 44, boxShadow: 'none' },
        containedPrimary: {
          boxShadow: '0 10px 24px -12px rgba(227, 6, 19, 0.65)',
          '&:hover': { boxShadow: '0 14px 28px -12px rgba(227, 6, 19, 0.7)' },
        },
      },
    },
  },
});

export default theme;
