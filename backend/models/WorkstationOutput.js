const mongoose = require('mongoose');

// Individual record schema within a serial number document
const RecordSchema = new mongoose.Schema({
    recordId: { type: String, required: true },
    workstationType: { 
        type: String, 
        required: true,
        enum: ['PACKING', 'TEST']
    },
    modelType: { type: String, required: true },
    timestamps: {
        stationStart: { type: Date, required: true },
        stationEnd: { type: Date, required: true },
        firstStationStart: { type: Date }
    },
    metadata: {
        partNumber: { type: String },
        customerPN: { type: String },
        operator: { type: String },
        passingStatus: { type: String },
        serviceFlow: { type: String }
    },
    rawData: { type: mongoose.Schema.Types.Mixed } // Flexible for raw data
}, { _id: false }); // Don't create _id for subdocuments

// Summary schema for aggregated statistics
const SummarySchema = new mongoose.Schema({
    totalRecords: { type: Number, required: true },
    packingCount: { type: Number, required: true },
    testCount: { type: Number, required: true },
    lastUpdated: { type: Date, required: true }
}, { _id: false });

// Main workstation output schema
const WorkstationOutputSchema = new mongoose.Schema({
    serialNumber: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    records: [RecordSchema],
    summary: SummarySchema
}, { 
    collection: 'workstation_output',
    timestamps: false // We manage timestamps in summary.lastUpdated
});

// Indexes for common queries
WorkstationOutputSchema.index({ 'records.timestamps.stationEnd': 1 });
WorkstationOutputSchema.index({ 'records.workstationType': 1 });
WorkstationOutputSchema.index({ 'records.metadata.partNumber': 1 });
WorkstationOutputSchema.index({ 'records.modelType': 1 });

module.exports = mongoose.model('WorkstationOutput', WorkstationOutputSchema); 