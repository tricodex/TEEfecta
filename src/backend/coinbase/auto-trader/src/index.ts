// Auto Trader Server
import express from 'express';
import apiRoutes, { initializeAgentKit } from './api/routes.js';
import { config } from 'dotenv';
import { verifyAzureOpenAIConnection } from './services/azure-openai.js';

// Load environment variables
config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3200;

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic routes
app.get('/', (req, res) => {
  res.json({
    name: 'Coinbase Auto Trader',
    version: '1.0.0',
    status: 'running'
  });
});

// API routes
app.use('/api', apiRoutes);

// Start the server
async function startServer() {
  console.log('Starting Auto Trader server...');
  
  try {
    // Verify Azure OpenAI connection
    console.log('Verifying Azure OpenAI connection...');
    const azureConnected = await verifyAzureOpenAIConnection();
    console.log(`Azure OpenAI connection: ${azureConnected ? 'SUCCESS' : 'FAILED'}`);
    
    // Initialize AgentKit
    console.log('Initializing AgentKit...');
    const agentKitInitialized = await initializeAgentKit();
    console.log(`AgentKit initialization: ${agentKitInitialized ? 'SUCCESS' : 'FAILED'}`);
    
    // Start the server even if some services fail
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║           Coinbase Auto Trader Server Running            ║
║                                                          ║
║  PORT:              ${PORT.toString().padEnd(34)}║
║  Azure OpenAI:      ${(azureConnected ? 'Connected' : 'Failed').padEnd(34)}║
║  AgentKit:          ${(agentKitInitialized ? 'Initialized' : 'Failed').padEnd(34)}║
║                                                          ║
║  API Endpoints:                                          ║
║  - GET  /api/health                                      ║
║  - GET  /api/wallet                                      ║
║  - POST /api/strategy/execute                            ║
║  - POST /api/transfer                                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('Uncaught error in server startup:', error);
  process.exit(1);
}); 