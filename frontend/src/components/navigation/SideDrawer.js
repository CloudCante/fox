import React from 'react';
import { Link } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  styled,
  ListItemButton,
  Box,
  Typography,
  useTheme,
  useMediaQuery
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SpeedIcon from '@mui/icons-material/Speed';
import { ThemeToggle } from '../theme/ThemeToggle';

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  justifyContent: 'space-between',
  borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
  marginTop: '40px',
}));

export const SideDrawer = ({ open, onClose }) => {
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, route: '/' },
    { text: 'Test Reports', icon: <AssessmentIcon />, route: '/test-reports' },
    { text: 'Packing', icon: <Inventory2Icon />, route: '/packing' },
    { text: 'Performance', icon: <SpeedIcon />, route: '/performance' },
  ];

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      keepMounted={false}
      disableScrollLock
      ModalProps={{
        keepMounted: false,
        disableScrollLock: true,
        disablePortal: true
      }}
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          backgroundColor: '#1e3a5f',
          color: 'white',
          borderRight: 'none',
        },
      }}
    >
      <DrawerHeader>
        <Typography variant="h6" component="div">
          Menu
        </Typography>
        <ThemeToggle />
      </DrawerHeader>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link} 
              to={item.route}
              onClick={onClose}
            >
              <ListItemIcon sx={{ color: 'white' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}; 