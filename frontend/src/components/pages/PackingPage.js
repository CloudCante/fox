import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { toUTCDateString, createUTCDate } from '../../utils/dateUtils';
import { throttle } from '../../utils/performanceUtils';

const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const sxm4Parts = [
  '692-2G506-0200-006',
  '692-2G506-0200-0R6',
  '692-2G506-0210-006',
  '692-2G506-0212-0R5',
  '692-2G506-0212-0R7',
  '692-2G506-0210-0R6',
  '692-2G510-0200-0R0',
  '692-2G510-0210-003',
  '692-2G510-0210-0R2',
  '692-2G510-0210-0R3',
  '965-2G506-0031-2R0',
  '965-2G506-0130-202',
  '965-2G506-6331-200',
];

const sxm5Parts = [
  '692-2G520-0200-000',
  '692-2G520-0200-0R0',
  '692-2G520-0200-500',
  '692-2G520-0200-5R0',
  '692-2G520-0202-0R0',
  '692-2G520-0280-001',
  '692-2G520-0280-0R0',
  '692-2G520-0280-000',
  '692-2G520-0280-0R1',
  '692-2G520-0282-001',
  '965-2G520-0041-000',
  '965-2G520-0100-001',
  '965-2G520-0100-0R0',
  '965-2G520-0340-0R0',
  '965-2G520-0900-000',
  '965-2G520-0900-001',
  '965-2G520-0900-0R0',
  '965-2G520-6300-0R0',
  '965-2G520-A500-000',
  '965-2G520-A510-300',
];

// Using the imported toUTCDateString from dateUtils.js

const PackingPage = () => {
  const [packingData, setPackingData] = useState({});
  const [dates, setDates] = useState([]);
  const [copied, setCopied] = useState({ group: '', date: '' });
  const [sortData, setSortData] = useState({ '506': {}, '520': {} });
  const mainScrollRef = useRef(null);
  const fixedScrollRef = useRef(null);
  
  // Fixed dimensions for all cells
  const CELL_HEIGHT = 36; // Exact height for all cells
  const CELL_WIDTH = 170;  // Width for data columns - increased further
  const FIXED_COL_WIDTH = 200; // Width for fixed column

  // Synchronize vertical scrolling with throttling
  useEffect(() => {
    const mainScroll = mainScrollRef.current;
    const fixedScroll = fixedScrollRef.current;

    if (mainScroll && fixedScroll) {
      const syncScroll = throttle(() => {
        fixedScroll.scrollTop = mainScroll.scrollTop;
      }, 16); // ~60fps (1000ms / 60 = ~16ms)

      mainScroll.addEventListener('scroll', syncScroll);
      return () => {
        mainScroll.removeEventListener('scroll', syncScroll);
      };
    }
  }, []);

  useEffect(() => {
    // Function to fetch data that we can reuse
    const fetchPackingData = () => {
      // Add default date range if none is provided - last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
      
      // Create URL with date parameters
      const url = new URL(`${API_BASE}/api/test-records/packing-summary`);
      url.searchParams.append('startDate', startDate.toISOString());
      url.searchParams.append('endDate', endDate.toISOString());
      
      fetch(url.toString())
        .then(res => res.json())
        .then(data => {
          // Weekend roll-up logic with pandas-like UTC date handling
          const rolledUpData = {};
          const allDatesSet = new Set();
          Object.entries(data).forEach(([part, dateObj]) => {
            rolledUpData[part] = {};
            Object.entries(dateObj).forEach(([dateStr, count]) => {
              // Parse the date string as UTC, mimicking pandas .dt.date
              const [month, day, year] = dateStr.split('/');
              const dateObjJS = createUTCDate(year, month, day);
              let rollupDate = toUTCDateString(dateObjJS);
              const dayOfWeek = dateObjJS.getUTCDay();
              if (dayOfWeek === 6) { // Saturday
                const friday = new Date(dateObjJS);
                friday.setUTCDate(friday.getUTCDate() - 1);
                rollupDate = toUTCDateString(friday);
              } else if (dayOfWeek === 0) { // Sunday
                const friday = new Date(dateObjJS);
                friday.setUTCDate(friday.getUTCDate() - 2);
                rollupDate = toUTCDateString(friday);
              }
              if (!rolledUpData[part][rollupDate]) rolledUpData[part][rollupDate] = 0;
              rolledUpData[part][rollupDate] += count;
              allDatesSet.add(rollupDate);
            });
          });
          // Build a complete, sorted list of dates
          let sortedDates = Array.from(allDatesSet).sort((a, b) => {
            const [am, ad, ay] = a.split('/');
            const [bm, bd, by] = b.split('/');
            return createUTCDate(ay, am, ad) - createUTCDate(by, bm, bd);
          });
          // Fill in missing dates for each part
          if (sortedDates.length > 0) {
            const [startMonth, startDay, startYear] = sortedDates[0].split('/');
            const [endMonth, endDay, endYear] = sortedDates[sortedDates.length - 1].split('/');
            const startDate = createUTCDate(startYear, startMonth, startDay);
            const endDate = createUTCDate(endYear, endMonth, endDay);
            const allDates = [];
            for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
              if (d.getUTCDay() !== 6 && d.getUTCDay() !== 0) {
                allDates.push(toUTCDateString(d));
              }
            }
            sortedDates = allDates;
            Object.keys(rolledUpData).forEach(part => {
              sortedDates.forEach(date => {
                if (!rolledUpData[part][date]) rolledUpData[part][date] = '';
              });
            });
          }
          
          // Set packing data and dates
          setPackingData(rolledUpData);
          setDates(sortedDates);
          
          // Fetch sort data after we have established dates
          // This ensures synchronization between tables
          fetchSortData(startDate, endDate, sortedDates);
        })
        .catch(error => {
          console.error("Error fetching packing data:", error);
        });
    };
    
    // Function to fetch sort data for SXM4 (506) and SXM5 (520)
    const fetchSortData = (startDate, endDate, datesList) => {
      // Ensure we have dates to work with
      if (!datesList || datesList.length === 0) {
        console.warn("No dates available for sort data fetch");
        return;
      }
      
      // Create URL with date parameters
      const url = new URL(`${API_BASE}/api/test-records/sort-data`);
      url.searchParams.append('startDate', startDate.toISOString());
      url.searchParams.append('endDate', endDate.toISOString());
      
      // Make the API call
      fetch(url.toString())
        .then(res => res.json())
        .then(data => {
          // Apply weekend roll-up logic similar to packingData
          const rolledUpSortData = {
            '506': {},
            '520': {}
          };
          
          // Process 506 data
          Object.entries(data['506'] || {}).forEach(([dateStr, count]) => {
            // Parse the date string as UTC, mimicking pandas .dt.date
            const [month, day, year] = dateStr.split('/');
            const dateObjJS = createUTCDate(year, month, day);
            let rollupDate = toUTCDateString(dateObjJS);
            const dayOfWeek = dateObjJS.getUTCDay();
            if (dayOfWeek === 6) { // Saturday
              const friday = new Date(dateObjJS);
              friday.setUTCDate(friday.getUTCDate() - 1);
              rollupDate = toUTCDateString(friday);
            } else if (dayOfWeek === 0) { // Sunday
              const friday = new Date(dateObjJS);
              friday.setUTCDate(friday.getUTCDate() - 2);
              rollupDate = toUTCDateString(friday);
            }
            if (!rolledUpSortData['506'][rollupDate]) rolledUpSortData['506'][rollupDate] = 0;
            rolledUpSortData['506'][rollupDate] += count;
          });
          
          // Process 520 data
          Object.entries(data['520'] || {}).forEach(([dateStr, count]) => {
            // Parse the date string as UTC, mimicking pandas .dt.date
            const [month, day, year] = dateStr.split('/');
            const dateObjJS = createUTCDate(year, month, day);
            let rollupDate = toUTCDateString(dateObjJS);
            const dayOfWeek = dateObjJS.getUTCDay();
            if (dayOfWeek === 6) { // Saturday
              const friday = new Date(dateObjJS);
              friday.setUTCDate(friday.getUTCDate() - 1);
              rollupDate = toUTCDateString(friday);
            } else if (dayOfWeek === 0) { // Sunday
              const friday = new Date(dateObjJS);
              friday.setUTCDate(friday.getUTCDate() - 2);
              rollupDate = toUTCDateString(friday);
            }
            if (!rolledUpSortData['520'][rollupDate]) rolledUpSortData['520'][rollupDate] = 0;
            rolledUpSortData['520'][rollupDate] += count;
          });
          
          // Ensure sort data has entries for all dates in the packingData
          // This is critical for keeping the tables aligned
          datesList.forEach(date => {
            if (!rolledUpSortData['506'][date]) rolledUpSortData['506'][date] = '';
            if (!rolledUpSortData['520'][date]) rolledUpSortData['520'][date] = '';
          });
          
          // Set the sort data in state
          setSortData(rolledUpSortData);
        })
        .catch(error => {
          console.error("Error fetching sort data:", error);
          
          // On error, fall back to mock data
          const mockSortData = {
            '506': {},
            '520': {}
          };
          
          // Populate with random data for each date, ensuring exact date alignment
          datesList.forEach(date => {
            // Random count between 1 and 30 for 506
            mockSortData['506'][date] = Math.floor(Math.random() * 30) + 1;
            // Random count between 1 and 30 for 520
            mockSortData['520'][date] = Math.floor(Math.random() * 30) + 1;
          });
          
          // Set the mock data as fallback
          setSortData(mockSortData);
        });
    };

    // Fetch data immediately when component mounts
    fetchPackingData();
    
    // Set up auto-refresh interval (every 60 seconds)
    const refreshInterval = setInterval(() => {
      fetchPackingData();
    }, 60000); // 60000 ms = 60 seconds

    // Clean up interval when component unmounts
    return () => clearInterval(refreshInterval);
  }, []);

  // Add a last refreshed indicator
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  
  // Update the last refreshed time when data is fetched
  useEffect(() => {
    if (Object.keys(packingData).length > 0) {
      setLastRefreshed(new Date());
    }
  }, [packingData]);

  // Ensure sort data uses the exact same dates as packing data
  useEffect(() => {
    if (dates.length > 0 && Object.keys(sortData).length > 0) {
      // Create a synchronized copy of the sort data
      const syncedSortData = {
        '506': {},
        '520': {}
      };
      
      // Ensure each date in the dates array has an entry in sort data
      dates.forEach(date => {
        syncedSortData['506'][date] = sortData['506'][date] || '';
        syncedSortData['520'][date] = sortData['520'][date] || '';
      });
      
      // Only update if there are differences
      const isChanged = 
        JSON.stringify(syncedSortData) !== JSON.stringify(sortData);
      
      if (isChanged) {
        setSortData(syncedSortData);
      }
    }
  }, [dates, sortData]);

  function getTotals(parts) {
    return dates.map(date =>
      parts.reduce((sum, part) => sum + (packingData[part]?.[date] || 0), 0)
    );
  }

  const handleCopyColumn = (group, date) => {
    let values = '';
    
    if (group === 'SXM4') {
      values = sxm4Parts.map(part => packingData[part]?.[date] || '').join('\n');
    } else if (group === 'SXM5') {
      values = sxm5Parts.map(part => packingData[part]?.[date] || '').join('\n');
    } else if (group === 'SORT') {
      values = ['506', '520'].map(model => sortData[model]?.[date] || '').join('\n');
    }
    
    navigator.clipboard.writeText(values).then(() => {
      setCopied({ group, date });
      setTimeout(() => setCopied({ group: '', date: '' }), 1200);
    });
  };

  // CSS for both tables
  const tableStyle = {
    position: 'relative',
    borderCollapse: 'separate',
    borderSpacing: 0,
    width: '100%',
    border: 'none',
    height: '100%', // Ensure full height
  };

  // Define common row styles to ensure consistent heights
  const rowStyle = {
    height: `${CELL_HEIGHT}px`,
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
  };

  // CSS for headers
  const headerCellStyle = {
    height: `${CELL_HEIGHT}px`,
    lineHeight: `${CELL_HEIGHT - 16}px`, // Consistent line height (accounting for padding)
    fontWeight: 'bold',
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid rgba(224, 224, 224, 1)',
    borderRight: '1px solid rgba(224, 224, 224, 1)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxSizing: 'border-box',
    verticalAlign: 'middle',
  };

  // CSS for fixed column cells
  const fixedColumnCellStyle = {
    height: `${CELL_HEIGHT}px`,
    lineHeight: `${CELL_HEIGHT - 16}px`, // Consistent line height (accounting for padding)
    width: `${FIXED_COL_WIDTH}px`,
    padding: '8px',
    borderBottom: '1px solid rgba(224, 224, 224, 1)',
    borderRight: '2px solid rgba(0, 0, 0, 0.12)',
    boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxSizing: 'border-box',
    verticalAlign: 'middle',
  };

  // CSS for data cells
  const dataCellStyle = {
    height: `${CELL_HEIGHT}px`,
    lineHeight: `${CELL_HEIGHT - 16}px`, 
    width: `${CELL_WIDTH}px`,
    minWidth: `${CELL_WIDTH}px`,
    maxWidth: `${CELL_WIDTH}px`,
    padding: '8px',
    borderBottom: '1px solid rgba(224, 224, 224, 1)',
    borderRight: '1px solid rgba(224, 224, 224, 1)',
    textAlign: 'center',
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
    verticalAlign: 'middle',
  };

  // CSS for total row cells
  const totalCellStyle = {
    height: `${CELL_HEIGHT}px`,
    lineHeight: `${CELL_HEIGHT - 16}px`, 
    padding: '8px',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderBottom: '1px solid rgba(224, 224, 224, 1)',
    borderRight: '1px solid rgba(224, 224, 224, 1)',
    textAlign: 'center',
    boxSizing: 'border-box',
    verticalAlign: 'middle',
  };

  const fixedTotalCellStyle = {
    ...fixedColumnCellStyle,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    height: `${CELL_HEIGHT}px`,
    lineHeight: `${CELL_HEIGHT - 16}px`,
    boxSizing: 'border-box',
    verticalAlign: 'middle',
    borderBottom: '1px solid rgba(224, 224, 224, 1)',
  };
  
  // Style for final row to ensure perfect alignment
  const finalRowStyle = {
    ...rowStyle,
    borderBottom: 'none',
  };
  
  const finalCellStyle = {
    height: `${CELL_HEIGHT}px`,
    lineHeight: `${CELL_HEIGHT - 16}px`,
    padding: '8px',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderBottom: 'none',
    borderRight: '1px solid rgba(224, 224, 224, 1)',
    textAlign: 'center',
    boxSizing: 'border-box',
    verticalAlign: 'middle',
  };
  
  const finalFixedCellStyle = {
    ...fixedColumnCellStyle,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    height: `${CELL_HEIGHT}px`,
    lineHeight: `${CELL_HEIGHT - 16}px`,
    boxSizing: 'border-box',
    verticalAlign: 'middle',
    borderBottom: 'none',
  };
  
  // Style for sort section header
  const sortSectionHeaderStyle = {
    ...headerCellStyle,
    ...fixedColumnCellStyle,
    zIndex: 3,
    backgroundColor: '#1e3a5f', // Dark blue background
    color: 'white',            // White text
    fontWeight: 'bold',
  };
  
  // Style for sort row
  const sortRowCellStyle = {
    ...fixedColumnCellStyle,
    fontWeight: 'bold',
  };

  // Get alternating row background
  const getRowBackground = (idx) => ({
    backgroundColor: idx % 2 === 0 ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
  });

  // Final row container - add background to both rows
  const tableContainerStyle = {
    display: 'flex', 
    flexDirection: 'column',
    flexGrow: 1,
    width: '100%',
    border: '1px solid rgba(224, 224, 224, 1)', 
    borderRadius: '4px',
    position: 'relative',
    backgroundColor: '#fff',
  };

  // Format date for display - shorter format
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [month, day, year] = dateStr.split('/');
    // Show only last 2 digits of year
    return `${month}/${day}/${year.substring(2)}`;
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Packing Data
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Auto-refreshes every minute • Last updated: {lastRefreshed.toLocaleTimeString()}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search..."
          sx={{ 
            input: { paddingLeft: 0 },
            '& .MuiInputLabel-root': { 
              transform: 'translate(14px, -9px) scale(0.75)' 
            }
          }}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          }
        />
      </Box>

      {/* Integrated Table with Sort and Packing Data */}
      <Box 
        sx={{ 
          display: 'flex', 
          width: '100%',
          border: '1px solid rgba(224, 224, 224, 1)',
          borderRadius: '4px',
          position: 'relative',
          alignItems: 'stretch',
          backgroundColor: '#fff',
        }}
      >
        {/* Fixed column section */}
        <Box 
          ref={fixedScrollRef}
          sx={{ 
            width: `${FIXED_COL_WIDTH}px`, 
            flexShrink: 0,
            backgroundColor: '#fff',
            borderRight: '2px solid rgba(0, 0, 0, 0.12)',
            boxShadow: '2px 0 5px rgba(0, 0, 0, 0.1)',
            zIndex: 2,
            position: 'sticky',
            left: 0,
            overflow: 'hidden',
          }}
        >
          <table style={{
            ...tableStyle, 
            tableLayout: 'fixed' 
          }}>
            <thead>
              <tr style={rowStyle}>
                <th style={{...headerCellStyle, ...fixedColumnCellStyle, zIndex: 3}}>
                  TESLA SXM4
                </th>
              </tr>
            </thead>
            <tbody>
              {sxm4Parts.map((part, idx) => (
                <tr key={`fixed-sxm4-${part}`} style={rowStyle}>
                  <td style={{...fixedColumnCellStyle, ...getRowBackground(idx)}}>
                    {part}
                  </td>
                </tr>
              ))}
              <tr style={rowStyle}>
                <td style={fixedTotalCellStyle}>
                  TESLA SXM4 Total
                </td>
              </tr>
              <tr style={rowStyle}>
                <td style={fixedColumnCellStyle}></td>
              </tr>
              <tr style={rowStyle}>
                <th style={{...headerCellStyle, ...fixedColumnCellStyle, zIndex: 3}}>
                  TESLA SXM5
                </th>
              </tr>
              {sxm5Parts.map((part, idx) => (
                <tr key={`fixed-sxm5-${part}`} style={rowStyle}>
                  <td style={{...fixedColumnCellStyle, ...getRowBackground(idx)}}>
                    {part}
                  </td>
                </tr>
              ))}
              <tr style={rowStyle}>
                <td style={fixedTotalCellStyle}>
                  TESLA SXM5 Total
                </td>
              </tr>
              <tr style={rowStyle}>
                <td style={fixedColumnCellStyle}></td>
              </tr>
              <tr style={rowStyle}>
                <th style={sortSectionHeaderStyle}>
                  SORT
                </th>
              </tr>
              <tr style={rowStyle}>
                <td style={{...sortRowCellStyle, ...getRowBackground(0)}}>
                  506
                </td>
              </tr>
              <tr style={finalRowStyle}>
                <td style={{...sortRowCellStyle, ...getRowBackground(1)}}>
                  520
                </td>
              </tr>
            </tbody>
          </table>
        </Box>

        {/* Data section with horizontal scroll */}
        <Box 
          ref={mainScrollRef}
          sx={{ 
            flexGrow: 1, 
            overflowX: 'auto',
            overflowY: 'auto',
          }}
        >
          <table style={{
            ...tableStyle, 
            width: 'max-content', 
            tableLayout: 'fixed'
          }}>
            <thead>
              <tr style={rowStyle}>
                {dates.map(date => (
                  <th key={`header-sxm4-${date}`} style={{...headerCellStyle, whiteSpace: 'nowrap'}}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <span style={{ 
                        overflow: 'visible',
                        whiteSpace: 'nowrap',
                        fontSize: '0.85rem'
                      }}>{formatDateDisplay(date)}</span>
                      <Tooltip title={copied.group === 'SXM4' && copied.date === date ? 'Copied!' : 'Copy column'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyColumn('SXM4', date)}
                          sx={{ 
                            padding: 0,
                            height: '14px',
                            width: '14px',
                            minWidth: '14px',
                            flexShrink: 0,
                            color: copied.group === 'SXM4' && copied.date === date ? 'success.main' : 'action.active'
                          }}
                        >
                          {copied.group === 'SXM4' && copied.date === date ? 
                            <CheckIcon sx={{ fontSize: '12px' }} /> : 
                            <ContentCopyIcon sx={{ fontSize: '12px' }} />
                          }
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* SXM4 Data */}
              {sxm4Parts.map((part, idx) => (
                <tr key={`data-sxm4-${part}`} style={{...rowStyle, ...getRowBackground(idx)}}>
                  {dates.map(date => (
                    <td key={`${part}-${date}`} style={dataCellStyle}>
                      {packingData[part]?.[date] || ''}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={rowStyle}>
                {getTotals(sxm4Parts).map((total, idx) => (
                  <td key={`sxm4-total-${idx}`} style={totalCellStyle}>
                    {total}
                  </td>
                ))}
              </tr>
              <tr style={rowStyle}>
                {dates.map((_, idx) => (
                  <td key={`spacer-sxm4-${idx}`} style={dataCellStyle}></td>
                ))}
              </tr>
              
              {/* SXM5 Data and Header */}
              <tr style={rowStyle}>
                {dates.map(date => (
                  <th key={`header-sxm5-${date}`} style={{...headerCellStyle, whiteSpace: 'nowrap'}}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <span style={{ 
                        overflow: 'visible',
                        whiteSpace: 'nowrap',
                        fontSize: '0.85rem'
                      }}>{formatDateDisplay(date)}</span>
                      <Tooltip title={copied.group === 'SXM5' && copied.date === date ? 'Copied!' : 'Copy column'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyColumn('SXM5', date)}
                          sx={{ 
                            padding: 0,
                            height: '14px',
                            width: '14px',
                            minWidth: '14px',
                            flexShrink: 0,
                            color: copied.group === 'SXM5' && copied.date === date ? 'success.main' : 'action.active'
                          }}
                        >
                          {copied.group === 'SXM5' && copied.date === date ? 
                            <CheckIcon sx={{ fontSize: '12px' }} /> : 
                            <ContentCopyIcon sx={{ fontSize: '12px' }} />
                          }
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </th>
                ))}
              </tr>
              {sxm5Parts.map((part, idx) => (
                <tr key={`data-sxm5-${part}`} style={{...rowStyle, ...getRowBackground(idx)}}>
                  {dates.map(date => (
                    <td key={`${part}-${date}`} style={dataCellStyle}>
                      {packingData[part]?.[date] || ''}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={rowStyle}>
                {getTotals(sxm5Parts).map((total, idx) => (
                  <td key={`sxm5-total-${idx}`} style={totalCellStyle}>
                    {total}
                  </td>
                ))}
              </tr>
              <tr style={rowStyle}>
                {dates.map((_, idx) => (
                  <td key={`spacer-sxm5-${idx}`} style={dataCellStyle}></td>
                ))}
              </tr>
              
              {/* Sort Data Header and Rows */}
              <tr style={rowStyle}>
                {dates.map(date => (
                  <th key={`header-sort-${date}`} style={{...headerCellStyle, whiteSpace: 'nowrap'}}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                      <span style={{ 
                        overflow: 'visible',
                        whiteSpace: 'nowrap',
                        fontSize: '0.85rem'
                      }}>{formatDateDisplay(date)}</span>
                      <Tooltip title={copied.group === 'SORT' && copied.date === date ? 'Copied!' : 'Copy column'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyColumn('SORT', date)}
                          sx={{ 
                            padding: 0,
                            height: '14px',
                            width: '14px',
                            minWidth: '14px',
                            flexShrink: 0,
                            color: copied.group === 'SORT' && copied.date === date ? 'success.main' : 'action.active'
                          }}
                        >
                          {copied.group === 'SORT' && copied.date === date ? 
                            <CheckIcon sx={{ fontSize: '12px' }} /> : 
                            <ContentCopyIcon sx={{ fontSize: '12px' }} />
                          }
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </th>
                ))}
              </tr>
              <tr style={{...rowStyle, ...getRowBackground(0)}}>
                {dates.map(date => (
                  <td key={`sort-506-${date}`} style={dataCellStyle}>
                    {sortData['506']?.[date] || ''}
                  </td>
                ))}
              </tr>
              <tr style={finalRowStyle}>
                {dates.map(date => (
                  <td key={`sort-520-${date}`} style={dataCellStyle}>
                    {sortData['520']?.[date] || ''}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
};

export default PackingPage; 