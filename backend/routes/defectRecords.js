const express = require('express');
const router = express.Router();
const defectRecordController = require('../controllers/defectRecordController');

// GET fail stations data for Pareto chart
router.get('/fail-stations', defectRecordController.getFailStations);

// GET defect codes data for Pareto chart (new endpoint)
router.get('/defect-codes', defectRecordController.getDefectCodes);

// GET repair codes data for Pareto chart (old endpoint - keeping for backward compatibility)
router.get('/repair-codes', defectRecordController.getRepairCodes);

module.exports = router; 