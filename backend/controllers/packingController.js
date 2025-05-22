const PackingRecord = require('../models/PackingRecord');

// GET /api/test-records/packing-summary
exports.getPackingSummary = async (req, res) => {
    try {
        // Extract date range parameters
        const { startDate, endDate } = req.query;
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

        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 