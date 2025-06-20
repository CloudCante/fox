const WorkstationOutput = require('../models/WorkstationOutput');
const DailyPackingMetrics = require('../models/DailyPackingMetrics');

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

// GET /api/workstation/packing-summary - NEW: Using daily_packing_metrics collection
exports.getPackingSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        console.log(`Packing Summary (NEW): Processing request with date range ${startDate} to ${endDate}`);
        
        // Build date filter for the new collection
        const matchConditions = {};
        if (startDate || endDate) {
            matchConditions.date = {};
            if (startDate) matchConditions.date.$gte = new Date(startDate);
            if (endDate) matchConditions.date.$lte = new Date(endDate);
        } else {
            // Default to last 30 days
            const defaultRange = getDefaultDateRange();
            matchConditions.date = {
                $gte: defaultRange.startDate,
                $lte: defaultRange.endDate
            };
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
                        Object.entries(partNumbers).forEach(([partNumber, countObj]) => {
                            if (!summary[partNumber]) summary[partNumber] = {};
                            // Handle MongoDB number types like {"$numberInt": "51"}
                            const count = typeof countObj === 'object' && countObj.$numberInt ? 
                                parseInt(countObj.$numberInt) : 
                                (typeof countObj === 'number' ? countObj : 0);
                            summary[partNumber][frontendDate] = count;
                        });
                    }
                });
            }

            // Add daily total from packingOutput.totalPacked
            if (dayRecord.packingOutput?.totalPacked !== undefined) {
                if (!summary['DAILY_TOTAL']) summary['DAILY_TOTAL'] = {};
                const totalPacked = typeof dayRecord.packingOutput.totalPacked === 'object' && dayRecord.packingOutput.totalPacked.$numberInt ? 
                    parseInt(dayRecord.packingOutput.totalPacked.$numberInt) : 
                    (typeof dayRecord.packingOutput.totalPacked === 'number' ? dayRecord.packingOutput.totalPacked : 0);
                summary['DAILY_TOTAL'][frontendDate] = totalPacked;
            }
        });

        console.log(`Transformed data for ${Object.keys(summary).length} part numbers`);
        res.json(summary);
    } catch (error) {
        console.error('Error in getPackingSummary (NEW):', error);
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

// GET /api/workstation/sort-data - NEW: Using daily_packing_metrics collection
exports.getSortData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        console.log(`Sort Data (NEW): Processing request with date range ${startDate} to ${endDate}`);
        
        // Build date filter for the new collection
        const matchConditions = {};
        if (startDate || endDate) {
            matchConditions.date = {};
            if (startDate) matchConditions.date.$gte = new Date(startDate);
            if (endDate) matchConditions.date.$lte = new Date(endDate);
        } else {
            // Default to last 30 days
            const defaultRange = getDefaultDateRange();
            matchConditions.date = {
                $gte: defaultRange.startDate,
                $lte: defaultRange.endDate
            };
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

        console.log(`Sort Data (NEW): Processed data for sort codes: ${Object.keys(sortData).join(', ')} with ${Object.values(sortData).reduce((total, dates) => total + Object.keys(dates).length, 0)} total entries`);
        res.json(sortData);
    } catch (error) {
        console.error('Error in getSortData (NEW):', error);
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
    
    // Parse week ID to get date range for daily data
    const [year, week] = weekId.split('-W');
    const weekNum = parseInt(week);
    
    // Calculate start and end dates for the week
    const startOfYear = new Date(parseInt(year), 0, 1);
    const daysToAdd = (weekNum - 1) * 7;
    const mondayOfWeek = new Date(startOfYear);
    mondayOfWeek.setDate(startOfYear.getDate() + daysToAdd - startOfYear.getDay() + 1);
    
    const weekStart = new Date(mondayOfWeek);
    const weekEnd = new Date(mondayOfWeek);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    console.log(`Week ${weekId} range: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
    
    // Match conditions for daily station breakdown per model
    const matchConditions = {
      'records.workstationType': 'TEST',
      'records.modelType': { $regex: model, $options: 'i' },
      'records.timestamps.stationEnd': {
        $gte: weekStart,
        $lte: weekEnd
      }
    };
    
    // Add station filter - station info might be in rawData or other field
    // Let's first check what fields contain station information
    console.log('Querying workstation_output for station data structure...');
    
    // Aggregation pipeline for daily station breakdown (as per engineer's specification)
    const pipeline = [
      { $unwind: '$records' },
      { $match: matchConditions },
      {
        $addFields: {
          // Try to extract station name from various possible fields
          stationName: {
            $ifNull: [
              '$records.rawData.Workstation Name',
              {
                $ifNull: [
                  '$records.rawData.workstation_name', 
                  {
                    $ifNull: [
                      '$records.rawData.station',
                      '$records.rawData.Station'
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
          stationName: station // Filter for specific station
        }
      },
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
            station: '$stationName',
            model: '$records.modelType'
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
    console.log(`Found ${dailyResults.length} daily data points for ${station} station`);
    
    // If no data found, let's debug what stations are available
    if (dailyResults.length === 0) {
      console.log('No data found, checking available stations...');
      
      const debugPipeline = [
        { $unwind: '$records' },
        { $match: {
          'records.workstationType': 'TEST',
          'records.modelType': { $regex: model, $options: 'i' },
          'records.timestamps.stationEnd': {
            $gte: weekStart,
            $lte: weekEnd
          }
        }},
        {
          $group: {
            _id: {
              station: '$records.rawData.Workstation Name',
              model: '$records.modelType'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ];
      
      const availableStations = await WorkstationOutput.aggregate(debugPipeline);
      console.log('Available stations for', model, ':', availableStations);
      
      return res.json({
        weekId: weekId,
        model: model,
        station: station,
        centerLine: 0,
        weeklyTotals: { totalParts: 0, defectRate: 0 },
        dailyPoints: [],
        debug: {
          message: 'No data found for this station',
          availableStations: availableStations,
          searchedStation: station,
          weekRange: `${weekStart.toISOString()} to ${weekEnd.toISOString()}`
        }
      });
    }
    
    // Calculate weekly totals and center line (p-bar)
    const weeklyTotalParts = dailyResults.reduce((sum, day) => sum + day.totalParts, 0);
    const weeklyTotalDefects = dailyResults.reduce((sum, day) => sum + day.failCount, 0);
    const weeklyDefectRate = weeklyTotalParts > 0 ? (weeklyTotalDefects / weeklyTotalParts) * 100 : 0;
    const centerLine = weeklyDefectRate; // p-bar for control limits
    
    // Calculate control limits for each day (variable sample size as per engineer's spec)
    const dailyPoints = dailyResults.map(day => {
      const sampleSize = day.totalParts; // n
      const defects = day.failCount; // x
      const defectRate = day.defectRate; // p
      
      // Control limits calculation as per engineer's specification:
      // UCL = p-bar + 3 × √(p-bar × (1 - p-bar) / n)
      // LCL = p-bar - 3 × √(p-bar × (1 - p-bar) / n)
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
      
      // Determine if out of control (as per engineer's spec for May 29th detection)
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
      centerLine: parseFloat(centerLine.toFixed(2)), // p-bar
      weeklyTotals: {
        totalParts: weeklyTotalParts,
        defectRate: parseFloat(weeklyDefectRate.toFixed(2))
      },
      dailyPoints: dailyPoints
    };
    
    console.log(`P-Chart API: Returning ${dailyPoints.length} daily points with ${weeklyTotalParts} total parts, center line: ${centerLine.toFixed(2)}%`);
    res.json(response);
    
  } catch (error) {
    console.error('Error in getPChartData:', error);
    res.status(500).json({ message: error.message });
  }
}; 