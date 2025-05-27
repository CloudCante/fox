// Import required packages
const express = require('express'); // Web framework
const cors = require('cors'); // Cross-origin resource sharing
const mongoose = require('mongoose'); // MongoDB Library
const dotenv = require('dotenv'); // Environment variables

// Load environment variables from .env file
dotenv.config();

// Debug: Log environment variables
console.log('MongoDB URI:', process.env.MONGODB_URI);
console.log('Port:', process.env.PORT);

// Create Express app
const app = express();

// Middleware setup
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON bodies

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Import routes
const testRecordsRouter = require('./routes/testRecords');
const workstationRouter = require('./routes/workstationRoutes');

// Use routes
app.use('/api/test-records', testRecordsRouter);
app.use('/api/workstation', workstationRouter);

// Basic route for testing
app.get('/', (req, res) => {
    res.send('Quality Dashboard API is running');
});

// Error handling middleware
app.use((err, req, res, next) => { 
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});