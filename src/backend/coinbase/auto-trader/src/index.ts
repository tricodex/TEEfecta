// Auto Trader Server
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import routes, { setAgent } from './api/routes.js';
import { createAgent } from './create-agent.js';
import { LLMProvider } from './create-agent.js';
import { ethers } from 'ethers';
import { AutonomousTrader } from './autonomous-trader.js';

// Load environment variables
dotenv.config();

// Set up Express
const app = express();
const port = process.env.PORT || 3300;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', version: '1.0.0' });
});

// Get real wallet address from private key
function getWalletAddressFromPrivateKey(privateKey: string): string {
  try {
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch (error) {
    console.error('Error creating wallet from private key:', error);
    return '';
  }
}

// Start server
async function startServer() {
  console.log('Starting Auto Trader API...');
  
  try {
    // Get configuration from environment
    const preferredLLM = (process.env.PREFERRED_LLM_PROVIDER || 'gemini').toLowerCase() as LLMProvider;
    console.log(`Initializing with preferred LLM provider: ${preferredLLM}`);
    
    // Get the real wallet address from private key if available
    let walletAddress = process.env.MOCK_WALLET_ADDRESS;
    if (process.env.ETHEREUM_PRIVATE_KEY) {
      const realWalletAddress = getWalletAddressFromPrivateKey(process.env.ETHEREUM_PRIVATE_KEY);
      if (realWalletAddress) {
        console.log(`Using real wallet address: ${realWalletAddress}`);
        walletAddress = realWalletAddress;
      } else {
        console.warn('Failed to get wallet address from private key, using mock address');
      }
    } else {
      console.log('No private key provided, using mock wallet address');
    }
    
    // Check for action providers
    const enableActionProviders = process.env.ENABLE_ACTION_PROVIDERS === 'true';
    if (enableActionProviders) {
      console.log('Action providers are enabled');
    }
    
    // Create the agent
    const agent = await createAgent({
      llmProvider: preferredLLM,
      memoryProvider: 'recall',
      walletAddress: walletAddress,
      enableActionProviders: enableActionProviders
    });
    
    // Initialize API routes
    setAgent(agent);
    app.use('/api', routes);
    
    // Get agent status
    try {
      const status = await agent.getStatus();
      console.log('Agent Status:', status.status);
      console.log('LLM Provider:', status.llmProvider);
      console.log('Wallet Address:', status.wallet?.address);
    } catch (error) {
      console.error('Error getting agent status:', error);
    }
    
    // Initialize and start the autonomous trader if enabled
    const autonomousTrader = new AutonomousTrader(agent);
    autonomousTrader.start(); // Will check internally if it's enabled
    
    // Start listening
    app.listen(port, () => {
      console.log(`Auto Trader API listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 