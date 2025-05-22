const PackingRecord = require('../models/PackingRecord');

// GET /api/test-records/packing-summary
exports.getPackingSummary = async (req, res) => {
    try {
        // Extract date range parameters
        const { startDate, endDate } = req.query;
        console.log(`Packing Summary: Processing request with date range ${startDate} to ${endDate}`);
        
        const matchConditions = {};
        
        // Apply date range filter if provided
        if (startDate || endDate) {
            matchConditions['records.cleaned.History station end time'] = {};
            if (startDate) matchConditions['records.cleaned.History station end time'].$gte = new Date(startDate);
            if (endDate) matchConditions['records.cleaned.History station end time'].$lte = new Date(endDate);
        }
        
        // Unwind records, group by part number and History station end time (date only, UTC), count as total
        const results = await PackingRecord.aggregate([
            { $unwind: '$records' },
            { $match: matchConditions }, // Apply date filtering
            {
                $group: {
                    _id: {
                        partNumber: '$records.cleaned.PN',
                        date: { $dateToString: { format: '%m/%d/%Y', date: '$records.cleaned.History station end time', timezone: 'UTC' } }
                    },
                    total: { $sum: 1 }
                }
            }
        ]);

        // Transform to { partNumber: { date: quantity, ... }, ... }
        const summary = {};
        results.forEach(item => {
            const part = item._id.partNumber;
            const date = item._id.date;
            if (!summary[part]) summary[part] = {};
            summary[part][date] = item.total;
        });

        console.log(`Packing Summary: Found ${results.length} records across ${Object.keys(summary).length} parts`);
        res.json(summary);
    } catch (error) {
        console.error("Error in getPackingSummary:", error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/test-records/sort-data
exports.getSortData = async (req, res) => {
    try {
        // Extract date range parameters
        const { startDate, endDate } = req.query;
        console.log(`Sort Data: Processing request with date range ${startDate} to ${endDate}`);
        
        const matchConditions = {
            // Match records where Workstation Name is test, TEST, ro, or RO
            'records.cleaned.Workstation Name': { $in: ['test', 'TEST', 'ro', 'RO'] },
            // And Service Flow is NC Sort or RO
            'records.cleaned.Service Flow': { $in: ['NC Sort', 'RO'] }
        };
        
        // Apply date range filter if provided - Identical to getPackingSummary
        if (startDate || endDate) {
            matchConditions['records.cleaned.History station end time'] = {};
            if (startDate) matchConditions['records.cleaned.History station end time'].$gte = new Date(startDate);
            if (endDate) matchConditions['records.cleaned.History station end time'].$lte = new Date(endDate);
        }
        
        console.log('Sort Data: Using match conditions:', JSON.stringify(matchConditions));
        
        // Unwind records, match required conditions, group by model and date
        // Using exact same date format as getPackingSummary
        const results = await PackingRecord.aggregate([
            { $unwind: '$records' },
            { $match: matchConditions },
            {
                $group: {
                    _id: {
                        model: '$records.cleaned.Model',
                        date: { $dateToString: { format: '%m/%d/%Y', date: '$records.cleaned.History station end time', timezone: 'UTC' } }
                    },
                    total: { $sum: 1 }
                }
            }
        ]);
        
        console.log(`Sort Data: Found ${results.length} records`);
        
        // Initialize the sort data structure
        const sortData = {
            '506': {}, // Tesla SXM4
            '520': {}  // Tesla SXM5
        };
        
        // Transform the results into the required format
        let sxm4Count = 0;
        let sxm5Count = 0;
        
        results.forEach(item => {
            const model = item._id.model;
            const date = item._id.date;
            // Map model to sort key
            let sortKey = null;
            
            if (model === 'Tesla SXM4') {
                sortKey = '506';
                sxm4Count += item.total;
            } else if (model === 'Tesla SXM5') {
                sortKey = '520';
                sxm5Count += item.total;
            }
            
            // Only process records with valid models
            if (sortKey) {
                if (!sortData[sortKey][date]) {
                    sortData[sortKey][date] = 0;
                }
                sortData[sortKey][date] += item.total;
            }
        });
        
        console.log(`Sort Data: Processed ${sxm4Count} SXM4 (506) records and ${sxm5Count} SXM5 (520) records`);
        
        // Log data for debugging if needed
        console.log('Sort data dates:', Object.keys(sortData['506']).concat(Object.keys(sortData['520'])));
        
        res.json(sortData);
    } catch (error) {
        console.error('Error in getSortData:', error);
        res.status(500).json({ message: error.message });
    }
}; 