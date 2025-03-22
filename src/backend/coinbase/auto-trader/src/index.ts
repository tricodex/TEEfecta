// Auto Trader Server
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import routes, { setAgent } from './api/routes.js';
import { createAgent } from './create-agent.js';
import { createAgentKitAgent } from './create-agentkit-agent.js';
import { LLMProvider } from './create-agent.js';
import { ethers } from 'ethers';
import { AutonomousTrader } from './autonomous-trader.js';
import { Agent } from './agent/index.js';
import { CoordinatedAgent } from './agent/coordination-agent.js';
import { getWalletDB } from './db/wallet-db.js';
import { getWebSocketService } from './services/websocket.js';
import http from 'http';

// Load environment variables
dotenv.config();

// Ensure critical environment variables are set (with defaults for development)
if (!process.env.ENABLE_AGENTKIT) {
  process.env.ENABLE_AGENTKIT = 'true';
  console.log('ENABLE_AGENTKIT not set, defaulting to true');
}

if (!process.env.ENABLE_COLLABORATION) {
  process.env.ENABLE_COLLABORATION = 'true';
  console.log('ENABLE_COLLABORATION not set, defaulting to true');
}

if (!process.env.USE_MOCK_WALLET) {
  process.env.USE_MOCK_WALLET = 'false';
  console.log('USE_MOCK_WALLET not set, defaulting to false');
}

// Enable WebSockets by default
if (!process.env.ENABLE_WEBSOCKETS) {
  process.env.ENABLE_WEBSOCKETS = 'true';
  console.log('ENABLE_WEBSOCKETS not set, defaulting to true');
}

// Ensure Gemini API key is properly set
if (process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
  console.log('GEMINI_API_KEY set from GOOGLE_API_KEY');
}

// Set up Express
const app = express();
const port = parseInt(process.env.PORT || '3222', 10);

// Create HTTP server (needed for WebSocket support)
const server = http.createServer(app);

// Initialize the WebSocket service
const websocketService = getWebSocketService();

// Middleware
app.use(cors());
app.use(express.json());

// Check for running in Docker
const isRunningInDocker = process.env.RUNNING_IN_DOCKER === 'true';
console.log(`Running in Docker: ${isRunningInDocker ? 'Yes' : 'No'}`);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    docker: isRunningInDocker
  });
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

// Function to create a coordinated agent combining both implementations
async function createCoordinatedAgent(
  primaryAgent: Agent,
  agentKitAgent: Agent
): Promise<Agent> {
  // Use the CoordinatedAgent implementation
  return new CoordinatedAgent(primaryAgent, agentKitAgent);
}

// Start server
async function startServer() {
  try {
    console.log('Starting Auto Trader Server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Memory mode: ${process.env.RECALL_MEMORY_MODE || 'persistent'}`);
    
    // Initialize wallet database
    const walletDB = getWalletDB();
    await walletDB.initialize();
    console.log('Wallet database initialized successfully');
    
    // Get configuration from environment
    const preferredLLM = (process.env.PREFERRED_LLM_PROVIDER || 'gemini').toLowerCase() as LLMProvider;
    console.log(`Initializing with preferred LLM provider: ${preferredLLM}`);
    
    if (preferredLLM === 'gemini' && !process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set but Gemini is selected as the LLM provider');
    }
    
    // Get the real wallet address from private key or mnemonic
    let walletAddress = '';
    
    if (process.env.ETHEREUM_PRIVATE_KEY) {
      walletAddress = getWalletAddressFromPrivateKey(process.env.ETHEREUM_PRIVATE_KEY);
      if (walletAddress) {
        console.log(`Using real wallet address from private key: ${walletAddress}`);
      } else {
        console.warn('Failed to get wallet address from private key');
      }
    }
    
    if (!walletAddress && process.env.MNEMONIC_PHRASE) {
      // Create wallet from mnemonic
      try {
        const wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC_PHRASE);
        walletAddress = wallet.address;
        console.log(`Using wallet address from mnemonic: ${walletAddress}`);
      } catch (error) {
        console.warn('Failed to create wallet from mnemonic phrase:', error);
      }
    }
    
    if (!walletAddress) {
      // Create a random wallet as last resort
      const randomWallet = ethers.Wallet.createRandom();
      walletAddress = randomWallet.address;
      console.log(`Using randomly generated wallet address: ${walletAddress}`);
    }
    
    // Check for action providers
    const enableActionProviders = true; // Always enable action providers
    console.log('Action providers are enabled');
    
    // Get AgentKit and Collaboration flags (defaulted to true above)
    const enableAgentKit = process.env.ENABLE_AGENTKIT === 'true';
    const enableCollaboration = process.env.ENABLE_COLLABORATION === 'true';
    
    console.log(`AgentKit enabled: ${enableAgentKit}`);
    console.log(`Collaboration enabled: ${enableCollaboration}`);
    
    // Create the primary agent
    const primaryAgent = await createAgent({
      llmProvider: preferredLLM,
      memoryProvider: 'recall',
      walletAddress: walletAddress,
      enableActionProviders: enableActionProviders
    });
    
    let agent = primaryAgent;
    
    // Create AgentKit agent if enabled
    if (enableAgentKit) {
      console.log('Creating AgentKit-based agent');
      
      try {
        const agentKitAgent = await createAgentKitAgent({
          llmProvider: preferredLLM === 'azure' ? 'azure' : 
                      preferredLLM === 'gemini' ? 'gemini' : 'langchain-openai',
          memoryProvider: 'recall',
          walletAddress: walletAddress,
          enableActionProviders: enableActionProviders,
          enableCollaboration: enableCollaboration,
          mnemonic: process.env.MNEMONIC_PHRASE
        });
        
        // If collaboration is enabled, create a coordinated agent
        if (enableCollaboration) {
          console.log('Creating coordinated agent');
          agent = await createCoordinatedAgent(primaryAgent, agentKitAgent);
        } else {
          // Use AgentKit agent as the main agent
          console.log('Using AgentKit agent as the main agent');
          agent = agentKitAgent;
        }
      } catch (error) {
        console.error('Failed to create AgentKit agent, using primary agent as fallback:', error);
      }
    }
    
    // Initialize API routes
    console.log('Agent set in API routes');
    setAgent(agent);
    app.use('/api', routes);
    
    // Get agent status
    try {
      const status = await agent.getStatus();
      console.log('Agent Status:', status.status);
      console.log('Agent Type:', status.type || 'standard');
      if (status.wallet) {
        console.log('Wallet Address:', status.wallet.address);
      }
    } catch (error) {
      console.error('Error getting agent status:', error);
    }
    
    // Attach WebSocket service to the HTTP server
    websocketService.attachToServer(server);
    
    // Initialize and start the autonomous trader if enabled
    const autonomousTrader = new AutonomousTrader(agent);
    
    // Check if autonomous mode is enabled
    const autonomousModeEnabled = process.env.ENABLE_AUTONOMOUS_MODE === 'true';
    if (autonomousModeEnabled) {
      console.log('Starting autonomous trader in background');
      autonomousTrader.start();
    } else {
      console.log('Autonomous mode is disabled, not starting');
    }
    
    // Start listening with the HTTP server instead of the Express app
    server.listen(port, '0.0.0.0', () => {
      console.log(`Auto Trader API listening on port ${port}`);
      console.log(`Health check available at http://localhost:${port}/health`);
      console.log(`WebSocket available at ws://localhost:${port}/ws`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
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