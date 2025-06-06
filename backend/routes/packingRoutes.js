const express = require('express');
const router = express.Router();
const packingController = require('../controllers/packingController');

// Define routes
router.get('/packing-summary', packingController.getPackingSummary);
router.get('/sort-data', packingController.getSortData);
router.get('/sample-data', packingController.getSampleData);

// P-Chart routes for yield metrics
router.get('/daily-yield-metrics', packingController.getDailyYieldMetrics);
router.get('/weekly-yield-metrics', packingController.getWeeklyYieldMetrics);

module.exports = router; 