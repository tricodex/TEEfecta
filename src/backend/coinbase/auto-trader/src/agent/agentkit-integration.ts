// AgentKit integration with Privy wallet provider
import { AgentKit, walletActionProvider, erc20ActionProvider } from '@coinbase/agentkit';
import { RecallMemoryManager } from '../services/recall-memory.js';
import { setupLangChain } from './langchain.js';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
config();

// Configure logger
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  warn: (message: string) => console.warn(`[WARN] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`)
};

export interface AgentKitConfig {
  privyAppId: string;
  privyAppSecret: string;
  privyWalletId?: string; 
  privyAuthKey?: string;
  privyAuthKeyId?: string;
  chainId?: string;
  recallPrivateKey?: string;
  recallBucketAlias?: string;
  azureOpenAIApiKey?: string;
  azureOpenAIEndpoint?: string;
  azureOpenAIDeploymentName?: string;
  azureOpenAIApiVersion?: string;
}

/**
 * Initialize AgentKit with Privy wallet provider
 */
export async function setupAgentKit(config: AgentKitConfig) {
  logger.info('Setting up AgentKit with Privy wallet provider');
  
  try {
    // Validate required configuration
    if (!config.privyAppId || !config.privyAppSecret) {
      throw new Error('Privy App ID and App Secret are required');
    }
    
    const chainId = config.chainId || '84532'; // Base Sepolia by default
    
    // Import the PrivyWalletProvider dynamically to avoid circular dependencies
    const { PrivyWalletProvider } = await import('./privy-wallet.js');
    
    // Initialize Privy wallet provider
    logger.info(`Initializing Privy wallet provider with chain ID: ${chainId}`);
    const walletProvider = await PrivyWalletProvider.configureWithWallet({
      appId: config.privyAppId,
      appSecret: config.privyAppSecret,
      chainId,
      walletId: config.privyWalletId,
      authorizationPrivateKey: config.privyAuthKey,
      authorizationKeyId: config.privyAuthKeyId
    });
    
    const walletDetails = await walletProvider.getWalletDetails();
    logger.info(`Wallet initialized with address: ${walletDetails.address}`);
    
    // Set up Azure OpenAI with LangChain if configured
    let llm = null;
    if (config.azureOpenAIApiKey && config.azureOpenAIDeploymentName) {
      logger.info('Initializing Azure OpenAI integration');
      llm = setupLangChain({
        azureOpenAIApiKey: config.azureOpenAIApiKey,
        azureOpenAIEndpoint: config.azureOpenAIEndpoint,
        azureOpenAIApiDeploymentName: config.azureOpenAIDeploymentName,
        azureOpenAIApiVersion: config.azureOpenAIApiVersion
      });
    }
    
    // Set up Recall Network memory manager if configured
    let memoryManager = null;
    if (config.recallPrivateKey) {
      logger.info('Initializing Recall Network memory manager');
      memoryManager = new RecallMemoryManager(
        config.recallPrivateKey,
        config.recallBucketAlias || 'auto-trader-memory',
        'testnet'
      );
    }
    
    // Create action providers array
    const actionProviders = [
      walletActionProvider(),
      erc20ActionProvider()
    ];
    
    // Create AgentKit instance
    logger.info('Creating AgentKit instance with real-world integrations');
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders,
      llm,
      memoryManager
    });
    
    logger.info('AgentKit initialized successfully with real implementations');
    return agentkit;
  } catch (error) {
    logger.error(`Error initializing AgentKit: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Execute a trading strategy using the agent
 */
export async function executeTradingStrategy(agent: AgentKit, strategyName: string, params: any) {
  logger.info(`Executing trading strategy: ${strategyName}`);
  
  try {
    // Generate a unique ID for this strategy execution
    const executionId = uuidv4();
    
    // Execute the strategy with appropriate parameters
    const result = await agent.execute({
      actionId: 'execute_trading_strategy',
      params: {
        strategyName,
        executionId,
        timestamp: new Date().toISOString(),
        ...params
      }
    });
    
    logger.info(`Strategy execution complete: ${executionId}`);
    return {
      success: true,
      executionId,
      result
    };
  } catch (error) {
    logger.error(`Strategy execution failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get wallet details from the CDP Wallet API
 */
export async function getWalletDetails(kit: AgentKit): Promise<any> {
  try {
    console.log('Getting wallet details from CDP API');
    
    const actions = kit.getActions();
    
    // Find get_wallet_details action
    const getWalletDetailsAction = actions.find(a => a.name === 'get_wallet_details');
    if (!getWalletDetailsAction) {
      throw new Error('get_wallet_details action not found');
    }
    
    console.log('Invoking get_wallet_details action');
    const wallet = await getWalletDetailsAction.invoke({});
    
    if (!wallet) {
      throw new Error('Failed to retrieve wallet details');
    }
    
    // Handle both string and object response formats
    let address;
    if (typeof wallet === 'string') {
      address = wallet;
    } else if (typeof wallet === 'object' && wallet !== null) {
      address = wallet.address || wallet.toString();
    } else {
      throw new Error('Invalid wallet details format');
    }
    
    // Get balance if possible
    let balance = '0';
    try {
      const getBalanceAction = actions.find(a => a.name === 'get_balance');
      if (getBalanceAction) {
        balance = await getBalanceAction.invoke({});
      }
    } catch (balanceError) {
      console.warn('Failed to get balance:', balanceError);
    }
    
    // Get token balances if possible
    let tokens = [];
    try {
      const getTokensAction = actions.find(a => a.name === 'get_tokens' || a.name === 'get_token_balances');
      if (getTokensAction) {
        tokens = await getTokensAction.invoke({});
      }
    } catch (tokensError) {
      console.warn('Failed to get token balances:', tokensError);
    }
    
    return {
      address,
      balance,
      tokens,
      network: process.env.NETWORK || 'testnet',
      chain: process.env.CHAIN_ID === '84532' ? 'base-sepolia' : 'ethereum'
    };
  } catch (error) {
    console.error('Error getting wallet details:', error);
    throw error;
  }
}

/**
 * Transfer tokens using AgentKit
 */
export async function transferTokens(agent: AgentKit, to: string, amount: string, tokenAddress?: string) {
  try {
    // If tokenAddress is provided, it's an ERC20 token transfer
    if (tokenAddress) {
      return await agent.execute({
        actionId: 'erc20_transfer',
        params: {
          to,
          amount,
          tokenAddress
        }
      });
    } else {
      // Otherwise, it's a native token transfer
      return await agent.execute({
        actionId: 'transfer',
        params: {
          to,
          amount
        }
      });
    }
  } catch (error) {
    logger.error(`Token transfer failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
} 