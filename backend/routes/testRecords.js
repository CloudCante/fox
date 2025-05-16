const express = require('express');
const router = express.Router();
const testRecordController = require('../controllers/testRecordController');
const packingController = require('../controllers/packingController');

// GET all test records
router.get('/', testRecordController.getAllTestRecords);

router.get('/top-fixtures', testRecordController.getTopFixtures);

// GET station performance (must be before :serialNumber)
router.get('/station-performance', testRecordController.getStationPerformance);

// GET aggregated data (must be before :serialNumber)
router.get('/aggregated', testRecordController.getAggregatedData);

router.get('/packing-summary', packingController.getPackingSummary);

// GET single test record by serial number (should be last)
router.get('/:serialNumber', testRecordController.getTestRecordBySerialNumber);

// POST new test record
router.post('/', testRecordController.createTestRecord);

// PUT update test record
router.put('/:serialNumber', testRecordController.updateTestRecord);

// DELETE test record
router.delete('/:serialNumber', testRecordController.deleteTestRecord);

module.exports = router; 