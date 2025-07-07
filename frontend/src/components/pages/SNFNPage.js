// Import required dependencies and components
import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Modal, Pagination,
  Select, MenuItem, InputLabel, FormControl,
  OutlinedInput, Checkbox, ListItemText, TextField
} from '@mui/material';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { testSnFnData } from '../../data/sampleData';
import { useTheme } from '@mui/material';

// Check for environment variable for API base
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const SnFnPage = () => {
  // State initialization for date range, modal, data, pagination, and filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to one week ago
    return date;
  });
  const [endDate, setEndDate] = useState(new Date());
  const [modalInfo, setModalInfo] = useState([]);
  const [dataBase, setData] = useState([]);
  //const [showModal, setShowModal] = useState(false); //Currently unused
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [errorCodeFilter, setErrorCodeFilter] = useState([]);
  const [allErrorCodes, setAllErrorCodes] = useState([]);
  const [itemsPerPage,setItemsPer] = useState(5); // Number of stations per page
  const [maxErrorCodes,setMaxErrors] = useState(5); // Number of error codes per station table

  // Theme and style objects for consistent UI
  const theme = useTheme();
  const style = {
    border: 'solid',
    padding: '10px 8px',
    borderColor: theme.palette.divider,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light,
    fontSize: '14px',
    left: 0,
    zIndex: 5,
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
  };
  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid',
    boxShadow: 24,
    pt: 2,
    px: 4,
    pb: 3,
    outline: 0,
  };
  const tableStyle = {
    display: 'grid',
    gridTemplateColumns: { md: '1fr 1fr 1fr' },
    gap: 3,
    maxWidth: '1600px',
    margin: '0 auto',
  };

  // Modal open/close handlers
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Store clicked modal row info
  const getClick = (row) => { // [stationData,codeData]
    setModalInfo(row);
    handleOpen();
  };

  // Modal rendering selected station and error code details
  const ModalContent = () => { //*
    const [stationData,codeData]=modalInfo;

    return (
      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <p>Station {stationData?.[0]}</p>
          <p>Error Code: {codeData?.[0]}</p>
          <p>Error Code Details: {codeData?.[0]} Details</p>
          {codeData?.[2]?.map((sn, idx) => (
            <p key={idx}>SN: {sn}</p>
          ))}
        </Box>
      </Modal>
    );
  };

  // Fetch and process data initially and every 5 minutes
  useEffect(() => {
    const fetchAndSortData = async () => {
      const data = [];
      const codeSet = new Set();

      testSnFnData.forEach((d) => {
        if (d[2] === 0) return; // Skip if count is zero

        codeSet.add(d[3]); // Collect unique error codes

        const idx = data.findIndex((x) => x[0] === d[0]);
        if (idx === -1) {
          // New station entry
          data.push([d[0], [d[3], Number(d[2]), [d[1]]]]);
        } else {
          // Update existing station entry
          const jdx = data[idx].findIndex((x)=>x[0]===d[3]);
          if(jdx === -1){
             data[idx].push([d[3], Number(d[2]), [d[1]]]);
          }else{
             data[idx][jdx][2].push(d[1]);
             data[idx][jdx][1] += Number(d[2]);
          }
        }
      });

      // Sort error codes for each station by count (descending)
      data.forEach((group) => {
        group.splice(1, group.length - 1, ...group.slice(1).sort((a, b) => b[1] - a[1]));
      });

      setAllErrorCodes([...codeSet]); // Populate filter list
      setData(JSON.parse(JSON.stringify(data))); // Set main data
    };

    fetchAndSortData();
    const intervalId = setInterval(() => fetchAndSortData(), 300000); // Refresh every 5 min
    return () => clearInterval(intervalId);
  }, []);

  // Handle page change
  const handleChangePage = (event, value) => {
    setPage(value);
  };

  // Apply error code filter to data
  const filteredData = dataBase.map(station => {
    const filteredCodes = station.slice(1).filter(code =>
      errorCodeFilter.length === 0 || errorCodeFilter.includes(code[0])
    );
    return [station[0], ...filteredCodes];
  }).filter(station => station.length > 1); // Exclude stations with no matching codes

  // Paginate the filtered data
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Box p={1}>
      {/* Page Header */}
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          SNFN Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time Error Code Tracking
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          placeholderText="Start Date"
          dateFormat="yyyy-MM-dd"
          isClearable
          label='Start Date'
        />
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          placeholderText="End Date"
          dateFormat="yyyy-MM-dd"
          isClearable
        />

        {/* Multi-select error code filter */}
        <FormControl sx={{ minWidth: 200}} size='small' >
          <InputLabel sx={{fontSize:14}}>Error Codes</InputLabel>
          <Select
            multiple
            value={errorCodeFilter}
            onChange={(e) => setErrorCodeFilter(e.target.value)}
            input={<OutlinedInput label="Error Codes" />}
            renderValue={(selected) => selected.join(', ')}
          >
            {allErrorCodes.map((code) => (
              <MenuItem key={code} value={code}>
                <Checkbox checked={errorCodeFilter.indexOf(code) > -1} />
                <ListItemText primary={code} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {/* Fields to set tables per page and error codes per table */}
        <TextField size='small' type='number' label='# Tables'
            slotProps={{
                input: {min: 1, max:100 },
                htmlInput: { min: 1, max: 100},
            }} 
            defaultValue={itemsPerPage} onChange={(e) => {
                setItemsPer(Number(e.target.value));
        }}/>
        <TextField size='small' type='number' label='# Error Codes' 
            slotProps={{
                input: {min: 1, max:100 },
                htmlInput: { min: 1, max: 100},
            }} 
        defaultValue={maxErrorCodes} onChange={(e) => {
            setMaxErrors(Number(e.target.value));
        }}/>
      </Box>

      {/* Error code table for each station */}
      <Box sx={tableStyle}>
        {paginatedData.map((station, idx) => (
          <Paper key={station[0]} sx={{ p: 2 }}>
            <table>
              <thead>
                <tr>
                  <th style={style}>Station {station[0]}</th>
                  <th style={style}>Count of Error Codes</th>
                </tr>
              </thead>
              <tbody>
                {station.slice(1, maxErrorCodes+1).map((codes, jdx) => (
                  <tr key={jdx} onClick={() => getClick([station, codes])}>{/** */}
                    <td style={style}>{codes[0]}</td>
                    <td style={style}>{codes[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        ))}
      </Box>

      {/* Pagination Controls */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination
          count={Math.ceil(filteredData.length / itemsPerPage)}
          page={page}
          onChange={handleChangePage}
          color="primary"
        />
      </Box>

      {/* Modal with detailed info */}
      {open && <ModalContent />}
    </Box>
  );
};

export default SnFnPage;
