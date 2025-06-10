import React, { useState, useEffect, useMemo, useCallback, useRef, startTransition } from 'react';
import { debounceHeavy, batchUpdates } from '../../utils/performanceUtils';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import { ThroughputBarChart } from '../charts/ThroughputBarChart';
import { useTheme } from '@mui/material/styles';

/**
 * ThroughputPage Component with Performance Optimizations
 * 
 * Applied optimizations to resolve toggle button lag:
 * 1. useCallback for all event handlers (prevents function recreation)
 * 2. Throttling for toggle switches (300ms delay to prevent rapid switching)
 * 3. Memoized style objects (prevents object recreation on each render)
 * 4. React.memo component wrapper (prevents unnecessary re-renders)
 * 5. useRef for throttling state (stable references)
 * 
 * Target: Reduce lag from toggle button interactions
 */
const ThroughputPage = () => {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [throughputData, setThroughputData] = useState(null);
  const [useHardcodedTPY, setUseHardcodedTPY] = useState(true);
  const [sortBy, setSortBy] = useState('volume');
  const [showRepairStations, setShowRepairStations] = useState(false);
  
  // Separate state for immediate UI updates vs expensive processing
  const [processingState, setProcessingState] = useState({
    useHardcodedTPY: true,
    sortBy: 'volume',
    showRepairStations: false,
    isProcessing: false
  });

  // Performance optimization - throttling refs  
  const lastToggleTime = useRef(0);
  const lastRepairToggleTime = useRef(0);

  // Debounced expensive processing function
  const debouncedProcessing = useRef(
    debounceHeavy((newState) => {
      batchUpdates(() => {
        setProcessingState(prev => ({
          ...prev,
          ...newState,
          isProcessing: false
        }));
      });
    }, 100) // Reduced to 100ms for better responsiveness
  ).current;

  // Memoized style objects to prevent recreation on each render
  const containerStyles = useMemo(() => ({
    textAlign: 'center', 
    py: 8
  }), []);

  const headerStyles = useMemo(() => ({
    py: 4
  }), []);

  const cardContentStyles = useMemo(() => ({
    p: 3
  }), []);

  const chartContainerStyles = useMemo(() => ({
    height: 500, 
    mt: 2
  }), []);

  // Dynamic styles based on processing state
  const processingStyles = useMemo(() => ({
    opacity: processingState.isProcessing ? 0.7 : 1,
    transition: 'opacity 0.2s ease-in-out',
    pointerEvents: processingState.isProcessing ? 'none' : 'auto',
    // CSS containment for better performance
    contain: 'layout style paint',
    willChange: processingState.isProcessing ? 'opacity' : 'auto'
  }), [processingState.isProcessing]);

  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'http://10.23.8.41:5000' 
    : 'http://10.23.8.41:5000';

  // Fetch throughput data
  const fetchThroughputData = async () => {
    setLoading(true);
    
    try {
      const weeklyResponse = await fetch(`${API_BASE}/api/workstation/weekly-yield-metrics`);
      if (!weeklyResponse.ok) {
        throw new Error(`Weekly metrics API error: ${weeklyResponse.status}`);
      }
      
      const weeklyData = await weeklyResponse.json();
      const weeks = weeklyData.map(week => week._id).sort().reverse();
      setAvailableWeeks(weeks);
      
      const currentSelectedWeek = selectedWeek || (weeks.length > 0 ? weeks[0] : '');
      if (!selectedWeek && weeks.length > 0) {
        setSelectedWeek(currentSelectedWeek);
      }
      
      if (!currentSelectedWeek) {
        setThroughputData(null);
        return;
      }
      
      const weekData = weeklyData.find(week => week._id === currentSelectedWeek);
      if (weekData) {
        setThroughputData(weekData);
        console.log('Loaded throughput data for', currentSelectedWeek, ':', weekData);
      }
      
    } catch (error) {
      console.error('Error fetching throughput data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process station data for charts - now using debounced processingState
  const processedStationData = useMemo(() => {
    if (!throughputData) return { sxm4: [], sxm5: [], tpyData: {} };
    
    const processModelData = (modelData) => {
      if (!modelData) return [];
      
      let stations = Object.entries(modelData)
        .map(([stationName, data]) => ({
          station: stationName,
          totalParts: data.totalParts || 0,
          failedParts: data.failedParts || 0,
          passedParts: data.passedParts || 0,
          failureRate: data.totalParts > 0 ? parseFloat(((data.failedParts / data.totalParts) * 100).toFixed(2)) : 0,
          throughputYield: parseFloat((data.throughputYield || 0).toFixed(2)),
          impactScore: parseFloat(((data.totalParts || 0) * ((data.failedParts / (data.totalParts || 1)) || 0)).toFixed(1))
        }))
        .filter(station => station.totalParts >= 10); // Minimum volume filter
      
      // Filter repair stations if needed - using processingState
      if (!processingState.showRepairStations) {
        stations = stations.filter(station => 
          !station.station.includes('REPAIR') && 
          !station.station.includes('DEBUG')
        );
      }
      
      // Sort stations - using processingState
      switch (processingState.sortBy) {
        case 'volume':
          stations.sort((a, b) => b.totalParts - a.totalParts);
          break;
        case 'failureRate':
          stations.sort((a, b) => b.failureRate - a.failureRate);
          break;
        case 'impactScore':
          stations.sort((a, b) => b.impactScore - a.impactScore);
          break;
        case 'alphabetical':
          stations.sort((a, b) => a.station.localeCompare(b.station));
          break;
        default:
          break;
      }
      
      return stations;
    };
    
    const tpySource = processingState.useHardcodedTPY ? 'hardcoded' : 'dynamic';
    const sxm4Data = throughputData.weeklyThroughputYield?.modelSpecific?.['Tesla SXM4'];
    const sxm5Data = throughputData.weeklyThroughputYield?.modelSpecific?.['Tesla SXM5'];
    
    return {
      sxm4: processModelData(sxm4Data),
      sxm5: processModelData(sxm5Data),
      tpyData: throughputData.weeklyTPY?.[tpySource] || {}
    };
  }, [throughputData, processingState.useHardcodedTPY, processingState.sortBy, processingState.showRepairStations]);

  // Process station data for tables (filtered for TPY calculation)
  const tableStationData = useMemo(() => {
    if (!processingState.useHardcodedTPY) {
      // If dynamic TPY, show all stations (same as charts)
      return {
        sxm4: processedStationData.sxm4,
        sxm5: processedStationData.sxm5
      };
    }
    
    // If hardcoded TPY, filter to only key stations used in calculation
    const hardcodedStations = {
      sxm4: ['VI2', 'ASSY2', 'FI', 'FQC'], // Key SXM4 stations
      sxm5: ['BBD', 'ASSY2', 'FI', 'FQC']  // Key SXM5 stations
    };
    
    return {
      sxm4: processedStationData.sxm4.filter(station => 
        hardcodedStations.sxm4.includes(station.station)
      ),
      sxm5: processedStationData.sxm5.filter(station => 
        hardcodedStations.sxm5.includes(station.station)
      )
    };
  }, [processedStationData, processingState.useHardcodedTPY]);

  useEffect(() => {
    fetchThroughputData();
  }, [selectedWeek]);

  // Optimized event handlers with useCallback and throttling
  const handleWeekChange = useCallback((event) => {
    setSelectedWeek(event.target.value);
  }, []);

  const handleTPYModeChange = useCallback((event) => {
    event.preventDefault();
    
    // Throttle toggles to prevent rapid switching
    const now = Date.now();
    if (now - lastToggleTime.current < 50) {
      return;
    }
    lastToggleTime.current = now;
    
    const newValue = event.target.checked;
    
    // Immediate UI update for responsiveness
    setUseHardcodedTPY(newValue);
    
    // Mark as processing and debounce expensive calculations using startTransition
    setProcessingState(prev => ({ ...prev, isProcessing: true }));
    startTransition(() => {
      debouncedProcessing({ useHardcodedTPY: newValue });
    });
  }, [debouncedProcessing]);

  const handleSortChange = useCallback((event) => {
    const newValue = event.target.value;
    
    // Immediate UI update
    setSortBy(newValue);
    
    // Debounce expensive processing with startTransition
    setProcessingState(prev => ({ ...prev, isProcessing: true }));
    startTransition(() => {
      debouncedProcessing({ sortBy: newValue });
    });
  }, [debouncedProcessing]);

  const handleRepairStationsChange = useCallback((event) => {
    event.preventDefault();
    
    // Throttle repair station toggle
    const now = Date.now();
    if (now - lastRepairToggleTime.current < 50) {
      return;
    }
    lastRepairToggleTime.current = now;
    
    const newValue = event.target.checked;
    
    // Immediate UI update for responsiveness
    setShowRepairStations(newValue);
    
    // Mark as processing and debounce expensive calculations using startTransition
    setProcessingState(prev => ({ ...prev, isProcessing: true }));
    startTransition(() => {
      debouncedProcessing({ showRepairStations: newValue });
    });
  }, [debouncedProcessing]);

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={containerStyles}>
          <Typography variant="h6" color="text.secondary">
            Loading throughput data...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header Section */}
      <Box sx={headerStyles}>
        <Typography variant="h4" gutterBottom>
          Throughput Yield Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Station efficiency analysis and bottleneck identification for production optimization.
        </Typography>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Controls Section */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Week</InputLabel>
              <Select
                value={selectedWeek}
                label="Week"
                onChange={handleWeekChange}
              >
                {availableWeeks.map((week) => (
                  <MenuItem key={week} value={week}>
                    {week}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={handleSortChange}
              >
                <MenuItem value="volume">Volume (Parts Processed)</MenuItem>
                <MenuItem value="failureRate">Failure Rate</MenuItem>
                <MenuItem value="impactScore">Impact Score</MenuItem>
                <MenuItem value="alphabetical">Alphabetical</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FastSwitch
              checked={useHardcodedTPY}
              onChange={handleTPYModeChange}
              label={useHardcodedTPY ? "Focused TPY" : "Complete TPY"}
              color="primary"
            />
            <Typography variant="caption" display="block" color="text.secondary">
              {useHardcodedTPY ? "4 Key Stations" : "All Stations"}
              {processingState.isProcessing && " • Processing..."}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FastSwitch
              checked={showRepairStations}
              onChange={handleRepairStationsChange}
              label="Show Repair Stations"
              color="secondary"
            />
          </Grid>
        </Grid>
      </Box>

      {/* TPY Summary Cards */}
      {throughputData && (
        <Box sx={{ mb: 6 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Tesla SXM4 TPY
                  </Typography>
                  <Typography variant="h3" color="error.main">
                    {processedStationData.tpyData.SXM4?.tpy?.toFixed(1) || '--'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {useHardcodedTPY ? 'Focused Analysis' : 'Complete Analysis'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    Tesla SXM5 TPY
                  </Typography>
                  <Typography variant="h3" color="success.main">
                    {processedStationData.tpyData.SXM5?.tpy?.toFixed(1) || '--'}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {useHardcodedTPY ? 'Focused Analysis' : 'Complete Analysis'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {throughputData ? (
        <>
          {/* Tesla SXM4 Section */}
          <Box sx={{ mb: 8 }}>
            {/* SXM4 Chart */}
            <MemoizedChart 
              data={processedStationData.sxm4}
              title="Tesla SXM4 - Station Throughput"
              containerStyles={chartContainerStyles}
              processingStyles={processingStyles}
            />

            {/* SXM4 Table */}
            <MemoizedTable 
              data={tableStationData.sxm4}
              title="Tesla SXM4 Station Details"
              modelName="SXM4"
              useHardcodedTPY={useHardcodedTPY}
              processingStyles={processingStyles}
            />
          </Box>

          {/* Tesla SXM5 Section */}
          <Box sx={{ mb: 8 }}>
            {/* SXM5 Chart */}
            <MemoizedChart 
              data={processedStationData.sxm5}
              title="Tesla SXM5 - Station Throughput"
              containerStyles={chartContainerStyles}
              processingStyles={processingStyles}
            />

            {/* SXM5 Table */}
            <MemoizedTable 
              data={tableStationData.sxm5}
              title="Tesla SXM5 Station Details"
              modelName="SXM5"
              useHardcodedTPY={useHardcodedTPY}
              processingStyles={processingStyles}
            />
          </Box>
        </>
      ) : (
        <Box sx={containerStyles}>
          <Typography variant="h6" color="text.secondary">
            No throughput data available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a week to view station throughput analysis
          </Typography>
        </Box>
      )}
    </Container>
  );
};

// Memoized Chart Component for Performance
const MemoizedChart = React.memo(({ data, title, containerStyles, processingStyles }) => (
  <Card elevation={3} sx={{ mb: 3 }}>
    <CardContent sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom color="primary">
        {title} ({data.length} stations)
      </Typography>
      <Box sx={{...containerStyles, ...processingStyles}}>
        <ThroughputBarChart data={data} />
      </Box>
    </CardContent>
  </Card>
));

// Memoized Table Component for Performance  
const MemoizedTable = React.memo(({ data, title, modelName, useHardcodedTPY, processingStyles }) => (
  <Card elevation={3}>
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{title}</Typography>
        <Chip 
          label={`${data.length} stations${useHardcodedTPY ? ' (TPY calc)' : ''}`} 
          size="small" 
        />
      </Box>
      <TableContainer component={Paper} variant="outlined" sx={processingStyles}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Station</TableCell>
              <TableCell align="right">Fail</TableCell>
              <TableCell align="right">Pass</TableCell>
              <TableCell align="right">Grand Total</TableCell>
              <TableCell align="right">Yield</TableCell>
              <TableCell align="right">Fail%</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((station) => (
              <TableRow key={station.station}>
                <TableCell component="th" scope="row">
                  {station.station}
                </TableCell>
                <TableCell align="right">{station.failedParts}</TableCell>
                <TableCell align="right">{station.passedParts.toLocaleString()}</TableCell>
                <TableCell align="right">{station.totalParts.toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Box sx={{ color: station.failureRate < 5 ? 'success.main' : station.failureRate < 10 ? 'warning.main' : 'error.main' }}>
                    {(100 - station.failureRate).toFixed(1)}%
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ color: station.failureRate > 10 ? 'error.main' : station.failureRate > 5 ? 'warning.main' : 'success.main' }}>
                    {station.failureRate}%
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
));

// Lightweight custom switch component for performance
const FastSwitch = React.memo(({ checked, onChange, label, color = 'primary' }) => {
  const theme = useTheme();
  
  const switchStyles = useMemo(() => ({
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      userSelect: 'none'
    },
    switch: {
      position: 'relative',
      width: '44px',
      height: '24px',
      backgroundColor: checked ? 
        (color === 'primary' ? theme.palette.primary.main : theme.palette.secondary.main) : 
        theme.palette.grey[400],
      borderRadius: '12px',
      transition: 'background-color 0.2s ease',
      border: 'none',
      cursor: 'pointer',
      outline: 'none'
    },
    thumb: {
      position: 'absolute',
      top: '2px',
      left: checked ? '22px' : '2px',
      width: '20px',
      height: '20px',
      backgroundColor: 'white',
      borderRadius: '50%',
      transition: 'left 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    label: {
      fontSize: '14px',
      fontWeight: 500,
      color: theme.palette.text.primary
    }
  }), [checked, color, theme]);

  const handleClick = useCallback((e) => {
    // Create a synthetic event that matches MUI Switch structure
    const syntheticEvent = {
      ...e,
      preventDefault: () => e.preventDefault(),
      target: {
        ...e.target,
        checked: !checked
      }
    };
    onChange(syntheticEvent);
  }, [checked, onChange]);

  return (
    <div style={switchStyles.container} onClick={handleClick}>
      <div style={switchStyles.switch}>
        <div style={switchStyles.thumb} />
      </div>
      <span style={switchStyles.label}>{label}</span>
    </div>
  );
});

// Export with React.memo for performance
export default React.memo(ThroughputPage); 