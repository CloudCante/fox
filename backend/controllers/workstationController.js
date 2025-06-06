const WorkstationOutput = require('../models/WorkstationOutput');

// Helper function to build date range filters
const buildDateFilter = (startDate, endDate) => {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    return Object.keys(dateFilter).length > 0 ? dateFilter : null;
};

// Helper function to get default date range (last 30 days)
const getDefaultDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { startDate, endDate };
};

// GET /api/workstation/packing-summary
exports.getPackingSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Use provided dates or default to last 30 days
        const dateRange = startDate || endDate ? 
            buildDateFilter(startDate, endDate) : 
            buildDateFilter(getDefaultDateRange().startDate, getDefaultDateRange().endDate);

        const matchConditions = {
            'records.workstationType': 'PACKING'
        };

        if (dateRange) {
            matchConditions['records.timestamps.stationEnd'] = dateRange;
        }

        // Aggregate pipeline for packing summary
        const pipeline = [
            { $unwind: '$records' },
            { $match: matchConditions },
            {
                $group: {
                    _id: {
                        partNumber: '$records.metadata.partNumber',
                        date: { 
                            $dateToString: { 
                                format: '%m/%d/%Y', 
                                date: '$records.timestamps.stationEnd', 
                                timezone: 'UTC' 
                            } 
                        }
                    },
                    total: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1, '_id.partNumber': 1 } }
        ];

        const results = await WorkstationOutput.aggregate(pipeline);

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
        console.error('Error in getPackingSummary:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/workstation/packing-data
exports.getPackingData = async (req, res) => {
    try {
        const { startDate, endDate, limit = 1000 } = req.query;
        
        // Use provided dates or default to last 30 days
        const dateRange = startDate || endDate ? 
            buildDateFilter(startDate, endDate) : 
            buildDateFilter(getDefaultDateRange().startDate, getDefaultDateRange().endDate);

        const matchConditions = {
            'records.workstationType': 'PACKING'
        };

        if (dateRange) {
            matchConditions['records.timestamps.stationEnd'] = dateRange;
        }

        const pipeline = [
            { $unwind: '$records' },
            { $match: matchConditions },
            {
                $project: {
                    serialNumber: '$serialNumber',
                    partNumber: '$records.metadata.partNumber',
                    customerPN: '$records.metadata.customerPN',
                    stationEnd: '$records.timestamps.stationEnd',
                    stationStart: '$records.timestamps.stationStart',
                    operator: '$records.metadata.operator',
                    passingStatus: '$records.metadata.passingStatus',
                    serviceFlow: '$records.metadata.serviceFlow',
                    modelType: '$records.modelType',
                    recordId: '$records.recordId'
                }
            },
            { $sort: { stationEnd: -1 } },
            { $limit: parseInt(limit) }
        ];

        const results = await WorkstationOutput.aggregate(pipeline);
        res.json(results);
    } catch (error) {
        console.error('Error in getPackingData:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/workstation/dashboard-summary
exports.getDashboardSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Use provided dates or default to last 7 days for dashboard
        const defaultRange = {
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endDate: new Date()
        };
        
        const dateRange = startDate || endDate ? 
            buildDateFilter(startDate, endDate) : 
            buildDateFilter(defaultRange.startDate, defaultRange.endDate);

        const matchConditions = {};
        if (dateRange) {
            matchConditions['records.timestamps.stationEnd'] = dateRange;
        }

        // Get summary by workstation type
        const pipeline = [
            { $unwind: '$records' },
            { $match: matchConditions },
            {
                $group: {
                    _id: {
                        workstationType: '$records.workstationType',
                        passingStatus: '$records.metadata.passingStatus',
                        date: { 
                            $dateToString: { 
                                format: '%Y-%m-%d', 
                                date: '$records.timestamps.stationEnd', 
                                timezone: 'UTC' 
                            } 
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1, '_id.workstationType': 1 } }
        ];

        const results = await WorkstationOutput.aggregate(pipeline);
        res.json(results);
    } catch (error) {
        console.error('Error in getDashboardSummary:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/workstation/test-data
exports.getTestData = async (req, res) => {
    try {
        const { startDate, endDate, limit = 1000 } = req.query;
        
        const dateRange = startDate || endDate ? 
            buildDateFilter(startDate, endDate) : 
            buildDateFilter(getDefaultDateRange().startDate, getDefaultDateRange().endDate);

        const matchConditions = {
            'records.workstationType': 'TEST'
        };

        if (dateRange) {
            matchConditions['records.timestamps.stationEnd'] = dateRange;
        }

        const pipeline = [
            { $unwind: '$records' },
            { $match: matchConditions },
            {
                $project: {
                    serialNumber: '$serialNumber',
                    partNumber: '$records.metadata.partNumber',
                    customerPN: '$records.metadata.customerPN',
                    stationEnd: '$records.timestamps.stationEnd',
                    stationStart: '$records.timestamps.stationStart',
                    operator: '$records.metadata.operator',
                    passingStatus: '$records.metadata.passingStatus',
                    serviceFlow: '$records.metadata.serviceFlow',
                    modelType: '$records.modelType',
                    recordId: '$records.recordId'
                }
            },
            { $sort: { stationEnd: -1 } },
            { $limit: parseInt(limit) }
        ];

        const results = await WorkstationOutput.aggregate(pipeline);
        res.json(results);
    } catch (error) {
        console.error('Error in getTestData:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/workstation/sort-data
exports.getSortData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const dateRange = startDate || endDate ? 
            buildDateFilter(startDate, endDate) : 
            buildDateFilter(getDefaultDateRange().startDate, getDefaultDateRange().endDate);

        const matchConditions = {
            'records.workstationType': 'TEST',
            'records.metadata.serviceFlow': { $in: ['NC Sort', 'RO'] }
        };

        if (dateRange) {
            matchConditions['records.timestamps.stationEnd'] = dateRange;
        }

        const pipeline = [
            { $unwind: '$records' },
            { $match: matchConditions },
            {
                $group: {
                    _id: {
                        model: '$records.modelType',
                        date: { 
                            $dateToString: { 
                                format: '%m/%d/%Y', 
                                date: '$records.timestamps.stationEnd', 
                                timezone: 'UTC' 
                            } 
                        }
                    },
                    total: { $sum: 1 }
                }
            }
        ];

        const results = await WorkstationOutput.aggregate(pipeline);

        // Initialize the sort data structure (matching old format)
        const sortData = {
            '506': {}, // Tesla SXM4
            '520': {}  // Tesla SXM5
        };

        // Transform results into the required format
        results.forEach(item => {
            const model = item._id.model;
            const date = item._id.date;
            let sortKey = null;
            
            if (model === 'Tesla SXM4') {
                sortKey = '506';
            } else if (model === 'Tesla SXM5') {
                sortKey = '520';
            }
            
            if (sortKey) {
                if (!sortData[sortKey][date]) {
                    sortData[sortKey][date] = 0;
                }
                sortData[sortKey][date] += item.total;
            }
        });

        res.json(sortData);
    } catch (error) {
        console.error('Error in getSortData:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/workstation/stats
exports.getStats = async (req, res) => {
    try {
        const stats = await WorkstationOutput.aggregate([
            {
                $group: {
                    _id: null,
                    totalDocuments: { $sum: 1 },
                    totalRecords: { $sum: '$summary.totalRecords' },
                    totalPacking: { $sum: '$summary.packingCount' },
                    totalTest: { $sum: '$summary.testCount' }
                }
            }
        ]);

        // Get date range of data
        const dateRange = await WorkstationOutput.aggregate([
            { $unwind: '$records' },
            {
                $group: {
                    _id: null,
                    minDate: { $min: '$records.timestamps.stationEnd' },
                    maxDate: { $max: '$records.timestamps.stationEnd' }
                }
            }
        ]);

        const result = {
            ...stats[0],
            dateRange: dateRange[0] || { minDate: null, maxDate: null }
        };

        res.json(result);
    } catch (error) {
        console.error('Error in getStats:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /api/workstation/pchart/:weekId/:model/:station
exports.getPChartData = async (req, res) => {
  try {
    const { weekId, model, station } = req.params;
    console.log(`P-Chart API: Getting data for ${model} ${station} in ${weekId}`);
    
    // Parse week ID to get date range
    const [year, week] = weekId.split('-W');
    const weekNum = parseInt(week);
    
    // Calculate start and end dates for the week (Monday to Friday)
    const startOfYear = new Date(parseInt(year), 0, 1);
    const daysToAdd = (weekNum - 1) * 7;
    const mondayOfWeek = new Date(startOfYear);
    mondayOfWeek.setDate(startOfYear.getDate() + daysToAdd - startOfYear.getDay() + 1);
    
    const weekStart = new Date(mondayOfWeek);
    const weekEnd = new Date(mondayOfWeek);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday end
    weekEnd.setHours(23, 59, 59, 999);
    
    console.log(`Week ${weekId} range: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
    
    // Match conditions for the aggregation
    const matchConditions = {
      'records.workstationType': 'TEST',
      'records.modelType': { $regex: model, $options: 'i' },
      'records.rawData.Workstation Name': station,
      'records.timestamps.stationEnd': {
        $gte: weekStart,
        $lte: weekEnd
      }
    };
    
    // Aggregation pipeline to get daily station defect rates
    const pipeline = [
      { $unwind: '$records' },
      { $match: matchConditions },
      {
        $group: {
          _id: {
            date: { 
              $dateToString: { 
                format: '%Y-%m-%d', 
                date: '$records.timestamps.stationEnd', 
                timezone: 'UTC' 
              } 
            },
            station: '$records.rawData.Workstation Name'
          },
          totalParts: { $sum: 1 },
          passCount: {
            $sum: {
              $cond: [
                { $eq: ['$records.metadata.passingStatus', 'PASS'] }, 
                1, 
                0
              ]
            }
          },
          failCount: {
            $sum: {
              $cond: [
                { $eq: ['$records.metadata.passingStatus', 'FAIL'] }, 
                1, 
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          defectRate: {
            $cond: [
              { $eq: ['$totalParts', 0] },
              0,
              { $multiply: [{ $divide: ['$failCount', '$totalParts'] }, 100] }
            ]
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ];
    
    const dailyResults = await WorkstationOutput.aggregate(pipeline);
    console.log(`Found ${dailyResults.length} daily data points for ${station}`);
    
    if (dailyResults.length === 0) {
      return res.json({
        weekId: weekId,
        model: model,
        station: station,
        centerLine: 0,
        weeklyTotals: { totalParts: 0, defectRate: 0 },
        dailyPoints: []
      });
    }
    
    // Calculate weekly totals and center line
    const weeklyTotalParts = dailyResults.reduce((sum, day) => sum + day.totalParts, 0);
    const weeklyTotalDefects = dailyResults.reduce((sum, day) => sum + day.failCount, 0);
    const weeklyDefectRate = weeklyTotalParts > 0 ? (weeklyTotalDefects / weeklyTotalParts) * 100 : 0;
    const centerLine = weeklyDefectRate;
    
    // Calculate control limits for each day (variable sample size)
    const dailyPoints = dailyResults.map(day => {
      const sampleSize = day.totalParts;
      const defects = day.failCount;
      const defectRate = day.defectRate;
      
      // P-chart control limits: p̄ ± 3√(p̄(1-p̄)/n)
      const pBar = centerLine / 100; // Convert percentage to proportion
      
      if (sampleSize === 0 || pBar === 0 || pBar >= 1) {
        return {
          date: day._id.date,
          sampleSize: sampleSize,
          defects: defects,
          defectRate: parseFloat(defectRate.toFixed(2)),
          upperControlLimit: 100,
          lowerControlLimit: 0,
          outOfControl: false
        };
      }
      
      const standardError = Math.sqrt((pBar * (1 - pBar)) / sampleSize);
      const ucl = Math.min(1.0, pBar + (3 * standardError)) * 100;
      const lcl = Math.max(0.0, pBar - (3 * standardError)) * 100;
      
      // Determine if out of control
      const outOfControl = defectRate > ucl || defectRate < lcl;
      
      return {
        date: day._id.date,
        sampleSize: sampleSize,
        defects: defects,
        defectRate: parseFloat(defectRate.toFixed(2)),
        upperControlLimit: parseFloat(ucl.toFixed(2)),
        lowerControlLimit: parseFloat(lcl.toFixed(2)),
        outOfControl: outOfControl
      };
    });
    
    const response = {
      weekId: weekId,
      model: model,
      station: station,
      centerLine: parseFloat(centerLine.toFixed(2)),
      weeklyTotals: {
        totalParts: weeklyTotalParts,
        defectRate: parseFloat(weeklyDefectRate.toFixed(2))
      },
      dailyPoints: dailyPoints
    };
    
    console.log(`P-Chart API: Returning ${dailyPoints.length} daily points with ${weeklyTotalParts} total parts`);
    res.json(response);
    
  } catch (error) {
    console.error('Error in getPChartData:', error);
    res.status(500).json({ message: error.message });
  }
}; 