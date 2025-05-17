import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CssBaseline, Box } from '@mui/material';
import { DashboardThemeProvider } from './components/theme/ThemeContext';
import { SideDrawer } from './components/navigation/SideDrawer';
import { AppHeader } from './components/navigation/AppHeader';
import { Dashboard } from './components/dashboard/Dashboard';
import PackingPage from './components/pages/PackingPage';

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <DashboardThemeProvider>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppHeader onMenuClick={() => setDrawerOpen(!drawerOpen)} />
        <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, minHeight: '100vh', paddingTop: '48px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/packing" element={<PackingPage />} />
          </Routes>
        </Box>
      </Box>
    </DashboardThemeProvider>
  );
}

export default App; 