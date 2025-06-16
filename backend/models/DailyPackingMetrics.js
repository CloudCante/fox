const mongoose = require('mongoose');

// Daily Packing Metrics Schema - New aggregated data structure
const DailyPackingMetricsSchema = new mongoose.Schema({
    _id: String, // Date string like "2025-04-01"
    date: Date,
    packingOutput: {
        totalPacked: Number,
        byModel: mongoose.Schema.Types.Mixed, // Dynamic model names (Tesla SXM4, Tesla SXM5, Red October, etc.)
        byPartNumber: mongoose.Schema.Types.Mixed // Dynamic model names and part numbers
    },
    sortCounts: {
        byModel: mongoose.Schema.Types.Mixed, // Dynamic model names (Tesla SXM4, Tesla SXM5, Red October, etc.)
        sortCodes: mongoose.Schema.Types.Mixed // Dynamic sort codes (506, 520, etc.)
    },
    targets: {
        dailyTarget: Number,
        actualOutput: Number,
        dailyHitRate: Number
    },
    weeklyContext: {
        weekId: String,
        weekStart: Date,
        weekEnd: Date,
        weekToDatePacked: Number,
        weeklyTarget: Number,
        weeklyHitRate: Number
    },
    summary: {
        dailyAverage: Number,
        topModel: mongoose.Schema.Types.Mixed, // [modelName, count]
        modelsActive: Number
    },
    generatedAt: Date
}, { 
    collection: 'daily_packing_metrics',
    _id: false 
});

// Index for common queries
DailyPackingMetricsSchema.index({ date: 1 });
DailyPackingMetricsSchema.index({ '_id': 1 });

module.exports = mongoose.model('DailyPackingMetrics', DailyPackingMetricsSchema); 