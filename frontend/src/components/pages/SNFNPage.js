import React, { startTransition, useEffect, useState } from 'react';
import {
  Tooltip,
  IconButton,
  Box,
  Paper,
  Typography,
  CircularProgress,
  Modal,
  Button,
} from '@mui/material';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { toUTCDateString, createUTCDate } from '../../utils/dateUtils';
//import testData from '../../data/testData.csv'
import { testSnFnData } from '../../data/sampleData';

import { useTheme } from '@mui/material';

const API_BASE = process.env.REACT_APP_API_BASE;
if (!API_BASE) {
  console.error('REACT_APP_API_BASE environment variable is not set! Please set it in your .env file.');
}

const FNstations=[
    ['FN0001','test'],
    'FN0002',
    'FN0003',
    'FN0004',
    'FN0005',
];
const ECodes=[
    [
        ['EC001',2],
        ['EC002',3],
        ['EC003',5],
        ['EC004',2],
        ['EC005',2],
    ],[
        ['EC004',1],
        ['EC007',8],
        ['EC003',5],
        ['EC001',2],
        ['EC010',2],

    ],[
        ['EC003',4],
        ['EC005',5],
        ['EC006',1],
        ['EC002',0],
        ['EC003',4],

    ],[
        ['EC007',1],
        ['EC001',1],
        ['EC002',3],
        ['EC999',5],
        ['EC003',1],

    ],[
        ['EC123',3],
        ['EC002',2],
        ['EC003',3],
        ['EC044',5],
        ['EC001',4],

    ]
]

//var dataBase = []
//const data = testData


const SnFnPage = () => {
  //*
  const [startDate, setStartDate] = useState(() => {
    // Default to last 7 days
    const date = new Date();
    date.setDate(date.getDate() - 7);
  });
  const [endDate, setEndDate] = useState(new Date()); // Default to today
  //*/
  const theme = useTheme();

  const style = {
    border:'solid',
    padding:'10px 8px',
    borderColor:theme.palette.divider,
    backgroundColor:theme.palette.mode === 'dark' ? theme.palette.primary.dark:theme.palette.primary.light,
    fontSize: '14px',
    left:0,
    zIndex: 5,
    boxShadow: '2px 0 5px rgba(0,0,0,0.1)',}
  
  const [modalInfo, setModalInfo] = React.useState([]);
  const [dataBase, setData] = React.useState([]);
  //const getData = () =>{return(dataBase)}
  const [showModal, setShowModal] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const toggleTrueFalse = () =>{
    setShowModal(handleOpen);
  };
  const newData = (newD)=>{
    console.log("newD");
    //setData(newD);
    //dataBase = newD
    dataBase[0] = newD
    console.log(newD);
    console.log(dataBase)
  };

  const getClick = (row)=>{
    console.log("click");
    //console.log(dataBase);
    setModalInfo(row);
    toggleTrueFalse();
    //ModalContent();
  };

  const ModalContent=() =>{
    console.log(modalInfo);
    //*
    return(
        <Modal open={open} onClose={handleClose} >
            <Box sx={{position: 'absolute',
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
                outline:0}}> 
                <p>
                    Station {FNstations[modalInfo[0]]}
                </p>
                <p>
                    Error Code: {ECodes[modalInfo[0]][modalInfo[1]][0]} 
                </p>
                <p>
                    Error Code Details: {ECodes[modalInfo[0]][modalInfo[1]][0]} Details
                </p>
                <p>
                    SN:{ECodes[modalInfo[0]][modalInfo[1]][1]}
                </p>
            </Box>
        </Modal>
    );//*/
  };


//*
const fetchData=()=>{
    const data = [];
    //data.push(testSnFnData[0])
    {testSnFnData.map((d)=>{
        if(d[2]==0){}
        else{
            if(data.length == 0 ){
                data.push([d[0],[d[3],Number(d[2]),[d[1]]]])
            }
            else{
                var addA = true
                data.map((i,idx)=>{
                    if(i[0]==d[0]){
                        addA = false
                        var addB = true
                        i.map((j,jdx)=>{
                            if(j[0]=="N"){}
                            else{
                                if(j[0]==d[3]){
                                    addB=false
                                    data[idx][jdx][2].push(d[1])
                                    data[idx][jdx][1]=Number(data[idx][jdx][1]) + Number(d[2])
                                }
                            }
                        })
                        if(addB){
                            data[idx].push([d[3],Number(d[2]),[d[1]]])
                        }
                    }
                    
                })
                if(addA){
                    data.push([d[0],[d[3],Number(d[2]),[d[1]]]])
                    //console.log("added "+d)
                }
            }
        }
    })}
    console.log("fetched")
    newData(data)
}
const sortData = ()=>{
    const data = dataBase[0]
    console.log("unsort")
    console.log(dataBase)
    data.map((f,fdx)=>{
        for(var i=1;i<f.length-1;i++){
            for(var j=i+1;j<f.length;j++){
                //console.log(f[i][1]+":"+f[j][1])
                if(f[j][1]>f[i][1]){
                    var t = f[i]
                    data[fdx][i]=data[fdx][j]
                    data[fdx][j]=t
                }
            }
        }
    })
    console.log("sort")
    console.log(data)
    newData(data)
    console.log(dataBase)
}
  useEffect(()=>{
    fetchData();
    sortData();
    const intervalId = setInterval(()=>{
        console.log("updated")
        fetchData();
        sortData();
    },300000);
    return () => clearInterval(intervalId);
  },[]);

  return(
    <Box p={1}>
        <Box sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                SNFN Reports
            </Typography>
            <Typography variant="body1" color="text.secondary">
                Real-time Error Code Tracking
            </Typography>
        </Box>
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
            gridTemplateColumns: { md: '1fr 1fr 1fr' },
            gap: 3,
            maxWidth: '1600px',
            margin: '0 auto'
            }}>
            {FNstations.map((station,idx) =>(
                <Paper key = {station} sx={{p:2}}>
                    <tr>
                        <td style={style}>
                        Station {station[0]}
                        </td>
                        <td style={style}>
                            Count of Error Codes
                        </td>
                    </tr>
                {ECodes[idx].map((codes,jdx)=>(
                    <tr onClick={()=>getClick([idx,jdx])}>
                        <td style={style}>
                        {codes[0]}
                        </td>
                        <td style={style}>
                            {codes[1]}
                        </td>

                    </tr>
                ))}   
                
                </Paper>
            ))}
        </Box>
        {open ? <ModalContent/>:null}
    </Box>
  );
  //*/
};

export default SnFnPage; 