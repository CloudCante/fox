const express = require('express');
const router = express.Router();
const defectRecordController = require('../controllers/defectRecordController');

// GET fail stations data for Pareto chart
router.get('/fail-stations', defectRecordController.getFailStations);

// GET repair codes data for Pareto chart
router.get('/repair-codes', defectRecordController.getRepairCodes);

module.exports = router; 