import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import { PChart } from '../charts/PChart';

const API_BASE = process.env.REACT_APP_API_BASE;

const PerformancePage = () => {
  const [dailyCompletionFPY, setDailyCompletionFPY] = useState([]);
  const [traditionalFPY, setTraditionalFPY] = useState([]);
  const [completedOnlyFPY, setCompletedOnlyFPY] = useState([]);
  const [weeklyFPY, setWeeklyFPY] = useState([]);
  const [summaryStats, setSummaryStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');

  // Calculate date ranges based on selection
  const getDateRange = (range) => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch(range) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  };

  // Fetch all P-Chart data
  const fetchPChartData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(timeRange);
      
      console.log(`Fetching P-Chart data for range: ${startDate} to ${endDate}`);
      
      // Fetch different metrics in parallel
      const [
        dailyCompletionResponse,
        traditionalResponse, 
        completedOnlyResponse,
        weeklyResponse
      ] = await Promise.all([
        fetch(`${API_BASE}/api/workstation/p-chart-data?period=daily&metric=completion_fpy&startDate=${startDate}&endDate=${endDate}`),
        fetch(`${API_BASE}/api/workstation/p-chart-data?period=daily&metric=traditional_fpy&startDate=${startDate}&endDate=${endDate}`),
        fetch(`${API_BASE}/api/workstation/p-chart-data?period=daily&metric=completed_only_fpy&startDate=${startDate}&endDate=${endDate}`),
        fetch(`${API_BASE}/api/workstation/p-chart-data?period=weekly`)
      ]);

      // Parse responses
      const dailyCompletionData = await dailyCompletionResponse.json();
      const traditionalData = await traditionalResponse.json();
      const completedOnlyData = await completedOnlyResponse.json();
      const weeklyData = await weeklyResponse.json();

      // Set state
      setDailyCompletionFPY(dailyCompletionData);
      setTraditionalFPY(traditionalData);
      setCompletedOnlyFPY(completedOnlyData);
      setWeeklyFPY(weeklyData);

      // Calculate summary statistics from the latest data points
      if (dailyCompletionData.length > 0) {
        const latestDay = dailyCompletionData[dailyCompletionData.length - 1];
        const recentDays = dailyCompletionData.slice(-7); // Last 7 days
        
        const avgYield = recentDays.reduce((sum, day) => sum + day.proportion, 0) / recentDays.length;
        const outOfControl = recentDays.filter(day => !day.inControl).length;
        const sigmaLevel = calculateSigmaLevel(recentDays);
        
        setSummaryStats({
          overallPassRate: (avgYield * 100).toFixed(1),
          processStatus: latestDay.inControl ? 'In Control' : 'Out of Control',
          sigmaLevel: sigmaLevel.toFixed(2),
          outOfControlPoints: outOfControl
        });
      }

      console.log(`Loaded P-Chart data: ${dailyCompletionData.length} daily completion, ${traditionalData.length} traditional, ${completedOnlyData.length} completed-only, ${weeklyData.length} weekly`);
      
    } catch (error) {
      console.error('Error fetching P-Chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simple sigma level calculation
  const calculateSigmaLevel = (dataPoints) => {
    if (dataPoints.length < 2) return 0;
    
    const mean = dataPoints.reduce((sum, point) => sum + point.proportion, 0) / dataPoints.length;
    const variance = dataPoints.reduce((sum, point) => sum + Math.pow(point.proportion - mean, 2), 0) / dataPoints.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev * 3; // 3-sigma approximation
  };

  // Load data on component mount and when time range changes
  useEffect(() => {
    fetchPChartData();
  }, [timeRange]);

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Performance Monitoring - P-Charts
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={handleTimeRangeChange}
          >
            <MenuItem value="7days">Last 7 Days</MenuItem>
            <MenuItem value="30days">Last 30 Days</MenuItem>
            <MenuItem value="90days">Last 90 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
        Real-time P-Charts powered by pre-aggregated daily and weekly yield metrics
        <Chip 
          label={loading ? "Loading..." : `${dailyCompletionFPY.length + traditionalFPY.length + completedOnlyFPY.length} data points`} 
          size="small" 
          sx={{ ml: 2 }} 
          color={loading ? "default" : "success"}
        />
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary" sx={{ ml: 2 }}>
            Loading P-Chart data from yield metrics...
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Daily Completion FPY P-Chart */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader 
                title="Daily Completion First Pass Yield"
                subheader="Parts completed today that were first pass success - most stable metric"
                titleTypographyProps={{ variant: 'h6' }}
                subheaderTypographyProps={{ variant: 'body2' }}
              />
              <CardContent>
                <Box sx={{ height: 400 }}>
                  <PChart 
                    data={dailyCompletionFPY}
                    title="Daily Completion FPY P-Chart"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Traditional vs Completed-Only FPY */}
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardHeader 
                title="Traditional First Pass Yield"
                subheader="First pass success / Parts started (includes in-progress)"
                titleTypographyProps={{ variant: 'h6' }}
                subheaderTypographyProps={{ variant: 'body2' }}
              />
              <CardContent>
                <Box sx={{ height: 300 }}>
                  <PChart 
                    data={traditionalFPY}
                    title="Traditional FPY P-Chart"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardHeader 
                title="Completed-Only First Pass Yield"
                subheader="First pass success / Completed parts (excludes in-progress)"
                titleTypographyProps={{ variant: 'h6' }}
                subheaderTypographyProps={{ variant: 'body2' }}
              />
              <CardContent>
                <Box sx={{ height: 300 }}>
                  <PChart 
                    data={completedOnlyFPY}
                    title="Completed-Only FPY P-Chart"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Weekly FPY Trend */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader 
                title="Weekly First Pass Yield Trend"
                subheader="Weekly aggregated FPY for management reporting"
                titleTypographyProps={{ variant: 'h6' }}
                subheaderTypographyProps={{ variant: 'body2' }}
              />
              <CardContent>
                <Box sx={{ height: 350 }}>
                  <PChart 
                    data={weeklyFPY}
                    title="Weekly FPY P-Chart"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Summary Statistics */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader 
                title="Performance Summary (Last 7 Days)"
                titleTypographyProps={{ variant: 'h6' }}
              />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {summaryStats.overallPassRate || '--'}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average Completion FPY
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography 
                        variant="h6" 
                        color={summaryStats.processStatus === 'In Control' ? "success.main" : "error.main"}
                      >
                        {summaryStats.processStatus || '--'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Process Status
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {summaryStats.sigmaLevel || '--'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Process Variation
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography 
                        variant="h4" 
                        color={summaryStats.outOfControlPoints > 0 ? "warning.main" : "success.main"}
                      >
                        {summaryStats.outOfControlPoints || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Out of Control Points
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Success Note */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
        <Typography variant="body2" color="success.contrastText">
          <strong>✅ Live P-Chart Data:</strong> Now powered by pre-aggregated daily and weekly yield metrics! 
          Data refreshes automatically from workstation_master → daily_yield_metrics → P-Charts.
          {!loading && ` Currently showing ${dailyCompletionFPY.length} daily data points.`}
        </Typography>
      </Box>
    </Box>
  );
};

export default PerformancePage; 