const express = require('express');
const router = express.Router();
const packingController = require('../controllers/packingController');

// Define routes
router.get('/packing-summary', packingController.getPackingSummary);
router.get('/sort-data', packingController.getSortData);
router.get('/sample-data', packingController.getSampleData);

module.exports = router; 