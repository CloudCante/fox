import React from 'react';
import { AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

export const AppHeader = ({ onMenuClick }) => {
  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#1e3a5f',
        boxShadow: 'none',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
      }}
    >
      <Toolbar
        variant="dense"
        sx={{
          WebkitAppRegion: 'drag',
          userSelect: 'none',
        }}
      >
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{
            mr: 2,
            WebkitAppRegion: 'no-drag'
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div">
          Quality Dashboard
        </Typography>
      </Toolbar>
    </AppBar>
  );
}; 