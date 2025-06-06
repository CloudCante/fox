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
  const [dailyPChartData, setDailyPChartData] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState([]);
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

  // Calculate control limits from daily data
  const calculateControlLimits = (dailyData) => {
    if (dailyData.length === 0) return { ucl: 1.0, lcl: 0.0, centerLine: 0.5 };

    // Calculate average proportion (p-bar)
    const pBar = dailyData.reduce((sum, day) => sum + day.proportion, 0) / dailyData.length;
    
    // Calculate average sample size
    const avgSampleSize = dailyData.reduce((sum, day) => sum + (day.sampleSize || 100), 0) / dailyData.length;
    
    // Calculate standard error: sqrt(p(1-p)/n)
    const standardError = Math.sqrt((pBar * (1 - pBar)) / avgSampleSize);
    
    // Control limits: p ± 3 * standard error
    const ucl = Math.min(1.0, pBar + (3 * standardError));
    const lcl = Math.max(0.0, pBar - (3 * standardError));
    
    return { ucl, lcl, centerLine: pBar };
  };

  // Fetch P-Chart data
  const fetchPChartData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange(timeRange);
      
      console.log(`Fetching P-Chart data for range: ${startDate} to ${endDate}`);
      
      // Fetch daily yield metrics directly
      const dailyResponse = await fetch(`${API_BASE}/api/workstation/daily-yield-metrics?startDate=${startDate}&endDate=${endDate}`);
      const weeklyResponse = await fetch(`${API_BASE}/api/workstation/weekly-yield-metrics`);

      if (!dailyResponse.ok) {
        throw new Error(`Daily metrics API error: ${dailyResponse.status}`);
      }

      const dailyData = await dailyResponse.json();
      const weeklyData = weeklyResponse.ok ? await weeklyResponse.json() : [];

      // Transform daily data to P-Chart format
      const pChartData = dailyData.map(day => {
        // Use the completion FPY as our main metric for the P-Chart
        const proportion = day.dailyCompletions?.dailyFPY / 100 || 0;
        const sampleSize = day.dailyCompletions?.completedToday || 0;
        
        return {
          date: day._id, // e.g., "2025-04-01"
          proportion: proportion,
          sampleSize: sampleSize,
          rawDate: day.date,
          weekId: day.weekData?.weekId,
          // We'll calculate control limits after we have all data
          ucl: 0,
          lcl: 0,
          centerLine: 0
        };
      });

      // Calculate control limits from the data series
      const controlLimits = calculateControlLimits(pChartData);
      
      // Apply control limits to all data points
      const finalPChartData = pChartData.map(point => ({
        ...point,
        ucl: controlLimits.ucl,
        lcl: controlLimits.lcl,
        centerLine: controlLimits.centerLine,
        inControl: point.proportion >= controlLimits.lcl && point.proportion <= controlLimits.ucl
      }));

      setDailyPChartData(finalPChartData);
      setWeeklySummary(weeklyData);

      // Calculate summary statistics
      if (finalPChartData.length > 0) {
        const recentDays = finalPChartData.slice(-7); // Last 7 days
        const avgYield = recentDays.reduce((sum, day) => sum + day.proportion, 0) / recentDays.length;
        const outOfControl = recentDays.filter(day => !day.inControl).length;
        const totalSampleSize = recentDays.reduce((sum, day) => sum + day.sampleSize, 0);
        
        setSummaryStats({
          overallPassRate: (avgYield * 100).toFixed(1),
          processStatus: outOfControl === 0 ? 'In Control' : 'Out of Control',
          controlLimits: `${(controlLimits.lcl * 100).toFixed(1)}% - ${(controlLimits.ucl * 100).toFixed(1)}%`,
          outOfControlPoints: outOfControl,
          totalSampleSize: totalSampleSize
        });
      }

      console.log(`Loaded ${finalPChartData.length} daily data points for P-Chart`);
      
    } catch (error) {
      console.error('Error fetching P-Chart data:', error);
    } finally {
      setLoading(false);
    }
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
          Weekly First Pass Yield P-Chart
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
        Daily completion FPY data points with calculated control limits for weekly performance monitoring
        <Chip 
          label={loading ? "Loading..." : `${dailyPChartData.length} daily data points`} 
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
            Loading daily yield metrics for P-Chart...
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Main P-Chart */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader 
                title="Daily First Pass Yield P-Chart"
                subheader="Daily completion FPY with automatically calculated control limits"
                titleTypographyProps={{ variant: 'h6' }}
                subheaderTypographyProps={{ variant: 'body2' }}
              />
              <CardContent>
                <Box sx={{ height: 450 }}>
                  <PChart 
                    data={dailyPChartData}
                    title="Daily FPY P-Chart"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Summary Statistics */}
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader 
                title="P-Chart Summary (Last 7 Days)"
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
                        Average FPY
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
                      <Typography variant="h6" color="info.main">
                        {summaryStats.controlLimits || '--'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Control Limits
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

          {/* Weekly Summary Table */}
          {weeklySummary.length > 0 && (
            <Grid item xs={12}>
              <Card elevation={3}>
                <CardHeader 
                  title="Weekly Summary"
                  subheader="Aggregated weekly metrics for management reporting"
                  titleTypographyProps={{ variant: 'h6' }}
                />
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {weeklySummary.slice(-4).map((week) => (
                      <Paper key={week._id} sx={{ p: 2, minWidth: 150 }}>
                        <Typography variant="h6" color="primary">
                          {week._id}
                        </Typography>
                        <Typography variant="body2">
                          FPY: {week.weeklyFirstPassYield?.traditional?.firstPassYield?.toFixed(1) || '--'}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {week.weeklyFirstPassYield?.traditional?.partsStarted || 0} parts
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* Success Note */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: 'success.light', borderRadius: 1 }}>
        <Typography variant="body2" color="success.contrastText">
          <strong>✅ Live P-Chart:</strong> Daily data points from daily_yield_metrics with automatically calculated control limits. 
          Weekly metrics provide summary context for management reporting.
          {!loading && ` Currently showing ${dailyPChartData.length} daily data points.`}
        </Typography>
      </Box>
    </Box>
  );
};

export default PerformancePage; 