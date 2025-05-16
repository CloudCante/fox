import { createTheme } from '@mui/material/styles';

const sidebarColor = '#1e3a5f';  // Dark blue for sidebar in both themes

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
            dark: sidebarColor,
        },
        background: {
            default: '#f5f7fa',
            paper: '#ffffff',
        },
    }
});

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#90caf9',
            dark: sidebarColor,
        },
        background: {
            default: '#2c3e50',
            paper: '#34495e',
        },
    }
}); 