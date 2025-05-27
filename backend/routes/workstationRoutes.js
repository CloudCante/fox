const express = require('express');
const router = express.Router();
const workstationController = require('../controllers/workstationController');

// Packing-related endpoints
router.get('/packing-summary', workstationController.getPackingSummary);
router.get('/packing-data', workstationController.getPackingData);

// Test-related endpoints  
router.get('/test-data', workstationController.getTestData);
router.get('/sort-data', workstationController.getSortData);

// Dashboard endpoints
router.get('/dashboard-summary', workstationController.getDashboardSummary);

// Statistics endpoint
router.get('/stats', workstationController.getStats);

module.exports = router; 