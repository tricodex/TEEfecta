// API Routes for Auto Trader
import express, { Request, Response } from 'express';
import { setupAgentKit, executeTradingStrategy, getWalletDetails, transferTokens } from '../agent/agentkit-integration.js';
import { config } from 'dotenv';
import { createMockWalletProvider } from './wallet-mock.js';
import { AgentKit, walletActionProvider, erc20ActionProvider } from '@coinbase/agentkit';

// Load environment variables
config();

// Initialize router
const router = express.Router();

// Store the AgentKit instance
let agentKit: any = null;

/**
 * Initialize the AgentKit instance
 * This is called when the server starts
 */
export async function initializeAgentKit() {
  try {
    // Check if Privy credentials are available
    const privyAppId = process.env.PRIVY_APP_ID;
    const privyAppSecret = process.env.PRIVY_APP_SECRET;
    
    if (!privyAppId || !privyAppSecret) {
      console.warn('Privy credentials not found. Using mock wallet provider for testing.');
      
      // Create a mock wallet provider
      const mockWalletProvider = createMockWalletProvider();
      
      // Create action providers
      const actionProviders = [
        walletActionProvider(),
        erc20ActionProvider()
      ];
      
      // Create AgentKit instance with mock wallet
      agentKit = await AgentKit.from({
        walletProvider: mockWalletProvider,
        actionProviders
      });
      
      console.log('AgentKit initialized with mock wallet provider');
      return true;
    }
    
    // Use real implementation
    // Configure AgentKit with environment variables
    agentKit = await setupAgentKit({
      privyAppId: process.env.PRIVY_APP_ID || '',
      privyAppSecret: process.env.PRIVY_APP_SECRET || '',
      privyWalletId: process.env.PRIVY_WALLET_ID,
      privyAuthKey: process.env.PRIVY_AUTH_KEY,
      privyAuthKeyId: process.env.PRIVY_AUTH_KEY_ID,
      chainId: process.env.CHAIN_ID || '84532',
      recallPrivateKey: process.env.RECALL_PRIVATE_KEY,
      recallBucketAlias: process.env.RECALL_BUCKET_ALIAS,
      azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
      azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
      azureOpenAIDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION
    });
    
    console.log('AgentKit initialized successfully with real providers');
    return true;
  } catch (error) {
    console.error('Failed to initialize AgentKit:', error);
    
    // Fallback to mock implementation
    console.warn('Falling back to mock wallet provider');
    
    try {
      // Create a mock wallet provider
      const mockWalletProvider = createMockWalletProvider();
      
      // Create action providers
      const actionProviders = [
        walletActionProvider(),
        erc20ActionProvider()
      ];
      
      // Create AgentKit instance with mock wallet
      agentKit = await AgentKit.from({
        walletProvider: mockWalletProvider,
        actionProviders
      });
      
      console.log('AgentKit initialized with mock wallet provider');
      return true;
    } catch (fallbackError) {
      console.error('Failed to initialize mock wallet:', fallbackError);
      return false;
    }
  }
}

/**
 * Middleware to check if AgentKit is initialized
 */
function checkAgentKitInitialized(req: Request, res: Response, next: Function) {
  if (!agentKit) {
    return res.status(503).json({
      success: false,
      error: 'AgentKit not initialized. Please try again later.'
    });
  }
  next();
}

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    agentKitInitialized: !!agentKit,
    version: '1.0.0'
  });
});

/**
 * Get wallet details
 */
router.get('/wallet', checkAgentKitInitialized, async (req: Request, res: Response) => {
  try {
    // For a mock implementation, directly get wallet information
    if (agentKit && agentKit.walletProvider) {
      const address = agentKit.walletProvider.getAddress();
      const chainId = agentKit.walletProvider.getChainId();
      try {
        const balance = await agentKit.walletProvider.getBalance();
        
        res.json({
          success: true,
          data: {
            address,
            chainId,
            balance
          }
        });
        return;
      } catch (balanceError) {
        console.error('Error getting balance:', balanceError);
      }
    }
    
    // Fallback to the AgentKit method
    try {
      const result = await getWalletDetails(agentKit);
      res.json({
        success: true,
        data: result
      });
    } catch (agentKitError) {
      throw agentKitError;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Execute a trading strategy
 */
router.post('/strategy/execute', checkAgentKitInitialized, async (req: Request, res: Response) => {
  try {
    const { strategyName, params } = req.body;
    
    if (!strategyName) {
      return res.status(400).json({
        success: false,
        error: 'Strategy name is required'
      });
    }
    
    const result = await executeTradingStrategy(agentKit, strategyName, params || {});
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Transfer tokens
 */
router.post('/transfer', checkAgentKitInitialized, async (req: Request, res: Response) => {
  try {
    const { to, amount, tokenAddress } = req.body;
    
    if (!to || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Recipient address and amount are required'
      });
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient address'
      });
    }
    
    // Validate tokenAddress if provided
    if (tokenAddress && !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token address'
      });
    }
    
    // Use the wallet provider directly
    if (agentKit && agentKit.walletProvider) {
      try {
        const result = await agentKit.walletProvider.sendTransaction({
          to,
          value: amount,
          data: '0x'
        });
        
        res.json({
          success: true,
          data: {
            transactionHash: result.transactionHash
          }
        });
        return;
      } catch (walletError) {
        console.error('Error sending transaction via wallet provider:', walletError);
        throw walletError;
      }
    } else {
      throw new Error('Wallet provider not initialized');
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 