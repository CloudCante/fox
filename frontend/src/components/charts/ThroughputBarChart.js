import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { useTheme } from '@mui/material';

export const ThroughputBarChart = ({ data }) => {
  const theme = useTheme();
  const textColor = theme.palette.mode === 'dark' ? '#fff' : '#000';

  // Transform station data for the chart
  const chartData = data.map(station => ({
    station: station.station,
    passed: station.passedParts,
    failed: station.failedParts
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart 
        data={chartData} 
        margin={{ top: 50, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="station" 
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
          stroke={textColor}
          tick={{ fill: textColor }}
        />
        <YAxis 
          stroke={textColor}
          tick={{ fill: textColor }}
        />
        <Tooltip />
        <Legend 
          align="right"
          verticalAlign="top"
          layout="horizontal"
          wrapperStyle={{
            fontSize: '14px',
            fontWeight: '500',
            paddingBottom: '10px'
          }}
        />
        <Bar dataKey="passed" stackId="parts" fill="#4caf50" name="Good Parts">
          <LabelList 
            dataKey="passed" 
            position="inside" 
            fill={theme.palette.mode === 'dark' ? '#fff' : '#000'}
            style={{ fontWeight: 'bold', fontSize: '12px' }}
            formatter={(value) => value > 30 ? value.toLocaleString() : ''}
          />
        </Bar>
        <Bar dataKey="failed" stackId="parts" fill="#f44336" name="Defective Parts">
          <LabelList 
            dataKey="failed" 
            position="inside" 
            fill={theme.palette.mode === 'dark' ? '#fff' : '#000'}
            style={{ fontWeight: 'bold', fontSize: '12px' }}
            formatter={(value) => value > 10 ? value.toLocaleString() : ''}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}; 