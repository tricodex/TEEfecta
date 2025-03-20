/**
 * 4g3n7 - Secure Trading Agent (Local Development Version)
 * 
 * Core application server for local testing without TEE components.
 * This is a simplified version of the server that would run in the Marlin Oyster CVM.
 */

const express = require('express');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Generate a mock enclave key for local testing
const mockEnclavePublicKey = crypto.randomBytes(32).toString('hex');
console.log('Generated mock enclave public key for local testing');

// Initialize in-memory storage for the demo
const tradeHistory = [];
const pendingTrades = [];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    enclave: false,
    environment: 'local-development'
  });
});

// Get enclave public key endpoint
app.get('/enclave/public-key', (req, res) => {
  res.status(200).json({
    publicKey: mockEnclavePublicKey,
    isMock: true
  });
});

// Trading API endpoints
app.post('/api/trades', (req, res) => {
  const { asset, amount, action, user } = req.body;
  
  if (!asset || !amount || !action || !user) {
    return res.status(400).json({
      error: 'Missing required parameters'
    });
  }
  
  // Create a new trade request
  const tradeId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  
  const trade = {
    id: tradeId,
    asset,
    amount: parseFloat(amount),
    action, // 'buy' or 'sell'
    user,
    status: 'pending',
    timestamp
  };
  
  // In a real implementation, this would execute the trade with external services
  pendingTrades.push(trade);
  
  // Log trade request
  console.log(`New trade request: ${JSON.stringify(trade)}`);
  
  res.status(201).json({
    tradeId,
    status: 'pending',
    message: 'Trade request received and is being processed'
  });
});

// Get all trades for a user
app.get('/api/trades', (req, res) => {
  const { user } = req.query;
  
  if (!user) {
    return res.status(400).json({
      error: 'User parameter is required'
    });
  }
  
  // Filter trades by user
  const userTrades = [...tradeHistory, ...pendingTrades].filter(
    trade => trade.user === user
  );
  
  res.status(200).json({
    trades: userTrades
  });
});

// Additional endpoint for local testing purposes
app.get('/api/status', (req, res) => {
  res.status(200).json({
    uptime: process.uptime(),
    environment: 'local-development',
    pendingTradesCount: pendingTrades.length,
    tradeHistoryCount: tradeHistory.length,
    version: '0.1.0'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`4g3n7 agent server running on port ${PORT} in local development mode`);
});