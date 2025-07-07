import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Modal,
  Button,
  Pagination,
} from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { testSnFnData } from '../../data/sampleData';
import { useTheme } from '@mui/material';

// Check if the API base URL is defined in the environment
const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const SnFnPage = () => {
  // Initialize date pickers with default values
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // Default to 7 days ago
    return date;
  });
  const [endDate, setEndDate] = useState(new Date()); // Default to today

  // State for modal interaction and data storage
  const [modalInfo, setModalInfo] = useState([]);
  const [dataBase, setData] = useState([]); // Holds formatted report data
  const [open, setOpen] = useState(false); // Controls modal visibility

  // Pagination state
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const theme = useTheme();

  // Styles for table and modal
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

  // When a row is clicked, set the modal info and open modal
  const getClick = (row) => {
    setModalInfo(row);
    handleOpen();
  };

  // Modal content to show SNs associated with error codes
  const ModalContent = () => {
    const stationData = dataBase[modalInfo[0]];
    const codeData = stationData?.[modalInfo[1] + 1];

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

  // Data processing on component mount + every 5 minutes
  useEffect(() => {
    const fetchAndSortData = async () => {
      const data = [];

      // Format data into station/error/SN structure
      testSnFnData.forEach((d) => {
        if (d[2] === 0) return; // Skip if count is 0

        const idx = data.findIndex((x) => x[0] === d[0]);
        if (idx === -1) {
          // New station entry
          data.push([d[0], [d[3], Number(d[2]), [d[1]]]]);
        } else {
          // Existing station - check for matching error code
          let found = false;
          for (let i = 1; i < data[idx].length; i++) {
            if (data[idx][i][0] === d[3]) {
              data[idx][i][2].push(d[1]); // Add SN
              data[idx][i][1] += Number(d[2]); // Increment count
              found = true;
              break;
            }
          }
          if (!found) {
            // New error code for existing station
            data[idx].push([d[3], Number(d[2]), [d[1]]]);
          }
        }
      });

      // Sort error codes for each station by count descending
      data.forEach((group) => {
        group.splice(1, group.length - 1, ...group.slice(1).sort((a, b) => b[1] - a[1]));
      });

      setData(JSON.parse(JSON.stringify(data))); // Force re-render by cloning
    };

    fetchAndSortData(); // Run once on mount

    // Re-fetch every 5 minutes
    const intervalId = setInterval(() => fetchAndSortData(), 300000);
    return () => clearInterval(intervalId);
  }, []);

  // Pagination change handler
  const handleChangePage = (event, value) => {
    setPage(value);
  };

  // Slice data for current page
  const paginatedData = dataBase.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Box p={1}>
      {/* Page title and description */}
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          SNFN Reports
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time Error Code Tracking
        </Typography>
      </Box>

      {/* Date pickers for filtering (not wired to filter logic yet) */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, fontSize:14}}>
        Start Date:
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          placeholderText="Start Date"
          dateFormat="yyyy-MM-dd"
          isClearable
        />
        End Date:
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
      </Box>

      {/* Display station data as grid of tables */}
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
                {/* Only show top 5 error codes */}
                {station.slice(1, 6).map((codes, jdx) => (
                  <tr key={jdx} onClick={() => getClick([idx + (page - 1) * itemsPerPage, jdx])}>
                    <td style={style}>{codes[0]}</td>
                    <td style={style}>{codes[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Paper>
        ))}
      </Box>

      {/* Pagination controls */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination
          count={Math.ceil(dataBase.length / itemsPerPage)}
          page={page}
          onChange={handleChangePage}
          color="primary"
        />
      </Box>

      {/* Modal display */}
      {open && <ModalContent />}
    </Box>
  );
};

export default SnFnPage;