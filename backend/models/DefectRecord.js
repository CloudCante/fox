const mongoose = require('mongoose');

const DefectRecordSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    row_index: { type: Number },
    serial_number: { type: String, required: true },
    raw: {
        Executor: String,
        Date: Date,
        WO: String,
        'Input PN': String,
        'S/N': String,
        'Fail Station': String,
        'Error Code': String,
        'Failure Description ': String,
        'Repair Code': String,
        'Rework Location': String,
        Status: String,
        Notes: String,
        Location: String,
        Cleaned_EC_Codes: [String],
        Cleaned_Defects: [String]
    },
    cleaned: {
        Executor: String,
        Date: Date,
        WO: String,
        'Input PN': String,
        'S/N': String,
        'Fail Station': String,
        'Error Code': String,
        'Failure Description ': String,
        'Repair Code': String,
        'Rework Location': String,
        Status: String,
        Notes: String,
        Location: String,
        Cleaned_EC_Codes: [String],
        Cleaned_Defects: [String]
    },
    status: { type: String, default: 'active' },
    notes: { type: Array, default: [] },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DefectRecord', DefectRecordSchema, 'defect_collection'); 