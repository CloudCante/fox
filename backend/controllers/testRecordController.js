const TestRecord = require('../models/TestRecord');

// Get all test records
exports.getAllTestRecords = async (req, res) => {
    try {
        const testRecords = await TestRecord.find();
        res.json(testRecords);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single test record by serial number
exports.getTestRecordBySerialNumber = async (req, res) => {
    try {
        const testRecord = await TestRecord.findOne({ serialNumber: req.params.serialNumber });
        if (!testRecord) {
            return res.status(404).json({ message: 'Test record not found' });
        }
        res.json(testRecord);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create new test record
exports.createTestRecord = async (req, res) => {
    try {
        const testRecord = new TestRecord({
            serialNumber: req.body.serialNumber,
            records: req.body.records,
            status: req.body.status || 'active',
            notes: req.body.notes || []
        });

        const newTestRecord = await testRecord.save();
        res.status(201).json(newTestRecord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Update test record
exports.updateTestRecord = async (req, res) => {
    try {
        const testRecord = await TestRecord.findOne({ serialNumber: req.params.serialNumber });
        if (!testRecord) {
            return res.status(404).json({ message: 'Test record not found' });
        }

        // Update fields
        if (req.body.records) testRecord.records = req.body.records;
        if (req.body.status) testRecord.status = req.body.status;
        if (req.body.notes) testRecord.notes = req.body.notes;
        testRecord.lastUpdated = new Date();

        const updatedTestRecord = await testRecord.save();
        res.json(updatedTestRecord);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete test record
exports.deleteTestRecord = async (req, res) => {
    try {
        const testRecord = await TestRecord.findOne({ serialNumber: req.params.serialNumber });
        if (!testRecord) {
            return res.status(404).json({ message: 'Test record not found' });
        }

        await testRecord.deleteOne();
        res.json({ message: 'Test record deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get station performance
exports.getStationPerformance = async (req, res) => {
    try {
        const { model, startDate, endDate } = req.query;
        const matchConditions = {};

        // Filter by model if provided
        if (model) {
            matchConditions['records.cleaned.Model'] = { $regex: model, $options: 'i' };
        }

        // Filter by date range if provided
        if (startDate || endDate) {
            matchConditions['records.cleaned.History station end time'] = {};
            if (startDate) matchConditions['records.cleaned.History station end time'].$gte = new Date(startDate);
            if (endDate) matchConditions['records.cleaned.History station end time'].$lte = new Date(endDate);
        }

        const results = await TestRecord.aggregate([
            { $unwind: '$records' },
            { $match: matchConditions },
            { $group: {
                _id: '$records.cleaned.Workstation Name',
                pass: {
                    $sum: {
                        $cond: [{ $eq: ['$records.cleaned.History station passing status', 'PASS'] }, 1, 0]
                    }
                },
                fail: {
                    $sum: {
                        $cond: [{ $eq: ['$records.cleaned.History station passing status', 'FAIL'] }, 1, 0]
                    }
                }
            }},
            { $project: {
                station: '$_id',
                pass: 1,
                fail: 1,
                failureRate: {
                    $cond: [
                        { $eq: [{ $add: ['$pass', '$fail'] }, 0] },
                        0,
                        { $divide: ['$fail', { $add: ['$pass', '$fail'] }] }
                    ]
                }
            }},
            { $sort: { station: 1 } }
        ]);

        res.json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Get aggregated data with time filtering
exports.getAggregatedData = async (req, res) => {
    try {
        const { startDate, endDate, source } = req.query;
        
        // Build match conditions
        const matchConditions = {};
        if (startDate || endDate) {
            matchConditions['records.date'] = {};
            if (startDate) matchConditions['records.date'].$gte = new Date(startDate);
            if (endDate) matchConditions['records.date'].$lte = new Date(endDate);
        }
        if (source) matchConditions['records.source'] = source;

        const aggregatedData = await TestRecord.aggregate([
            { $unwind: '$records' },
            { $match: matchConditions },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$records.date" } },
                        source: "$records.source"
                    },
                    count: { $sum: 1 },
                    // Add more aggregations based on your cleaned data structure
                    // Example: if you have test results
                    passCount: {
                        $sum: {
                            $cond: [{ $eq: ["$records.cleaned.status", "PASS"] }, 1, 0]
                        }
                    },
                    failCount: {
                        $sum: {
                            $cond: [{ $eq: ["$records.cleaned.status", "FAIL"] }, 1, 0]
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.date",
                    sources: {
                        $push: {
                            source: "$_id.source",
                            count: "$count",
                            passCount: "$passCount",
                            failCount: "$failCount",
                            passRate: {
                                $multiply: [
                                    { $divide: ["$passCount", { $add: ["$passCount", "$failCount"] }] },
                                    100
                                ]
                            }
                        }
                    },
                    totalCount: { $sum: "$count" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            timeSeries: aggregatedData,
            summary: {
                totalRecords: aggregatedData.reduce((sum, day) => sum + day.totalCount, 0),
                dateRange: {
                    start: startDate || 'all',
                    end: endDate || 'all'
                }
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get top fixtures (example implementation)
exports.getTopFixtures = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const matchConditions = {};
        if (startDate || endDate) {
            matchConditions['records.cleaned.History station end time'] = {};
            if (startDate) matchConditions['records.cleaned.History station end time'].$gte = new Date(startDate);
            if (endDate) matchConditions['records.cleaned.History station end time'].$lte = new Date(endDate);
        }

        const results = await TestRecord.aggregate([
            { $unwind: '$records' },
            { $match: matchConditions },
            { $group: {
                _id: '$records.cleaned.Fixture',
                fail: {
                    $sum: {
                        $cond: [{ $eq: ['$records.cleaned.History station passing status', 'FAIL'] }, 1, 0]
                    }
                },
                total: { $sum: 1 },
                failureRate: {
                    $avg: {
                        $cond: [
                            { $eq: ['$records.cleaned.History station passing status', 'FAIL'] }, 1, 0
                        ]
                    }
                }
            }},
            { $sort: { fail: -1 } },
            { $limit: 10 }
        ]);

        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 