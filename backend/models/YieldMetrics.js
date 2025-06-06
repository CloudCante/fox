const mongoose = require('mongoose');

// Daily Yield Metrics Schema
const DailyYieldMetricsSchema = new mongoose.Schema({
    _id: String, // Date string like "2025-04-01"
    date: Date,
    weekData: {
        weekId: String,
        weekStart: Date,
        weekEnd: Date,
        totalStarters: Number,
        startersByModel: Object
    },
    dailyCompletions: {
        completedToday: Number,
        firstPassToday: Number,
        dailyFPY: Number,
        byModel: Object,
        completionRate: Number
    },
    dailyFirstPassYield: {
        traditional: {
            partsStarted: Number,
            firstPassSuccess: Number,
            firstPassYield: Number
        },
        completedOnly: {
            activeParts: Number,
            firstPassSuccess: Number,
            firstPassYield: Number
        },
        breakdown: Object
    },
    pChartAnalytics: {
        primaryMetric: Number,
        controlLimits: {
            ucl: Number,
            lcl: Number,
            pBar: Number,
            inControl: Boolean
        },
        statistics: Object
    },
    throughputYield: {
        stationMetrics: Object,
        modelSpecific: Object,
        averageYield: Number
    },
    summary: Object,
    generatedAt: Date
}, { 
    collection: 'daily_yield_metrics',
    _id: false // Since we're using custom _id
});

// Weekly Yield Metrics Schema
const WeeklyYieldMetricsSchema = new mongoose.Schema({
    _id: String, // Week string like "2025-W14"
    weekStart: Date,
    weekEnd: Date,
    daysInWeek: Number,
    weeklyFirstPassYield: {
        traditional: {
            partsStarted: Number,
            firstPassSuccess: Number,
            firstPassYield: Number
        },
        completedOnly: {
            activeParts: Number,
            firstPassSuccess: Number,
            firstPassYield: Number
        },
        breakdown: Object
    },
    weeklyOverallYield: {
        totalParts: Number,
        completedParts: Number,
        overallYield: Number
    },
    weeklyThroughputYield: {
        stationMetrics: Object,
        averageYield: Number,
        modelSpecific: Object
    },
    weeklyTPY: Object,
    summary: Object,
    generatedAt: Date
}, { 
    collection: 'weekly_yield_metrics',
    _id: false // Since we're using custom _id
});

module.exports = {
    DailyYieldMetrics: mongoose.model('DailyYieldMetrics', DailyYieldMetricsSchema),
    WeeklyYieldMetrics: mongoose.model('WeeklyYieldMetrics', WeeklyYieldMetricsSchema)
}; 