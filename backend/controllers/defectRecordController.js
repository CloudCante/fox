const DefectRecord = require('../models/DefectRecord');

// Standardize fail station names (from Python script)
const standardizeStation = (station) => {
    if (!station || station === null || station === undefined) {
        return station;
    }
    
    // Convert to string and uppercase
    station = String(station).toUpperCase().trim();
    
    // Handle specific cases
    if (['FI', 'Fi', 'FI1'].includes(station)) {
        return 'FI';
    }
    if (['VI!', 'VI'].includes(station)) {
        return 'VI1';
    }
    
    return station;
};

// Standardize repair code names (from Python script)
const standardizeRepairCode = (code) => {
    if (!code || code === null || code === undefined) {
        return code;
    }
    
    // Convert to string and uppercase
    code = String(code).toUpperCase().trim();
    
    // NFF variations
    if (['NFF', 'NO FAULT FOUND', 'FCT-NFF'].some(nff => code.includes(nff))) {
        return 'NFF';
    }
    
    // Handle specific cases for pins
    if (['BENT PIN', 'ALIGNED PIN'].some(term => code.includes(term))) {
        if (code.includes('J501') || code.includes('J502')) {
            // Keep specific connector alignments separate
            return code;
        }
        return 'ALIGNED BENT PINS';
    }
    
    // Standardize fin alignment cases
    if (['HEATSINK FIN', 'BENT FIN', 'STRAIGHTENED FIN'].some(term => code.includes(term))) {
        if (code.includes('REPLACED')) {
            return code; // Keep combined actions separate
        }
        return 'ALIGNED HEATSINK FINS';
    }
    
    // Standardize cleaning cases
    if (['CLEAN', 'CLEANED'].some(term => code.includes(term))) {
        if (code.includes('CONNECTOR')) {
            return 'CLEANED CONNECTOR';
        }
        return 'CLEANED HEATSINK';
    }
    
    // Standardize top cover/shroud
    if (['TOP SHROUD', 'TOP COVER', 'SHROUD'].some(term => code.includes(term))) {
        if (code.includes('REPLACED') && code.split('&').length === 1) { // Only if it's the only action
            return 'REPLACED TOP SHROUD';
        }
        return code; // Keep combined actions separate
    }
    
    // Standardize stiffener replacements
    if (code.includes('STIFFENER')) {
        if (['BOTTOM', 'BTM', 'LOWER'].some(term => code.includes(term))) {
            if (code.includes('REPLACED') && code.split('&').length === 1) {
                return 'REPLACED BOTTOM STIFFENER';
            }
        } else if (code.includes('TOP')) {
            if (code.includes('REPLACED') && code.split('&').length === 1) {
                return 'REPLACED TOP STIFFENER';
            }
        }
    }
    
    // Standardize screw related
    if (['MISSING SCREW', 'ADDED SCREW'].some(term => code.includes(term))) {
        return 'ADDED MISSING SCREW';
    }
    
    // Standardize heatsink and thermal pad replacement
    if (code.includes('REPLACED') && code.includes('HEATSINK') && code.includes('THERMAL PAD')) {
        if (code.split('&').length === 1) { // Only if it's the only action
            return 'REPLACED HEATSINK & THERMAL PAD';
        }
    }
    
    return code;
};

// Get fail stations data for Pareto chart
exports.getFailStations = async (req, res) => {
    try {
        console.log('=== DEBUG: getFailStations called ===');
        
        const { startDate, endDate } = req.query;
        console.log('Date filters:', { startDate, endDate });
        
        const matchConditions = {};

        // Filter by date range if provided
        if (startDate || endDate) {
            matchConditions['date'] = {};
            if (startDate) matchConditions['date'].$gte = new Date(startDate);
            if (endDate) matchConditions['date'].$lte = new Date(endDate);
        }

        console.log('Match conditions:', matchConditions);

        // Get all records and process in JavaScript for standardization
        const records = await DefectRecord.find(matchConditions);
        console.log('Total records found:', records.length);
        
        if (records.length > 0) {
            console.log('First record sample:', JSON.stringify(records[0], null, 2));
            console.log('First record raw data:', records[0].raw);
            console.log('Fail Station field:', records[0].raw ? records[0].raw['Fail Station'] : 'NO RAW DATA');
        }
        
        // Count and standardize fail stations
        const stationCounts = {};
        records.forEach(record => {
            if (record.raw && record.raw['Fail Station']) {
                const standardizedStation = standardizeStation(record.raw['Fail Station']);
                console.log(`Processing station: ${record.raw['Fail Station']} -> ${standardizedStation}`);
                if (standardizedStation) {
                    stationCounts[standardizedStation] = (stationCounts[standardizedStation] || 0) + 1;
                }
            } else {
                console.log('Record missing raw.Fail Station:', record.serial_number || 'unknown');
            }
        });

        console.log('Station counts:', stationCounts);

        // Convert to array and sort by count (descending)
        const sortedStations = Object.entries(stationCounts)
            .map(([station, count]) => ({ station, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 13); // Top 13 stations

        console.log('Sorted stations:', sortedStations);

        // Calculate cumulative percentages and format for ParetoChart
        const total = sortedStations.reduce((sum, item) => sum + item.count, 0);
        let cumulative = 0;
        
        const result = sortedStations.map(item => {
            cumulative += item.count;
            return {
                station: item.station,
                fail: item.count,
                failureRate: cumulative / total // Cumulative percentage as decimal
            };
        });

        console.log('Final result:', result);
        res.json(result);
    } catch (error) {
        console.error('Error in getFailStations:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get repair codes data for Pareto chart
exports.getRepairCodes = async (req, res) => {
    try {
        console.log('=== DEBUG: getRepairCodes called ===');
        
        const { startDate, endDate } = req.query;
        console.log('Date filters:', { startDate, endDate });
        
        const matchConditions = {};

        // Filter by date range if provided
        if (startDate || endDate) {
            matchConditions['date'] = {};
            if (startDate) matchConditions['date'].$gte = new Date(startDate);
            if (endDate) matchConditions['date'].$lte = new Date(endDate);
        }

        console.log('Match conditions:', matchConditions);

        // Get all records and process in JavaScript for standardization
        const records = await DefectRecord.find(matchConditions);
        console.log('Total records found:', records.length);
        
        if (records.length > 0) {
            console.log('First record sample:', JSON.stringify(records[0], null, 2));
            console.log('First record raw data:', records[0].raw);
            console.log('Repair Code field:', records[0].raw ? records[0].raw['Repair Code'] : 'NO RAW DATA');
        }
        
        // Count and standardize repair codes
        const codeCounts = {};
        records.forEach(record => {
            if (record.raw && record.raw['Repair Code']) {
                const standardizedCode = standardizeRepairCode(record.raw['Repair Code']);
                console.log(`Processing code: ${record.raw['Repair Code']} -> ${standardizedCode}`);
                if (standardizedCode) {
                    codeCounts[standardizedCode] = (codeCounts[standardizedCode] || 0) + 1;
                }
            } else {
                console.log('Record missing raw.Repair Code:', record.serial_number || 'unknown');
            }
        });

        console.log('Code counts:', codeCounts);

        // Convert to array and sort by count (descending)
        const sortedCodes = Object.entries(codeCounts)
            .map(([code, count]) => ({ code, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 13); // Top 13 codes

        console.log('Sorted codes:', sortedCodes);

        // Calculate cumulative percentages and format for ParetoChart
        const total = sortedCodes.reduce((sum, item) => sum + item.count, 0);
        let cumulative = 0;
        
        const result = sortedCodes.map(item => {
            cumulative += item.count;
            return {
                station: item.code, // Using 'station' key to match ParetoChart component
                fail: item.count,
                failureRate: cumulative / total // Cumulative percentage as decimal
            };
        });

        console.log('Final result:', result);
        res.json(result);
    } catch (error) {
        console.error('Error in getRepairCodes:', error);
        res.status(500).json({ message: error.message });
    }
}; 