const mongoose = require('mongoose');

const TestRecordSchema = new mongoose.Schema({
    serialNumber: { type: String, required: true, unique: true },
    records: { type: Array, required: true },
    status: { type: String, default: 'active' },
    notes: { type: Array, default: [] },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestRecord', TestRecordSchema, 'test_board_records'); 