const express = require('express');
const router = express.Router();
const packingRoutes = require('./packingRoutes');
const workstationRoutes = require('./workstationRoutes');

// Map routes to controllers
router.use('/test-records', packingRoutes);
router.use('/workstation', workstationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'API is running' });
});

module.exports = router; 