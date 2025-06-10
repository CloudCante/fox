import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
  FormControlLabel,
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

const ThroughputPage = () => {
  const [selectedWeek, setSelectedWeek] = useState('');
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [throughputData, setThroughputData] = useState(null);
  const [useHardcodedTPY, setUseHardcodedTPY] = useState(true);
  const [sortBy, setSortBy] = useState('volume');
  const [showRepairStations, setShowRepairStations] = useState(false);

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

  // Process station data for charts
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
      
      // Filter repair stations if needed
      if (!showRepairStations) {
        stations = stations.filter(station => 
          !station.station.includes('REPAIR') && 
          !station.station.includes('DEBUG')
        );
      }
      
      // Sort stations
      switch (sortBy) {
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
    
    const tpySource = useHardcodedTPY ? 'hardcoded' : 'dynamic';
    const sxm4Data = throughputData.weeklyThroughputYield?.modelSpecific?.['Tesla SXM4'];
    const sxm5Data = throughputData.weeklyThroughputYield?.modelSpecific?.['Tesla SXM5'];
    
    return {
      sxm4: processModelData(sxm4Data),
      sxm5: processModelData(sxm5Data),
      tpyData: throughputData.weeklyTPY?.[tpySource] || {}
    };
  }, [throughputData, useHardcodedTPY, sortBy, showRepairStations]);

  // Process station data for tables (filtered for TPY calculation)
  const tableStationData = useMemo(() => {
    if (!useHardcodedTPY) {
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
  }, [processedStationData, useHardcodedTPY]);

  useEffect(() => {
    fetchThroughputData();
  }, [selectedWeek]);

  const handleWeekChange = (event) => {
    setSelectedWeek(event.target.value);
  };

  const handleTPYModeChange = (event) => {
    setUseHardcodedTPY(event.target.checked);
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ textAlign: 'center', py: 8 }}>
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
      <Box sx={{ py: 4 }}>
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
            <FormControlLabel
              control={
                <Switch
                  checked={useHardcodedTPY}
                  onChange={handleTPYModeChange}
                  color="primary"
                />
              }
              label={useHardcodedTPY ? "Focused TPY" : "Complete TPY"}
            />
            <Typography variant="caption" display="block" color="text.secondary">
              {useHardcodedTPY ? "4 Key Stations" : "All Stations"}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={showRepairStations}
                  onChange={(e) => setShowRepairStations(e.target.checked)}
                  color="secondary"
                />
              }
              label="Show Repair Stations"
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
            <Card elevation={3} sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Tesla SXM4 - Station Throughput ({processedStationData.sxm4.length} stations)
                </Typography>
                <Box sx={{ height: 500, mt: 2 }}>
                  <ThroughputBarChart data={processedStationData.sxm4} />
                </Box>
              </CardContent>
            </Card>

            {/* SXM4 Table */}
            <Card elevation={3}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Tesla SXM4 Station Details</Typography>
                  <Chip 
                    label={`${tableStationData.sxm4.length} stations${useHardcodedTPY ? ' (TPY calc)' : ''}`} 
                    size="small" 
                  />
                </Box>
                <TableContainer component={Paper} variant="outlined">
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
                      {tableStationData.sxm4.map((station) => (
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
          </Box>

          {/* Tesla SXM5 Section */}
          <Box sx={{ mb: 8 }}>
            {/* SXM5 Chart */}
            <Card elevation={3} sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Tesla SXM5 - Station Throughput ({processedStationData.sxm5.length} stations)
                </Typography>
                <Box sx={{ height: 500, mt: 2 }}>
                  <ThroughputBarChart data={processedStationData.sxm5} />
                </Box>
              </CardContent>
            </Card>

            {/* SXM5 Table */}
            <Card elevation={3}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Tesla SXM5 Station Details</Typography>
                  <Chip 
                    label={`${tableStationData.sxm5.length} stations${useHardcodedTPY ? ' (TPY calc)' : ''}`} 
                    size="small" 
                  />
                </Box>
                <TableContainer component={Paper} variant="outlined">
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
                      {tableStationData.sxm5.map((station) => (
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
          </Box>
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
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

export default ThroughputPage; 