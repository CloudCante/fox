const DailyPackingMetrics = require('../models/DailyPackingMetrics');
const { DailyYieldMetrics, WeeklyYieldMetrics } = require('../models/YieldMetrics');

// GET /api/test-records/packing-summary - NEW: Using daily_packing_metrics collection
exports.getPackingSummary = async (req, res) => {
    try {
        // Extract date range parameters
        const { startDate, endDate } = req.query;
        console.log(`Packing Summary (test-records): Processing request with date range ${startDate} to ${endDate}`);
        
        // Build date filter for the new collection
        const matchConditions = {};
        if (startDate || endDate) {
            matchConditions.date = {};
            if (startDate) matchConditions.date.$gte = new Date(startDate);
            if (endDate) matchConditions.date.$lte = new Date(endDate);
        }

        // Query the new daily_packing_metrics collection
        const dailyMetrics = await DailyPackingMetrics.find(matchConditions)
            .sort({ date: 1 })
            .lean();

        console.log(`Found ${dailyMetrics.length} daily metrics records`);

        // Transform to { partNumber: { date: quantity, ... }, ... } format expected by frontend
        const summary = {};
        
        dailyMetrics.forEach(dayRecord => {
            const dateStr = dayRecord._id; // Date in "2025-04-01" format
            // Convert to MM/DD/YYYY format expected by frontend
            const [year, month, day] = dateStr.split('-');
            const frontendDate = `${month}/${day}/${year}`;

            // Process all model types dynamically (Tesla SXM4, Tesla SXM5, Red October, etc.)
            if (dayRecord.packingOutput?.byPartNumber) {
                Object.entries(dayRecord.packingOutput.byPartNumber).forEach(([modelName, partNumbers]) => {
                    if (partNumbers && typeof partNumbers === 'object') {
                        Object.entries(partNumbers).forEach(([partNumber, data]) => {
                            if (!summary[partNumber]) summary[partNumber] = {};
                            
                            // Handle new data structure with count and serialNumbers
                            const count = data?.count?.$numberInt ? 
                                parseInt(data.count.$numberInt) : 0;
                            
                            summary[partNumber][frontendDate] = count;
                        });
                    }
                });
            }

            // Add daily total from packingOutput.totalPacked
            if (dayRecord.packingOutput?.totalPacked !== undefined) {
                if (!summary['DAILY_TOTAL']) summary['DAILY_TOTAL'] = {};
                const totalPacked = dayRecord.packingOutput.totalPacked.$numberInt ? 
                    parseInt(dayRecord.packingOutput.totalPacked.$numberInt) : 0;
                summary['DAILY_TOTAL'][frontendDate] = totalPacked;
            }
        });

        console.log(`Packing Summary (test-records): Transformed data for ${Object.keys(summary).length} part numbers`);
        res.json(summary);
    } catch (error) {
        console.error("Error in getPackingSummary (test-records):", error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/test-records/sort-data - NEW: Using daily_packing_metrics collection
exports.getSortData = async (req, res) => {
    try {
        // Extract date range parameters
        const { startDate, endDate } = req.query;
        console.log(`Sort Data (test-records): Processing request with date range ${startDate} to ${endDate}`);
        
        // Build date filter for the new collection
        const matchConditions = {};
        if (startDate || endDate) {
            matchConditions.date = {};
            if (startDate) matchConditions.date.$gte = new Date(startDate);
            if (endDate) matchConditions.date.$lte = new Date(endDate);
        }

        // Query the new daily_packing_metrics collection
        const dailyMetrics = await DailyPackingMetrics.find(matchConditions)
            .sort({ date: 1 })
            .lean();

        console.log(`Found ${dailyMetrics.length} daily metrics records for sort data`);

        // Initialize the sort data structure (will be populated dynamically)
        const sortData = {};

        // Transform results into the required format
        dailyMetrics.forEach(dayRecord => {
            const dateStr = dayRecord._id; // Date in "2025-04-01" format
            // Convert to MM/DD/YYYY format expected by frontend
            const [year, month, day] = dateStr.split('-');
            const frontendDate = `${month}/${day}/${year}`;

            // Extract sort counts from the new structure - handle any sort codes dynamically
            if (dayRecord.sortCounts?.sortCodes) {
                Object.entries(dayRecord.sortCounts.sortCodes).forEach(([sortCode, countObj]) => {
                    // Ensure we have the sort code in our data structure
                    if (!sortData[sortCode]) {
                        sortData[sortCode] = {};
                    }
                    
                    // Handle MongoDB number types
                    const count = typeof countObj === 'object' && countObj.$numberInt ? 
                        parseInt(countObj.$numberInt) : 
                        (typeof countObj === 'number' ? countObj : 0);
                    sortData[sortCode][frontendDate] = count;
                });
            }
        });

        console.log(`Sort Data (test-records): Processed data for sort codes: ${Object.keys(sortData).join(', ')} with ${Object.values(sortData).reduce((total, dates) => total + Object.keys(dates).length, 0)} total entries`);
        res.json(sortData);
    } catch (error) {
        console.error('Error in getSortData (test-records):', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/workstation/daily-yield-metrics
exports.getDailyYieldMetrics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        console.log(`Daily Yield Metrics: Processing request with date range ${startDate} to ${endDate}`);
        
        const matchConditions = {};
        
        // Apply date range filter if provided
        if (startDate || endDate) {
            matchConditions.date = {};
            if (startDate) matchConditions.date.$gte = new Date(startDate);
            if (endDate) matchConditions.date.$lte = new Date(endDate);
        }
        
        // Sort by date ascending for time series
        const results = await DailyYieldMetrics.find(matchConditions)
            .sort({ date: 1 })
            .lean();
        
        console.log(`Daily Yield Metrics: Found ${results.length} daily records`);
        res.json(results);
    } catch (error) {
        console.error("Error in getDailyYieldMetrics:", error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/workstation/weekly-yield-metrics  
exports.getWeeklyYieldMetrics = async (req, res) => {
    try {
        const { startWeek, endWeek } = req.query;
        console.log(`Weekly Yield Metrics: Processing request with week range ${startWeek} to ${endWeek}`);
        
        const matchConditions = {};
        
        // Apply week range filter if provided
        if (startWeek && endWeek) {
            matchConditions._id = { $gte: startWeek, $lte: endWeek };
        } else if (startWeek) {
            matchConditions._id = { $gte: startWeek };
        } else if (endWeek) {
            matchConditions._id = { $lte: endWeek };
        }
        
        // Sort by week ID for chronological order
        const results = await WeeklyYieldMetrics.find(matchConditions)
            .sort({ _id: 1 })
            .lean();
        
        console.log(`Weekly Yield Metrics: Found ${results.length} weekly records`);
        res.json(results);
    } catch (error) {
        console.error("Error in getWeeklyYieldMetrics:", error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/test-records/sample-data - Placeholder function (referenced in routes but was missing)
exports.getSampleData = async (req, res) => {
    try {
        console.log('Sample Data: This endpoint is not yet implemented with the new data structure');
        res.status(501).json({ 
            message: 'Sample data endpoint not yet implemented with new daily_packing_metrics collection',
            suggestion: 'Use /packing-summary or /sort-data endpoints instead'
        });
    } catch (error) {
        console.error('Error in getSampleData:', error);
        res.status(500).json({ message: error.message });
    }
}; 