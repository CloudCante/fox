import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  TextField,
  InputAdornment,
  Button,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

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

function toUTCDateString(dateInput) {
  const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  return (
    String(date.getUTCMonth() + 1).padStart(2, '0') + '/' +
    String(date.getUTCDate()).padStart(2, '0') + '/' +
    date.getUTCFullYear()
  );
}

const PackingPage = () => {
  const [packingData, setPackingData] = useState({});
  const [dates, setDates] = useState([]);
  const [copied, setCopied] = useState({ group: '', date: '' });

  useEffect(() => {
    fetch(`${API_BASE}/api/test-records/packing-summary`)
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
            const dateObjJS = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
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
          return new Date(Date.UTC(ay, am - 1, ad)) - new Date(Date.UTC(by, bm - 1, bd));
        });
        // Fill in missing dates for each part
        if (sortedDates.length > 0) {
          const [startMonth, startDay, startYear] = sortedDates[0].split('/');
          const [endMonth, endDay, endYear] = sortedDates[sortedDates.length - 1].split('/');
          const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
          const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));
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
        setPackingData(rolledUpData);
        setDates(sortedDates);
      });
  }, []);

  function getTotals(parts) {
    return dates.map(date =>
      parts.reduce((sum, part) => sum + (packingData[part]?.[date] || 0), 0)
    );
  }

  const handleCopyColumn = (group, date) => {
    const parts = group === 'SXM4' ? sxm4Parts : sxm5Parts;
    const values = parts.map(part => packingData[part]?.[date] || '').join('\n');
    navigator.clipboard.writeText(values).then(() => {
      setCopied({ group, date });
      setTimeout(() => setCopied({ group: '', date: '' }), 1200);
    });
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Packing Data
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 0 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ border: 0, background: 'transparent' }} />
              {dates.map(date => (
                <TableCell key={date} align="right" sx={{ borderBottom: 0, background: 'transparent', p: 0, px: 0.5, fontSize: '0.85rem', minWidth: 40 }}>
                  <Tooltip title={copied.group === 'SXM4' && copied.date === date ? 'Copied!' : 'Copy column'} arrow>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ mb: 0.5, minWidth: 0, px: 1, fontSize: '0.75rem' }}
                      onClick={() => handleCopyColumn('SXM4', date)}
                    >
                      Copy
                    </Button>
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>TESLA SXM4</TableCell>
              {dates.map(date => (
                <TableCell key={date} align="right" sx={{ px: 0.5, fontSize: '0.85rem', minWidth: 40 }}>{date}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sxm4Parts.map((part, idx) => (
              <TableRow key={part} sx={{ backgroundColor: idx % 2 === 0 ? '#f5f5f5' : 'white' }}>
                <TableCell>{part}</TableCell>
                {dates.map(date => (
                  <TableCell key={date} align="right" sx={{ px: 0.5, fontSize: '0.85rem', minWidth: 40 }}>{packingData[part]?.[date] || ''}</TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <TableCell><b>TESLA SXM4 Total</b></TableCell>
              {getTotals(sxm4Parts).map((total, idx) => (
                <TableCell key={dates[idx]} align="right"><b>{total}</b></TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell colSpan={dates.length + 1} sx={{ border: 0, height: 24 }} />
            </TableRow>
            <TableRow>
              <TableCell sx={{ border: 0, background: 'transparent' }} />
              {dates.map(date => (
                <TableCell key={date} align="right" sx={{ borderBottom: 0, background: 'transparent', p: 0, px: 0.5, fontSize: '0.85rem', minWidth: 40 }}>
                  <Tooltip title={copied.group === 'SXM5' && copied.date === date ? 'Copied!' : 'Copy column'} arrow>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ mb: 0.5, minWidth: 0, px: 1, fontSize: '0.75rem' }}
                      onClick={() => handleCopyColumn('SXM5', date)}
                    >
                      Copy
                    </Button>
                  </Tooltip>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>TESLA SXM5</TableCell>
              {dates.map(date => (
                <TableCell key={date} align="right" sx={{ px: 0.5, fontSize: '0.85rem', minWidth: 40 }}>{date}</TableCell>
              ))}
            </TableRow>
            {sxm5Parts.map((part, idx) => (
              <TableRow key={part} sx={{ backgroundColor: idx % 2 === 0 ? '#f5f5f5' : 'white' }}>
                <TableCell>{part}</TableCell>
                {dates.map(date => (
                  <TableCell key={date} align="right" sx={{ px: 0.5, fontSize: '0.85rem', minWidth: 40 }}>{packingData[part]?.[date] || ''}</TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: '#e0e0e0', fontWeight: 'bold' }}>
              <TableCell><b>TESLA SXM5 Total</b></TableCell>
              {getTotals(sxm5Parts).map((total, idx) => (
                <TableCell key={dates[idx]} align="right"><b>{total}</b></TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PackingPage; 