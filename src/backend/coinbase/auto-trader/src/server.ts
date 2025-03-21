// API server implementation
import express from 'express';
import { Agent } from './agent';

/**
 * Creates an Express server with API endpoints for the agent
 * @param agent The initialized trading agent
 * @returns Express application
 */
export function createServer(agent: Agent) {
  const app = express();
  
  // Middleware
  app.use(express.json());
  
  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Agent status endpoint
  app.get('/status', async (req, res) => {
    try {
      console.log('Status requested');
      const status = await agent.getStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting status:', error);
      res.status(500).json({ 
        error: 'Failed to get agent status',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Portfolio analysis endpoint
  app.post('/analyze', async (req, res) => {
    try {
      console.log('Analyze requested with body:', req.body);
      const { portfolio, marketData } = req.body;
      
      if (!portfolio || !marketData) {
        console.warn('Missing required parameters for analysis');
        return res.status(400).json({ 
          error: 'Missing required parameters',
          message: 'Both portfolio and marketData are required'
        });
      }
      
      const analysis = await agent.analyzePortfolio(portfolio, marketData);
      console.log('Analysis completed successfully');
      res.json({ analysis });
    } catch (error) {
      console.error('Analysis failed:', error);
      res.status(500).json({ 
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Execute trade endpoint
  app.post('/trade', async (req, res) => {
    try {
      console.log('Trade requested with body:', req.body);
      const { tradeType, fromAsset, toAsset, amount } = req.body;
      
      if (!tradeType || !fromAsset || !toAsset || !amount) {
        console.warn('Missing required parameters for trade');
        return res.status(400).json({ 
          error: 'Missing required parameters',
          message: 'tradeType, fromAsset, toAsset, and amount are required'
        });
      }
      
      const trade = await agent.executeTrade(tradeType, fromAsset, toAsset, amount);
      console.log('Trade executed successfully');
      res.json({ trade });
    } catch (error) {
      console.error('Trade execution failed:', error);
      res.status(500).json({ 
        error: 'Trade execution failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Reasoning history endpoint
  app.get('/reasoning/:decisionId', async (req, res) => {
    try {
      console.log('Reasoning requested for ID:', req.params.decisionId);
      const { decisionId } = req.params;
      
      if (!decisionId) {
        console.warn('Missing decision ID for reasoning');
        return res.status(400).json({ 
          error: 'Missing required parameter',
          message: 'decisionId is required'
        });
      }
      
      const reasoning = await agent.getReasoningHistory(decisionId);
      
      if (!reasoning) {
        console.warn('No reasoning found for ID:', decisionId);
        return res.status(404).json({ 
          error: 'Reasoning not found',
          message: `No reasoning found for decision ID: ${decisionId}`
        });
      }
      
      console.log('Reasoning retrieved successfully');
      res.json({ reasoning });
    } catch (error) {
      console.error('Error retrieving reasoning:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve reasoning',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  return app;
}