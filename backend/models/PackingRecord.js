const mongoose = require('mongoose');

const PackingRecordSchema = new mongoose.Schema({
    partNumber: { type: String, required: true },
    date: { type: Date, required: true },
    quantity: { type: Number, required: true },
    // Add other fields as needed based on your actual data
}, { collection: 'work_station_output' });

module.exports = mongoose.model('PackingRecord', PackingRecordSchema, 'work_station_output'); 