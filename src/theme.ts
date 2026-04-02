import { alpha, createTheme } from '@mui/material/styles';

const palette = {
  ink: '#183033',
  deepForest: '#10282b',
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
    borderRadius: 20,
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
    body1: {
      lineHeight: 1.65,
    },
    body2: {
      lineHeight: 1.55,
    },
    overline: {
      fontWeight: 700,
      letterSpacing: '0.12em',
      fontSize: '0.72rem',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundAttachment: 'fixed',
        },
        '::selection': {
          backgroundColor: alpha(palette.ember, 0.22),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: `1px solid ${alpha(palette.line, 0.85)}`,
          boxShadow: '0 24px 70px rgba(24, 48, 51, 0.08)',
          backgroundImage: `linear-gradient(180deg, ${alpha('#ffffff', 0.94)} 0%, ${alpha(
            palette.paper,
            0.98
          )} 100%)`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 18,
          minHeight: 46,
          transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: '0 18px 30px rgba(32, 75, 77, 0.16)',
          '&:hover': {
            boxShadow: '0 22px 36px rgba(32, 75, 77, 0.2)',
          },
        },
        outlined: {
          borderWidth: 1.2,
          '&:hover': {
            borderWidth: 1.2,
            backgroundColor: alpha(palette.forest, 0.04),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          backgroundColor: alpha('#ffffff', 0.7),
          transition: 'box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: alpha(palette.forest, 0.28),
          },
          '&.Mui-focused': {
            backgroundColor: '#ffffff',
            boxShadow: `0 0 0 4px ${alpha(palette.forest, 0.08)}`,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.forest,
            borderWidth: 1.5,
          },
        },
        input: {
          paddingTop: 14,
          paddingBottom: 14,
        },
        multiline: {
          paddingTop: 2,
          paddingBottom: 2,
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(palette.paper, 0.84),
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: alpha(palette.paper, 0.94),
          backdropFilter: 'blur(22px)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: `1px solid ${alpha(palette.line, 0.9)}`,
        },
        standardError: {
          backgroundColor: alpha('#b24b35', 0.09),
        },
        standardSuccess: {
          backgroundColor: alpha('#2f7a4f', 0.1),
        },
        standardInfo: {
          backgroundColor: alpha('#376f8c', 0.1),
        },
        standardWarning: {
          backgroundColor: alpha(palette.amber, 0.18),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          backgroundImage: `linear-gradient(180deg, ${alpha('#ffffff', 0.98)} 0%, ${alpha(
            palette.paper,
            0.98
          )} 100%)`,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: alpha(palette.line, 0.9),
        },
      },
    },
  },
});
