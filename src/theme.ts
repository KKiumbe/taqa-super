import { alpha, createTheme } from '@mui/material/styles';

const palette = {
  ink: '#183033',
  forest: '#204b4d',
  ember: '#c8683a',
  amber: '#e0a458',
  sand: '#f4efe6',
  paper: '#fffaf2',
  mist: '#d7ddd2',
  line: '#d8cfbe',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: palette.forest,
    },
    secondary: {
      main: palette.ember,
    },
    background: {
      default: palette.sand,
      paper: palette.paper,
    },
    text: {
      primary: palette.ink,
      secondary: alpha(palette.ink, 0.72),
    },
    divider: palette.line,
    success: {
      main: '#2f7a4f',
    },
    warning: {
      main: palette.amber,
    },
    error: {
      main: '#b24b35',
    },
    info: {
      main: '#376f8c',
    },
  },
  shape: {
    borderRadius: 18,
  },
  typography: {
    fontFamily: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontWeight: 700,
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(palette.line, 0.85)}`,
          boxShadow: '0 24px 70px rgba(24, 48, 51, 0.08)',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
      },
    },
  },
});
