import React, { createContext, useState, useContext } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { lightTheme, darkTheme } from './themes';

// Create the context with default values
const DashboardThemeContext = createContext({
    isDarkMode: false,
    toggleTheme: () => {},
});

// Create the provider component
export const DashboardThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        <DashboardThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            <MuiThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
                {children}
            </MuiThemeProvider>
        </DashboardThemeContext.Provider>
    );
};

// Custom hook to use the theme context
export const useDashboardTheme = () => useContext(DashboardThemeContext); 