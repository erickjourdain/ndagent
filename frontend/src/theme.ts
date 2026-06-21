import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366F1', // Indigo Cyber
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#06B6D4', // Cyan Neon
      light: '#22D3EE',
      dark: '#0891B2',
      contrastText: '#0B0F19',
    },
    success: {
      main: '#10B981', // Emerald
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B', // Amber
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#F43F5E', // Coral Rose
      light: '#FB7185',
      dark: '#E11D48',
    },
    background: {
      default: '#0B0F19', // Deep Space Navy
      paper: '#151E33',  // Card Blue-Slate
    },
    text: {
      primary: '#F3F4F6',
      secondary: '#9CA3AF',
      disabled: '#6B7280',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "Roboto", -apple-system, sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    body1: {
      letterSpacing: '0.01em',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0B0F19',
          color: '#F3F4F6',
          scrollbarWidth: 'thin',
          scrollbarColor: '#4F46E5 #0B0F19',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#0B0F19',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#1E293B',
            borderRadius: '20px',
            border: '2px solid #0B0F19',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#4F46E5',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
            transform: 'translateY(-1px)',
          },
          '&.MuiButton-containedSecondary:hover': {
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(21, 30, 51, 0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          borderRadius: 20,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(21, 30, 51, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px !important',
          marginBottom: '8px',
          '&::before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '0 0 8px 0',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.1)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
  },
});
export default theme;
