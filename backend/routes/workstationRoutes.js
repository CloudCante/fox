const express = require('express');
const router = express.Router();
const workstationController = require('../controllers/workstationController');
const packingController = require('../controllers/packingController');

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

// NEW: P-Chart yield metrics endpoints
router.get('/daily-yield-metrics', packingController.getDailyYieldMetrics);
router.get('/weekly-yield-metrics', packingController.getWeeklyYieldMetrics);

// P-Chart station-specific defect rate analysis
router.get('/pchart/:weekId/:model/:station', workstationController.getPChartData);

module.exports = router; 