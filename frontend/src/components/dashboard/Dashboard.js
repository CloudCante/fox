import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { TestStationChart } from '../charts/TestStationChart';
import { ParetoChart } from '../charts/ParetoChart';
import { toUTCDateString } from '../../utils/dateUtils';

const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}
console.log('API_BASE:', API_BASE);

export const Dashboard = () => {
  const [testStationData, setTestStationData] = useState([]);
  const [testStationDataSXM4, setTestStationDataSXM4] = useState([]);
  const [topFixturesData, setTopFixturesData] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const fetchStationPerformanceDataSXM5 = () => {
    const params = new URLSearchParams();
    params.append('model', 'SXM5');
    if (startDate) {
      const utcStartDate = new Date(startDate);
      utcStartDate.setUTCHours(0, 0, 0, 0);
      params.append('startDate', utcStartDate.toISOString());
    }
    if (endDate) {
      const utcEndDate = new Date(endDate);
      utcEndDate.setUTCHours(23, 59, 59, 999);
      params.append('endDate', utcEndDate.toISOString());
    }

    fetch(`${API_BASE}/api/test-records/station-performance?${params.toString()}`)
      .then(res => res.json())
      .then(data => setTestStationData(data))
      .catch(() => setTestStationData([]));
  };

  const fetchStationPerformanceDataSXM4 = () => {
    const params = new URLSearchParams();
    params.append('model', 'SXM4');
    if (startDate) {
      const utcStartDate = new Date(startDate);
      utcStartDate.setUTCHours(0, 0, 0, 0);
      params.append('startDate', utcStartDate.toISOString());
    }
    if (endDate) {
      const utcEndDate = new Date(endDate);
      utcEndDate.setUTCHours(23, 59, 59, 999);
      params.append('endDate', utcEndDate.toISOString());
    }

    fetch(`${API_BASE}/api/test-records/station-performance?${params.toString()}`)
      .then(res => res.json())
      .then(data => setTestStationDataSXM4(data))
      .catch(() => setTestStationDataSXM4([]));
  };

  const fetchTopFixturesData = () => {
    const params = new URLSearchParams();
    if (startDate) {
      const utcStartDate = new Date(startDate);
      utcStartDate.setUTCHours(0, 0, 0, 0);
      params.append('startDate', utcStartDate.toISOString());
    }
    if (endDate) {
      const utcEndDate = new Date(endDate);
      utcEndDate.setUTCHours(23, 59, 59, 999);
      params.append('endDate', utcEndDate.toISOString());
    }

    fetch(`${API_BASE}/api/test-records/top-fixtures?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        const mapped = data.map(item => ({
          station: item._id || item.fixture,
          pass: item.total - item.fail,
          fail: item.fail,
          failureRate: item.failureRate
        }));
        setTopFixturesData(mapped);
      })
      .catch(() => setTopFixturesData([]));
  };

  useEffect(() => {
    fetchStationPerformanceDataSXM5();
    fetchStationPerformanceDataSXM4();
    fetchTopFixturesData();
    const interval = setInterval(() => {
      fetchStationPerformanceDataSXM5();
      fetchStationPerformanceDataSXM4();
      fetchTopFixturesData();
    }, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [startDate, endDate]);

  return (
    <Box p={1}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <DatePicker
          selected={startDate}
          onChange={date => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          placeholderText="Start Date"
          dateFormat="yyyy-MM-dd"
          isClearable
        />
        <DatePicker
          selected={endDate}
          onChange={date => setEndDate(date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          placeholderText="End Date"
          dateFormat="yyyy-MM-dd"
          isClearable
        />
      </div>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { md: '1fr 1fr' },
        gap: 3,
        maxWidth: '1600px',
        margin: '0 auto'
      }}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2,
            position: 'relative',
            width: '100%'
          }}>
            <Typography
              variant="h6"
              sx={{
                width: '100%',
                textAlign: 'center',
                fontSize: {
                  xs: '1rem',
                  sm: '1.1rem',
                  md: '1.25rem',
                },
                mr: {
                  xs: '0',
                  sm: '0',
                  md: '0',
                }
              }}
            >
              SXM5 Test Station Performance
            </Typography>
          </Box>
          <Box sx={{ height: '400px' }}>
            <TestStationChart data={testStationData} />
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2,
            position: 'relative',
            width: '100%'
          }}>
            <Typography
              variant="h6"
              sx={{
                width: '100%',
                textAlign: 'center',
                fontSize: {
                  xs: '1rem',
                  sm: '1.1rem',
                  md: '1.25rem',
                },
                mr: {
                  xs: '0',
                  sm: '0',
                  md: '0',
                }
              }}
            >
              SXM4 Test Station Performance
            </Typography>
          </Box>
          <Box sx={{ height: '400px' }}>
            <TestStationChart data={testStationDataSXM4} />
          </Box>
        </Paper>
        <Paper sx={{ p: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2,
            position: 'relative',
            width: '100%'
          }}>
            <Typography
              variant="h6"
              sx={{
                width: '100%',
                textAlign: 'center',
                fontSize: {
                  xs: '1rem',
                  sm: '1.1rem',
                  md: '1.25rem',
                },
                mr: {
                  xs: '0',
                  sm: '0',
                  md: '0',
                }
              }}
            >
              Most Common Fail Stations
            </Typography>
          </Box>
          <Box sx={{ height: '400px' }}>
            <ParetoChart data={topFixturesData} />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}; 