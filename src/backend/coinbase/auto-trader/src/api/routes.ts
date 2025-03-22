// API Routes for Auto Trader
import express, { Request, Response, Application } from 'express';
import { setupAgentKit, executeTradingStrategy, getWalletDetails, transferTokens } from '../agent/agentkit-integration.js';
import { config } from 'dotenv';
import { createMockWalletProvider } from './wallet-mock.js';
import { AgentKit } from '@coinbase/agentkit';
import { Agent } from '../agent/index.js'; // Import Agent interface
import { getAgentQueueService, TaskStatus, TaskType, TaskPriority } from '../services/agent-queue.js';
import { getConversationTracker, MessageType } from '../services/conversation-tracker.js';

// Load environment variables
config();

// Initialize router
const router = express.Router();

// Store the AgentKit instance
let agentKit: AgentKit | null = null;

// Store the Agent instance
let agent: Agent | null = null;

// Get queue and conversation services
const queueService = getAgentQueueService();
const conversationTracker = getConversationTracker();

/**
 * Set the Agent instance
 * @param agentInstance The agent instance
 */
export function setAgent(agentInstance: Agent) {
  agent = agentInstance;
  console.log('Agent set in API routes');
}

// Add API health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', version: '1.0.0', message: 'API routes are working' });
});

// Add agent status endpoint
router.get('/agent/status', async (req: Request, res: Response) => {
  if (!agent) {
    return res.status(500).json({ error: 'Agent not initialized' });
  }
  
  try {
    const agentStatus = await agent.getStatus();
    return res.json({
      success: true,
      status: 'operational',
      agent: {
        type: process.env.ENABLE_AGENTKIT === 'true' 
          ? (process.env.ENABLE_COLLABORATION === 'true' ? 'coordinated' : 'agentkit')
          : 'traditional',
        provider: process.env.PREFERRED_LLM_PROVIDER || 'gemini',
        wallet: agentStatus.wallet 
      }
    });
  } catch (error) {
    console.error('Error getting agent status:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to get agent status',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Initialize API routes with an Express app and agent
 * @param app Express application
 * @param agentInstance Agent instance
 */
export function initAPIRoutes(app: Application, agentInstance: Agent) {
  // Set the agent
  setAgent(agentInstance);
  
  // Mount the router
  app.use('/api', router);
  
  console.log('API routes initialized');
  
  // For compatibility, also initialize AgentKit with a mock provider if not already set
  if (!agentKit) {
    console.warn('AgentKit not initialized - using mock provider');
    const mockProvider = createMockWalletProvider('0x1234567890123456789012345678901234567890');
    agentKit = mockProvider as unknown as AgentKit;
  }
}

/**
 * Initialize the API with AgentKit
 */
export async function initAPIWithAgentKit() {
  try {
    // Set up the AgentKit instance with CDP
    const cdpApiKeyName = process.env.COINBASE_CDP_KEY;
    const cdpApiKeyPrivateKey = process.env.COINBASE_CDP_SECRET;
    const recallPrivateKey = process.env.RECALL_PRIVATE_KEY;
    
    // Check if required environment variables are available
    if (!cdpApiKeyName || !cdpApiKeyPrivateKey) {
      console.warn('Missing required environment variables for AgentKit integration');
      console.warn('Using mock CDP provider...');
      
      // Create mock wallet provider
      const mockProvider = createMockWalletProvider('0x1234567890123456789012345678901234567890');
      agentKit = mockProvider as unknown as AgentKit;
      return;
    }
    
    console.log('Initializing AgentKit with CDP API');
    agentKit = await setupAgentKit({
      privyAppId: cdpApiKeyName, 
      privyAppSecret: cdpApiKeyPrivateKey,
      chainId: process.env.CHAIN_ID || '84532',
      recallPrivateKey: recallPrivateKey || '',
      recallBucketAlias: process.env.RECALL_BUCKET_ALIAS || 'auto-trader-memory',
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIEndpoint: process.env.AZURE_OPENAI_API_INSTANCE_NAME ? 
        `https://${process.env.AZURE_OPENAI_API_INSTANCE_NAME}.openai.azure.com` : undefined,
      azureOpenAIDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION
    });
    
    console.log('AgentKit initialized with CDP API');
  } catch (error) {
    console.error('Failed to initialize AgentKit:', error);
    
    // Create mock wallet provider as fallback
    console.warn('Using mock CDP provider as fallback...');
    const mockProvider = createMockWalletProvider('0x1234567890123456789012345678901234567890');
    agentKit = mockProvider as unknown as AgentKit;
  }
}

// Middleware to check if the wallet provider is initialized
const checkAgentKitInitialized = (req: Request, res: Response, next: express.NextFunction) => {
  if (!agentKit) {
    return res.status(500).json({ 
      error: 'AgentKit not initialized',
      message: 'Please initialize the API with AgentKit first'
    });
  }
  next();
};

/**
 * Get agent wallet information
 * @route GET /api/agent/wallet
 */
router.get('/agent/wallet', async (req: Request, res: Response) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Agent not initialized' });
    }
    
    const agentStatus = await agent.getStatus();
    
    if (!agentStatus.wallet) {
      return res.status(404).json({ error: 'Wallet information not available' });
    }
    
    return res.json({ 
      success: true, 
      wallet: {
        address: agentStatus.wallet.address,
        network: agentStatus.wallet.network || 'testnet',
        chain: agentStatus.wallet.chain || 'base-sepolia',
        isReal: agentStatus.wallet.address !== process.env.MOCK_WALLET_ADDRESS
      }
    });
  } catch (error) {
    console.error(`Error getting agent wallet: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Failed to get agent wallet', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Get wallet details
 * @route GET /api/wallet
 */
router.get('/wallet', async (req: Request, res: Response) => {
  try {
    // First try to get wallet from agent
    if (agent) {
      try {
        const agentStatus = await agent.getStatus();
        
        if (agentStatus.wallet) {
          return res.json({ 
            success: true, 
            source: 'agent',
            wallet: {
              address: agentStatus.wallet.address,
              network: agentStatus.wallet.network || 'testnet',
              chain: agentStatus.wallet.chain || 'base-sepolia'
            }
          });
        }
      } catch (error) {
        console.warn('Error getting wallet from agent, falling back to AgentKit:', error);
      }
    }
    
    // Fall back to AgentKit if agent wallet not available
    if (agentKit) {
      try {
        const walletDetails = await getWalletDetails(agentKit);
        return res.json({ 
          success: true, 
          source: 'agentkit',
          wallet: walletDetails 
        });
      } catch (error) {
        console.error(`Error getting wallet details from AgentKit: ${error instanceof Error ? error.message : String(error)}`);
        return res.status(500).json({ 
          error: 'Failed to get wallet details', 
          details: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    // No wallet provider available
    return res.status(404).json({ 
      error: 'No wallet provider available'
    });
  } catch (error) {
    console.error(`Error getting wallet details: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Failed to get wallet details', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Transfer tokens
 * @route POST /api/transfer
 */
router.post('/transfer', checkAgentKitInitialized, async (req: Request, res: Response) => {
  try {
    const { token, to, amount } = req.body;
    
    if (!token || !to || !amount) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'token, to, and amount are required' 
      });
    }
    
    // Validate address
    if (!to.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ 
        error: 'Invalid address', 
        message: 'to address must be a valid Ethereum address' 
      });
    }
    
    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'amount must be a positive number'
      });
    }
    
    console.log(`Transferring ${amountNum} ${token} to ${to}`);
    const result = await transferTokens(agentKit!, to, amountNum.toString(), token);
    
    return res.json({ success: true, result });
  } catch (error) {
    console.error(`Error transferring tokens: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Token transfer failed', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Execute a trading strategy
 * @route POST /api/strategy/execute
 */
router.post('/strategy/execute', async (req: Request, res: Response) => {
  try {
    if (!agentKit) {
      return res.status(500).json({ error: 'AgentKit not initialized' });
    }
    
    const { strategyName, params } = req.body;
    
    if (!strategyName) {
      return res.status(400).json({ error: 'Strategy name is required' });
    }
    
    console.log(`Executing trading strategy: ${strategyName}`);
    const result = await executeTradingStrategy(agentKit, strategyName, params || {});
    
    return res.json({ success: true, result });
  } catch (error) {
    console.error(`Error executing strategy: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Strategy execution failed', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Execute a specific trade
 * @route POST /api/trade
 */
router.post('/trade', async (req: Request, res: Response) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Agent not initialized' });
    }
    
    const { tradeType, fromAsset, toAsset, amount } = req.body;
    
    if (!tradeType || !fromAsset || !toAsset || !amount) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'tradeType, fromAsset, toAsset, and amount are required' 
      });
    }
    
    // Validate trade type
    const validTradeTypes = ['swap', 'wrap', 'unwrap', 'lend', 'supply', 'borrow', 'transfer'];
    if (!validTradeTypes.includes(tradeType.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid trade type',
        message: `Trade type must be one of: ${validTradeTypes.join(', ')}`
      });
    }
    
    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }
    
    console.log(`Executing trade: ${tradeType} ${amountNum} ${fromAsset} to ${toAsset}`);
    
    // Call the agent to execute the trade
    const trade = await agent.executeTrade(tradeType, fromAsset, toAsset, amountNum);
    
    if (trade.status === 'failed') {
      return res.status(400).json({ 
        error: 'Trade execution failed', 
        details: trade.error || 'Unknown error' 
      });
    }
    
    return res.json({ success: true, trade });
  } catch (error) {
    console.error(`Error executing trade: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Trade execution failed', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Get token price information 
 * @route GET /api/token-price/:symbol
 */
router.get('/token-price/:symbol', async (req: Request, res: Response) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Agent not initialized' });
    }
    
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Token symbol is required' });
    }
    
    // Get market data - we'll use the existing analyzePortfolio method 
    // with minimal data to get current prices
    const marketData = {
      [symbol]: { amount: 0, price: 0 }
    };
    
    const analysisResult = await agent.analyzePortfolio({ assets: {} }, marketData);
    
    return res.json({ 
      success: true, 
      symbol,
      price: analysisResult?.prices?.[symbol] || "Price not available"
    });
  } catch (error) {
    console.error(`Error getting token price: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Failed to get token price', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Get memory entry by ID
 * @route GET /api/memory/:id
 */
router.get('/memory/:id', async (req: Request, res: Response) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Agent not initialized' });
    }
    
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Memory ID is required' });
    }
    
    // Use the agent's getReasoningHistory method to retrieve memory
    const memory = await agent.getReasoningHistory(id);
    
    if (!memory || memory.error === 'Not found' || memory.status === 'not_found') {
      return res.status(404).json({ 
        error: 'Memory not found', 
        id 
      });
    }
    
    return res.json({ 
      success: true,
      memory
    });
  } catch (error) {
    console.error(`Error retrieving memory: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Failed to retrieve memory', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Get memory entries by type
 * @route GET /api/memories/:type
 */
router.get('/memories/:type', async (req: Request, res: Response) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Agent not initialized' });
    }
    
    const { type } = req.params;
    
    if (!type) {
      return res.status(400).json({ error: 'Memory type is required' });
    }
    
    // Valid memory types - update to match actual types used in the application
    const validTypes = ['portfolio-analysis', 'trade_analysis', 'trade_execution', 'error', 'web_search'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid memory type', 
        message: `Type must be one of: ${validTypes.join(', ')}`,
        requestedType: type
      });
    }
    
    // Get limit from query params, default to 10
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get memory manager from agent
    const memoryManager = agent.getMemoryManager();
    
    if (!memoryManager) {
      return res.status(500).json({ error: 'Memory manager not available' });
    }
    
    const memories = await memoryManager.query(type);
    
    // Sort by timestamp (newest first) and limit results
    const sortedMemories = memories
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
    
    return res.json({ 
      success: true,
      type,
      count: sortedMemories.length,
      memories: sortedMemories
    });
  } catch (error) {
    console.error(`Error retrieving memories of type ${req.params.type}: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Failed to retrieve memories', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Get current wallet portfolio
 * @route GET /api/portfolio
 */
router.get('/portfolio', async (req: Request, res: Response) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Agent not initialized' });
    }
    
    // Check if wallet is initialized
    if (!agent.getWallet || typeof agent.getWallet !== 'function') {
      return res.status(500).json({ error: 'Wallet functionality not available' });
    }
    
    const wallet = agent.getWallet();
    
    if (!wallet) {
      return res.status(500).json({ error: 'Wallet not initialized' });
    }
    
    // Get wallet address
    const address = wallet.getAddress ? wallet.getAddress() : null;
    
    if (!address) {
      return res.status(500).json({ error: 'Wallet address not available' });
    }
    
    // Get token balances - this is a simplified implementation
    // In a real application, you would fetch actual token balances from the blockchain
    const portfolio = {
      address,
      network: wallet.network || 'testnet',
      chain: wallet.chain || 'base-sepolia',
      assets: {
        // Placeholder for real token balances
        "ETH": { amount: 0.5, valueUSD: 1500 },
        "USDC": { amount: 1000, valueUSD: 1000 }
      },
      totalValueUSD: 2500,
      updated: new Date().toISOString()
    };
    
    return res.json({
      success: true,
      portfolio
    });
  } catch (error) {
    console.error(`Error getting portfolio: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Failed to get portfolio', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

/**
 * Analyze a portfolio with current market data
 * @route POST /api/analyze
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    if (!agent) {
      return res.status(500).json({ error: 'Agent not initialized' });
    }
    
    const { portfolio, marketData } = req.body;
    
    if (!portfolio) {
      return res.status(400).json({ error: 'Portfolio data is required' });
    }
    
    // Use default market data if not provided
    const marketDataToUse = marketData || {
      "ETH": { "price": 3000, "change24h": 0 },
      "USDC": { "price": 1, "change24h": 0 },
      "BTC": { "price": 60000, "change24h": 0 }
    };
    
    // Call the agent's analyzePortfolio method
    const analysis = await agent.analyzePortfolio(portfolio, marketDataToUse);
    
    return res.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error analyzing portfolio: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ 
      error: 'Failed to analyze portfolio', 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Queue Management Routes

/**
 * Get all tasks in the queue
 */
router.get('/queue', (req: Request, res: Response) => {
  try {
    const tasks = queueService.getTasks();
    
    // Format tasks for JSON response
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      type: task.type,
      agentId: task.agentId,
      priority: task.priority,
      status: task.status,
      data: task.data,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt.toISOString(),
      startedAt: task.startedAt ? task.startedAt.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      allowFrontendIntervention: task.allowFrontendIntervention,
      frontendInterventionTimeout: task.frontendInterventionTimeout,
      frontendInterventionDeadline: task.frontendInterventionDeadline ? 
        task.frontendInterventionDeadline.toISOString() : null,
      // Convert context Map to object
      context: task.context ? Object.fromEntries(task.context) : {}
    }));
    
    return res.json({
      success: true,
      tasks: formattedTasks
    });
  } catch (error) {
    console.error('Error getting queue tasks:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to get queue tasks',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get a specific task by ID
 */
router.get('/queue/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = queueService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `No task found with ID: ${taskId}`
      });
    }
    
    // Format task for JSON response
    const formattedTask = {
      id: task.id,
      type: task.type,
      agentId: task.agentId,
      priority: task.priority,
      status: task.status,
      data: task.data,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt.toISOString(),
      startedAt: task.startedAt ? task.startedAt.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      allowFrontendIntervention: task.allowFrontendIntervention,
      frontendInterventionTimeout: task.frontendInterventionTimeout,
      frontendInterventionDeadline: task.frontendInterventionDeadline ? 
        task.frontendInterventionDeadline.toISOString() : null,
      // Convert context Map to object
      context: task.context ? Object.fromEntries(task.context) : {}
    };
    
    return res.json({
      success: true,
      task: formattedTask
    });
  } catch (error) {
    console.error('Error getting task:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to get task',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Provide frontend response to a waiting task
 */
router.post('/queue/:taskId/response', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { response } = req.body;
    
    if (!response) {
      return res.status(400).json({
        success: false,
        error: 'Missing response',
        message: 'Response data is required'
      });
    }
    
    const task = queueService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `No task found with ID: ${taskId}`
      });
    }
    
    if (task.status !== TaskStatus.WAITING_FOR_FRONTEND) {
      return res.status(400).json({
        success: false,
        error: 'Task not waiting for frontend',
        message: `Task is in ${task.status} status, not waiting for frontend`
      });
    }
    
    const success = queueService.provideFrontendResponse(taskId, response);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to provide response',
        message: 'An error occurred while providing frontend response'
      });
    }
    
    return res.json({
      success: true,
      message: 'Response provided successfully',
      taskId
    });
  } catch (error) {
    console.error('Error providing task response:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to provide task response',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Cancel a task in the queue
 */
router.delete('/queue/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    const task = queueService.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: `No task found with ID: ${taskId}`
      });
    }
    
    const success = queueService.cancelTask(taskId);
    
    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel task',
        message: `Task is in ${task.status} status and cannot be cancelled`
      });
    }
    
    return res.json({
      success: true,
      message: 'Task cancelled successfully',
      taskId
    });
  } catch (error) {
    console.error('Error cancelling task:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to cancel task',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Create a new task manually
 */
router.post('/queue', (req: Request, res: Response) => {
  try {
    const { type, agentId, data, priority, allowFrontendIntervention, frontendInterventionTimeout } = req.body;
    
    if (!type || !agentId || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'type, agentId, and data are required'
      });
    }
    
    // Check if type is valid
    if (!Object.values(TaskType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task type',
        message: `Type must be one of: ${Object.values(TaskType).join(', ')}`
      });
    }
    
    const taskPriority = priority !== undefined ? 
      (typeof priority === 'number' ? priority : TaskPriority.NORMAL) : 
      TaskPriority.NORMAL;
    
    const taskId = queueService.addTask(
      type,
      agentId,
      data,
      taskPriority,
      allowFrontendIntervention === true,
      frontendInterventionTimeout || undefined
    );
    
    return res.json({
      success: true,
      message: 'Task created successfully',
      taskId
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to create task',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Conversation Management Routes

/**
 * Get all conversations
 */
router.get('/conversations', (req: Request, res: Response) => {
  try {
    const conversations = conversationTracker.getAllConversations();
    
    // Format conversations for JSON response (convert Maps to objects)
    const formattedConversations = conversations.map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      agentIds: conversation.agentIds,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: conversation.messages.length,
      metadata: conversation.metadata || {}
    }));
    
    return res.json({
      success: true,
      conversations: formattedConversations
    });
  } catch (error) {
    console.error('Error getting conversations:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to get conversations',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get a specific conversation by ID
 */
router.get('/conversations/:conversationId', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const conversation = conversationTracker.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        message: `No conversation found with ID: ${conversationId}`
      });
    }
    
    // Format conversation for JSON response (convert Maps to objects)
    const formattedConversation = {
      id: conversation.id,
      title: conversation.title,
      agentIds: conversation.agentIds,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      metadata: conversation.metadata || {}
    };
    
    return res.json({
      success: true,
      conversation: formattedConversation
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to get conversation',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get messages in a conversation
 */
router.get('/conversations/:conversationId/messages', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { type, sender, limit, offset } = req.query;
    
    let messages = [];
    
    // Handle filtering by type or sender if provided
    if (type && typeof type === 'string') {
      if (!Object.values(MessageType).includes(type as MessageType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid message type',
          message: `Type must be one of: ${Object.values(MessageType).join(', ')}`
        });
      }
      messages = conversationTracker.getMessagesByType(conversationId, type as MessageType);
    } else if (sender && typeof sender === 'string') {
      messages = conversationTracker.getMessagesBySender(conversationId, sender);
    } else {
      messages = conversationTracker.getMessages(conversationId);
    }
    
    // Apply pagination if specified
    const offsetNum = offset ? parseInt(offset as string, 10) : 0;
    const limitNum = limit ? parseInt(limit as string, 10) : messages.length;
    
    const paginatedMessages = messages.slice(offsetNum, offsetNum + limitNum);
    
    // Format messages for JSON response
    const formattedMessages = paginatedMessages.map(message => ({
      id: message.id,
      conversationId: message.conversationId,
      type: message.type,
      sender: message.sender,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      metadata: message.metadata || {},
      parentMessageId: message.parentMessageId
    }));
    
    return res.json({
      success: true,
      messages: formattedMessages,
      total: messages.length,
      offset: offsetNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to get conversation messages',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Create a new conversation
 */
router.post('/conversations', (req: Request, res: Response) => {
  try {
    const { title, agentIds, metadata } = req.body;
    
    if (!title || !agentIds || !Array.isArray(agentIds)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'title and agentIds (array) are required'
      });
    }
    
    const conversationId = conversationTracker.createConversation(
      title,
      agentIds,
      metadata
    );
    
    return res.json({
      success: true,
      message: 'Conversation created successfully',
      conversationId
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to create conversation',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Add a message to a conversation
 */
router.post('/conversations/:conversationId/messages', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { type, sender, content, metadata, parentMessageId } = req.body;
    
    if (!type || !sender || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'type, sender, and content are required'
      });
    }
    
    // Check if type is valid
    if (!Object.values(MessageType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message type',
        message: `Type must be one of: ${Object.values(MessageType).join(', ')}`
      });
    }
    
    const messageId = conversationTracker.addMessage(
      conversationId,
      type,
      sender,
      content,
      metadata,
      parentMessageId
    );
    
    if (!messageId) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        message: `No conversation found with ID: ${conversationId}`
      });
    }
    
    return res.json({
      success: true,
      message: 'Message added successfully',
      messageId
    });
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to add message to conversation',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export router
export default router; 