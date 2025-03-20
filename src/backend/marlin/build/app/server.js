/**
 * 4g3n7 - Secure Trading Agent
 * 
 * Core application server that runs inside the Marlin Oyster CVM.
 * This server provides a secure API for trading operations while
 * maintaining data confidentiality through the TEE.
 */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store the enclave identity key path
const ENCLAVE_ID_PUBLIC_KEY_PATH = '/app/id.pub';

// Read the enclave identity - this is used for authentication and secure communication
let enclavePublicKey;
try {
  enclavePublicKey = fs.readFileSync(ENCLAVE_ID_PUBLIC_KEY_PATH);
  console.log('Loaded enclave public key');
} catch (error) {
  console.error('Failed to load enclave public key:', error);
  process.exit(1);
}

// Initialize in-memory storage for the demo
const tradeHistory = [];
const pendingTrades = [];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    enclave: true
  });
});

// Get enclave public key endpoint
app.get('/enclave/public-key', (req, res) => {
  res.status(200).json({
    publicKey: enclavePublicKey.toString('hex')
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
  
  // Log securely within the enclave
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

// Start the server
app.listen(PORT, () => {
  console.log(`4g3n7 agent server running on port ${PORT} within CVM`);
});