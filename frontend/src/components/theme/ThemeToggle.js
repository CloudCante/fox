import React from 'react';
import { IconButton } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useDashboardTheme } from './ThemeContext';

export const ThemeToggle = () => {
    const { isDarkMode, toggleTheme } = useDashboardTheme();

    return (
        <IconButton 
            onClick={toggleTheme} 
            sx={{ 
                color: 'white',
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
            }}
        >
            {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
    );
}; 