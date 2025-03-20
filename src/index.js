/**
 * 4g3n7 - Privacy-preserving AI financial assistant
 * 
 * Main server file that initializes all components and starts the API server.
 */

// Load environment variables
require('dotenv').config();

// Check for required environment variables
const { isEnvironmentValid } = require('../utils/env');

// Import core dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Import route handlers
const nillionRoutes = require('./backend/nillion/routes');
const coinbaseRoutes = require('./backend/coinbase/routes');
const recallRoutes = require('./backend/recall/routes');
const t1Routes = require('./backend/t1/routes');
const privyRoutes = require('./backend/privy/routes');

// Configure middleware
app.use(cors());
app.use(express.json());

// Validate environment before starting
if (!isEnvironmentValid()) {
  console.error('Environment validation failed. Please check your .env file.');
  process.exit(1);
}

// API routes
app.use('/api/nillion', nillionRoutes);
app.use('/api/coinbase', coinbaseRoutes);
app.use('/api/recall', recallRoutes);
app.use('/api/t1', t1Routes);
app.use('/api/privy', privyRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'operational',
    version: '0.1.0',
    environment: process.env.NODE_ENV
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
-----------------------------------------------
🛡️  4g3n7 - Privacy-First Financial Assistant
-----------------------------------------------
🚀 Server running on port ${PORT}
🔒 Running in ${process.env.NODE_ENV || 'development'} mode
`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
