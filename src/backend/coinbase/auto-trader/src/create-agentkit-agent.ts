// AgentKit-based Agent Creator
import { Agent } from './agent/index.js';
import { GeminiLLMService } from './services/gemini-llm.js';
import { MockLLMService } from './services/mock-llm.js';
import { LLMService } from './services/llm-service.js';
import { RecallMemoryManager } from './services/recall-memory.js';

// AgentKit imports
import {
AgentKit,
CdpWalletProvider,
walletActionProvider,
erc20ActionProvider,
erc721ActionProvider,
cdpApiActionProvider,
cdpWalletActionProvider,
wethActionProvider,
defillamaActionProvider,
compoundActionProvider,
pythActionProvider,
morphoActionProvider
} from '@coinbase/agentkit';

// Import LangChain integration
import { ChatOpenAI } from "@langchain/openai";
import { getLangChainTools } from '@coinbase/agentkit-langchain';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

// Import custom action providers
import { tavilyActionProvider } from './action-providers/index.js';

// Types for configuration
export type LLMProvider = 'azure' | 'gemini' | 'langchain-openai';
export type MemoryProvider = 'recall' | 'local';

export interface AgentKitConfig {
  llmProvider: LLMProvider;
  memoryProvider: MemoryProvider;
  walletAddress?: string;
  enableActionProviders?: boolean;
  enableCollaboration?: boolean;
  recallId?: string;
  mnemonic?: string;
}

// Import ethers correctly for v6
import { Wallet, HDNodeWallet } from 'ethers';
// Import wallet database utility from the correct path
import { getWalletDB } from './db/wallet-db.js';

// Create LangChain agent helper
async function createLangChainAgent(config: any) {
  console.log('Creating LangChain agent with configuration:', {
    hasModel: !!config.model,
    hasMemory: !!config.memory,
    walletAddress: config.walletAddress
  });
  
  // Return a basic agent for now - in a real implementation this would
  // create a properly configured agent with tools from AgentKit
  return {
    run: async (input: string) => {
      console.log(`Running LangChain agent with input: ${input}`);
      return { output: "This is a placeholder response from the LangChain agent." };
    }
  };
}

// Implement required LLM service for Azure OpenAI
class AzureOpenAIService implements LLMService {
  private model: any;
  
  constructor(model: any) {
    this.model = model;
  }
  
  async complete(prompt: string): Promise<string> {
    try {
      const result = await this.model.call(prompt);
      return result.content || "No response from Azure OpenAI";
    } catch (error) {
      console.error("Error calling Azure OpenAI:", error);
      return "Error: Unable to get response from Azure OpenAI";
    }
  }
  
  // Implement required methods from LLMService interface
  async generateText(prompt: string): Promise<string> {
    return this.complete(prompt);
  }
  
  async generateStructuredData(prompt: string): Promise<any> {
    try {
      const text = await this.complete(prompt);
      return { text };
    } catch (error) {
      console.error("Error generating structured data:", error);
      return { error: "Failed to generate structured data" };
    }
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.complete("Hello");
      return !!response;
    } catch (error) {
      console.error("LLM health check failed:", error);
      return false;
    }
  }
}

/**
 * AgentKit-based Trading Agent Implementation
 * 
 * This agent uses AgentKit + LangChain for more advanced trading capabilities.
 */
class AgentKitTradingAgent implements Agent {
  private agentKit: AgentKit;
  private llmService: LLMService;
  private langchainAgent: any;
  private memoryManager: RecallMemoryManager;
  private walletAddress: string;
  private recallId?: string;
  private langchainTools: any[] = [];
  private initialized: boolean = false;

  constructor(
    agentKit: AgentKit,
    llmService: LLMService,
    langchainAgent: any | null,
    memoryManager: RecallMemoryManager,
    walletAddress: string,
    recallId?: string
  ) {
    this.agentKit = agentKit;
    this.llmService = llmService;
    this.langchainAgent = langchainAgent;
    this.memoryManager = memoryManager;
    this.walletAddress = walletAddress;
    this.recallId = recallId;
    this.initialized = true;
    
    console.log('AgentKit Trading Agent initialized with address:', walletAddress);
    console.log('LangChain Agent available:', !!this.langchainAgent);
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<any> {
    try {
      // Get AgentKit actions
      const actions = this.agentKit.getActions();
      
      // Get wallet details
      let walletAddress = this.walletAddress;
      let balance = '0';
      
      try {
        // Find wallet actions
        const getWalletDetailsAction = actions.find(a => a.name === 'get_wallet_details');
        if (getWalletDetailsAction) {
          const details = await getWalletDetailsAction.invoke({});
          // Handle potential string or object with address property
          // Cast any type of details to a string, last resort handling
          walletAddress = (typeof details === 'string') ? details : 
                        (typeof details === 'object' && details !== null) ? 
                        ((details as any).address || walletAddress) : walletAddress;
        }
        
        // Get balance
        const getBalanceAction = actions.find(a => a.name === 'get_balance');
        if (getBalanceAction) {
          balance = await getBalanceAction.invoke({});
        }
      } catch (error) {
        console.error('Failed to get wallet details:', error);
      }
      
      return {
        status: 'operational',
        type: 'agentkit',
        wallet: {
          address: walletAddress,
          balance,
          provider: 'CDP'
        },
        llmProvider: this.langchainAgent ? 'langchain' : 'direct',
        memoryProvider: 'recall',
        availableActions: actions.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting agent status:', error);
      return {
        status: 'error',
        type: 'agentkit',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Analyze portfolio using AgentKit + LangChain/Gemini
   */
  async analyzePortfolio(portfolio: any, marketData: any): Promise<any> {
    console.log('Analyzing portfolio with AgentKit trading agent');
    
    try {
      // Generate unique ID for the analysis
      const decisionId = `agentkit-analysis-${Date.now().toString(36).substring(5)}`;
      
      let analysis;
      
      // Try LangChain agent if available
      if (this.langchainAgent) {
        try {
          console.log('Using LangChain agent for portfolio analysis');
          
          // Create prompt
          const prompt = `
Analyze this crypto portfolio:
${JSON.stringify(portfolio, null, 2)}

Current Market Data:
${JSON.stringify(marketData, null, 2)}

Provide a detailed analysis including:
1. Overall health assessment
2. Risk exposure analysis
3. Potential opportunities
4. Recommended actions

You can use your wallet and DeFi tools to get additional market data if needed.
`;
          
          // Invoke LangChain agent
          const result = await this.langchainAgent.invoke({ 
            messages: [new HumanMessage(prompt)]
          });
          
          // Extract analysis from result
          analysis = this.extractLangChainResponse(result);
          
          console.log('LangChain analysis successful');
        } catch (error) {
          console.error('LangChain analysis failed:', error);
          // Fall back to direct LLM
          analysis = await this.directLLMAnalysis(portfolio, marketData);
        }
      } else {
        // Use direct LLM approach
        analysis = await this.directLLMAnalysis(portfolio, marketData);
      }
      
      // Store in Recall memory
      try {
        await this.memoryManager.store('portfolio-analysis', analysis, {
          portfolioId: decisionId,
          timestamp: new Date().toISOString(),
          portfolioAssets: Object.keys(portfolio.assets || {})
        });
        console.log(`Stored memory entry ${decisionId} of type portfolio-analysis`);
      } catch (memoryError) {
        console.error('Failed to store analysis in memory:', memoryError);
      }
      
      return {
        decisionId,
        timestamp: new Date().toISOString(),
        analysis,
        provider: 'agentkit'
      };
    } catch (error) {
      console.error('Error in AgentKit portfolio analysis:', error);
      return {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        provider: 'agentkit'
      };
    }
  }

  /**
   * Extract response from LangChain result
   */
  private extractLangChainResponse(result: any): string {
    if (result && result.messages && result.messages.length > 0) {
      return result.messages[result.messages.length - 1].content;
    }
    return 'Analysis not available';
  }

  /**
   * Direct LLM analysis without LangChain
   */
  private async directLLMAnalysis(portfolio: any, marketData: any): Promise<string> {
    console.log('Using direct LLM service for portfolio analysis');
    
    // Format data for LLM
    const portfolioStr = JSON.stringify(portfolio, null, 2);
    const marketDataStr = JSON.stringify(marketData, null, 2);
    
    // Create prompt
    const prompt = `
# Crypto Portfolio Analysis

## Portfolio Data
\`\`\`json
${portfolioStr}
\`\`\`

## Current Market Data
\`\`\`json
${marketDataStr}
\`\`\`

Analyze this crypto portfolio in detail. Include:
1. Overall portfolio health assessment
2. Analysis of the allocation and risk exposure
3. Potential opportunities based on current market data
4. Specific recommendations for trades or rebalancing
5. Strategies to optimize the portfolio

Provide a comprehensive analysis with specific, actionable recommendations.
`;
    
    // Use LLM for analysis
    return await this.llmService.generateText(prompt);
  }

  /**
   * Execute a trade using AgentKit
   */
  async executeTrade(tradeType: string, fromAsset: string, toAsset: string, amount: number): Promise<any> {
    console.log(`AgentKit executing trade: ${tradeType} ${amount} ${fromAsset} to ${toAsset}`);
    
    // Generate unique ID for the trade
    const tradeId = `agentkit-trade-${Date.now().toString(36).substring(5)}`;
    
    try {
      // Get available actions
      const actions = this.agentKit.getActions();
      
      // Generate trade analysis
      const analysisPrompt = `
Analyze this potential trade:
- Type: ${tradeType}
- From: ${amount} ${fromAsset}
- To: ${toAsset}

Consider current market conditions, price impact, and potential risks. Is this a good trade? Why or why not?
`;
      
      let tradeAnalysis;
      if (this.langchainAgent) {
        try {
          console.log('Using LangChain agent for trade analysis');
          
          const result = await this.langchainAgent.invoke({ 
            messages: [new HumanMessage(analysisPrompt)]
          });
          
          tradeAnalysis = this.extractLangChainResponse(result);
        } catch (error) {
          console.error('LangChain trade analysis failed:', error);
          tradeAnalysis = await this.llmService.generateText(analysisPrompt);
        }
      } else {
        tradeAnalysis = await this.llmService.generateText(analysisPrompt);
      }
      
      // Store analysis in memory
      await this.memoryManager.store('trade_analysis', tradeAnalysis, {
        tradeId,
        tradeType,
        fromAsset,
        toAsset,
        amount
      });
      
      // Execute the actual trade
      let executionResult: any = null;
      
      // Handle different trade types
      if (tradeType.toLowerCase() === 'swap') {
        // Find swap action
        const swapAction = actions.find(a => a.name === 'swap_tokens' || a.name === 'swap');
        
        if (swapAction) {
          console.log('Found swap action, executing swap...');
          try {
            executionResult = await swapAction.invoke({
              fromAssetAmount: amount.toString(),
              fromAsset,
              toAsset
            });
          } catch (swapError) {
            console.error('Swap action failed:', swapError);
            throw swapError;
          }
        } else {
          // Find WETH action if swapping to/from WETH
          if (fromAsset.toUpperCase() === 'ETH' && toAsset.toUpperCase() === 'WETH') {
            const wrapAction = actions.find(a => a.name === 'wrap');
            if (wrapAction) {
              executionResult = await wrapAction.invoke({
                amount: amount.toString()
              });
            } else {
              throw new Error('No swap or wrap action available');
            }
          } else if (fromAsset.toUpperCase() === 'WETH' && toAsset.toUpperCase() === 'ETH') {
            const unwrapAction = actions.find(a => a.name === 'unwrap');
            if (unwrapAction) {
              executionResult = await unwrapAction.invoke({
                amount: amount.toString()
              });
            } else {
              throw new Error('No swap or unwrap action available');
            }
          } else {
            throw new Error('No swap action available');
          }
        }
      } else if (tradeType.toLowerCase() === 'transfer') {
        // Find transfer action
        const transferAction = actions.find(a => a.name === 'native_transfer' || a.name === 'transfer');
        
        if (transferAction) {
          console.log('Found transfer action, executing transfer...');
          try {
            executionResult = await transferAction.invoke({
              to: toAsset, // In this case, toAsset is the destination address
              amount: amount.toString()
            });
          } catch (transferError) {
            console.error('Transfer action failed:', transferError);
            throw transferError;
          }
        } else {
          throw new Error('No transfer action available');
        }
      } else {
        throw new Error(`Unsupported trade type: ${tradeType}`);
      }
      
      // Store execution result in memory
      await this.memoryManager.store('trade_execution', executionResult, {
        tradeId,
        tradeType,
        fromAsset,
        toAsset,
        amount,
        timestamp: new Date().toISOString()
      });
      
      return {
        tradeId,
        timestamp: new Date().toISOString(),
        status: 'completed',
        tradeType,
        fromAsset,
        toAsset,
        amount,
        analysis: tradeAnalysis,
        result: executionResult
      };
    } catch (error) {
      console.error('Error executing trade with AgentKit:', error);
      
      // Store error in memory
      await this.memoryManager.store('error', {
        error: error instanceof Error ? error.message : String(error),
        tradeId,
        tradeType,
        fromAsset,
        toAsset,
        amount
      });
      
      // Return error information
      return {
        tradeId,
        timestamp: new Date().toISOString(),
        status: 'error',
        tradeType,
        fromAsset,
        toAsset,
        amount,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get reasoning history from memory manager
   */
  async getReasoningHistory(decisionId: string): Promise<any> {
    try {
      // Query memory entries related to the decision ID
      const analysisEntries = await this.memoryManager.query('portfolio-analysis', 
        (entry: any) => entry.metadata?.portfolioId === decisionId);
      
      if (analysisEntries.length > 0) {
        return {
          decisionId,
          timestamp: analysisEntries[0].timestamp,
          type: 'analysis',
          reasoning: analysisEntries[0].content
        };
      }
      
      // Check for trade executions
      const tradeEntries = await this.memoryManager.query('trade_execution',
        (entry: any) => entry.metadata?.tradeId === decisionId);
      
      if (tradeEntries.length > 0) {
        return {
          decisionId,
          timestamp: tradeEntries[0].timestamp,
          type: 'trade',
          reasoning: tradeEntries[0].content
        };
      }
      
      // Check for errors
      const errorEntries = await this.memoryManager.query('error',
        (entry: any) => entry.metadata?.tradeId === decisionId);
      
      if (errorEntries.length > 0) {
        return {
          decisionId,
          timestamp: errorEntries[0].timestamp,
          type: 'error',
          reasoning: errorEntries[0].content
        };
      }
      
      return {
        error: 'not_found',
        message: `No decision found with ID: ${decisionId}`
      };
    } catch (error) {
      console.error('Error retrieving reasoning history:', error);
      return {
        error: 'retrieval_failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get memory manager for external queries
   */
  getMemoryManager(): RecallMemoryManager {
    return this.memoryManager;
  }

  /**
   * Get the wallet instance
   * Used for accessing wallet details like address and balance
   */
  getWallet(): any {
    // Return a wallet object with the address and basic details
    return {
      getAddress: () => this.walletAddress,
      network: 'testnet',
      chain: 'base-sepolia'
    };
  }
}

/**
 * Create a Persistent CDP wallet provider
 * 
 * This method uses our wallet database to persist wallet data
 * across server restarts. It prioritizes:
 * 1. Loading from existing storage
 * 2. Recovering from mnemonic
 * 3. Creating a new wallet
 */
async function createPersistentCDPWallet(agentId: string, mnemonic?: string): Promise<any> {
  try {
    const walletDB = getWalletDB();
    
    // 1. Check if we have stored wallet data for this agent
    let cdpWalletData: string | undefined;
    const storedWallet = await walletDB.loadWalletData(agentId);
    
    if (storedWallet) {
      console.log(`Using stored wallet data for agent: ${agentId}`);
      // Use stored wallet data
      cdpWalletData = JSON.stringify(storedWallet);
    }
    
    // Get CDP configuration
    const cdpApiKey = process.env.COINBASE_CDP_KEY;
    const cdpSecret = process.env.COINBASE_CDP_SECRET;
    const networkId = process.env.CDP_NETWORK_ID || 'base-sepolia';
    
    if (!cdpApiKey || !cdpSecret) {
      console.warn('CDP API key or secret is missing, using fallback wallet provider');
      // Create a basic wallet using ethers
      const wallet = mnemonic 
        ? Wallet.fromPhrase(mnemonic)
        : Wallet.createRandom();
      
      // Create a simple wallet provider that mimics the CDP interface
      return {
        getAddress: async () => wallet.address,
        getBalance: async () => Promise.resolve(BigInt('1000000000000000000')), // 1 ETH
        getNetwork: () => {
          return {
            chainId: '84532',
            networkId: 'base-sepolia',
            protocolFamily: 'evm'
          };
        },
        exportWallet: async () => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        })
      };
    }
    
    try {
      // Configure the CDP Wallet Provider with proper error handling
      console.log('Initializing CDP wallet provider with:');
      console.log(`- Network ID: ${networkId}`);
      console.log(`- Has API Key: ${!!cdpApiKey}`);
      console.log(`- Has API Secret: ${!!cdpSecret}`);
      console.log(`- Has Mnemonic: ${!!mnemonic}`);
      console.log(`- Has Stored Wallet: ${!!cdpWalletData}`);
      
      const walletProvider = await CdpWalletProvider.configureWithWallet({
        apiKeyName: cdpApiKey,
        apiKeyPrivateKey: cdpSecret,
        networkId,
        mnemonicPhrase: mnemonic, // Optional, will be used if no cdpWalletData
        cdpWalletData // Optional, will be used if available
      });
      
      // Save wallet data for future use
      if (!storedWallet) {
        const exportedWallet = await walletProvider.exportWallet();
        await walletDB.saveWalletData(agentId, exportedWallet);
        console.log(`New wallet created and saved for agent: ${agentId}`);
      }
      
      return walletProvider;
    } catch (cdpError) {
      console.error(`CDP wallet creation failed: ${cdpError instanceof Error ? cdpError.message : String(cdpError)}`);
      console.log('Creating fallback wallet with ethers...');
      
      // Create a basic wallet using ethers as fallback
      const wallet = mnemonic 
        ? Wallet.fromPhrase(mnemonic)
        : Wallet.createRandom();
      
      // Save this wallet to our database
      await walletDB.saveWalletData(agentId, {
        address: wallet.address,
        privateKey: wallet.privateKey
      });
      
      // Return a compatible wallet provider
      return {
        getAddress: async () => wallet.address,
        getBalance: async () => Promise.resolve(BigInt('1000000000000000000')), // 1 ETH
        getNetwork: () => {
          return {
            chainId: '84532',
            networkId: 'base-sepolia',
            protocolFamily: 'evm'
          };
        },
        exportWallet: async () => ({
          address: wallet.address,
          privateKey: wallet.privateKey
        })
      };
    }
  } catch (error) {
    console.error(`Error in createPersistentCDPWallet: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Create an AgentKit-based trading agent with persistence
 * 
 * This implementation includes:
 * - Encrypted wallet database for persisting wallet data
 * - Support for wallet recovery from mnemonic
 * - Memory management with Recall Network
 */
export async function createAgentKitAgent(config: AgentKitConfig): Promise<Agent> {
  console.log('Creating AgentKit-based trading agent with persistence');
  
  try {
    // Setup Recall Network memory manager (existing code)
    console.log('Initializing Recall Network memory manager');
    const recallPrivateKey = process.env.RECALL_PRIVATE_KEY;
    const recallBucketAlias = process.env.RECALL_BUCKET_ALIAS || '4g3n7-test-bucket';
    const recallNetwork = process.env.RECALL_NETWORK || 'testnet';
    const recallId = config.recallId || 'agent-' + Date.now().toString(36).substring(5);
    
    // Setup memory manager based on configuration
    const memoryManager = new RecallMemoryManager(
      recallPrivateKey || '',
      recallBucketAlias, 
      recallNetwork as any
    );
    
    // Get mnemonic phrase from config or environment
    const mnemonicPhrase = config.mnemonic || process.env.MNEMONIC_PHRASE;
    
    // Create wallet provider using CDP wallet implementation
    console.log('Creating CDP wallet provider with proper persistence');
    const shouldUseMockWallet = process.env.USE_MOCK_WALLET === 'true';
    
    let walletProvider;
    let walletAddress: string;
    
    if (shouldUseMockWallet) {
      console.log('Using mock wallet as specified in environment');
      // Create a basic wallet using ethers
      const randomWallet = Wallet.createRandom();
      walletAddress = randomWallet.address;
      
      // Use a mock wallet implementation
      walletProvider = {
        getAddress: async () => walletAddress,
        getBalance: async () => Promise.resolve(BigInt('1000000000000000000')), // 1 ETH in wei
        getNetwork: () => {
          return {
            chainId: '84532',
            networkId: 'base-sepolia',
            protocolFamily: 'evm'
          };
        },
        exportWallet: async () => ({
          address: walletAddress,
          privateKey: randomWallet.privateKey
        })
      };
    } else {
      try {
        // Create a CDP wallet provider with persistence
        walletProvider = await createPersistentCDPWallet(recallId, mnemonicPhrase);
        walletAddress = await walletProvider.getAddress();
        console.log(`Using CDP wallet with address: ${walletAddress}`);
      } catch (walletError) {
        console.error(`Failed to create wallet provider: ${walletError}`);
        
        // Use a basic ethers wallet as fallback
        const wallet = mnemonicPhrase 
          ? Wallet.fromPhrase(mnemonicPhrase)
          : Wallet.createRandom();
        
        walletAddress = wallet.address;
        console.log(`Using fallback wallet with address: ${walletAddress}`);
        
        walletProvider = {
          getAddress: async () => walletAddress,
          getBalance: async () => Promise.resolve(BigInt('1000000000000000000')), // 1 ETH in wei
          getNetwork: () => {
            return {
              chainId: '84532',
              networkId: 'base-sepolia',
              protocolFamily: 'evm'
            };
          },
          exportWallet: async () => ({
            address: walletAddress,
            privateKey: wallet.privateKey
          })
        };
      }
    }
    
    // Create action providers array if enabled
    const enableActionProviders = config.enableActionProviders !== false;
    const actionProviders = enableActionProviders
      ? [
          walletActionProvider(),
          erc20ActionProvider(),
          erc721ActionProvider(),
          cdpApiActionProvider({
            apiKeyName: process.env.COINBASE_CDP_KEY,
            apiKeyPrivateKey: process.env.COINBASE_CDP_SECRET
          }),
          cdpWalletActionProvider({
            apiKeyName: process.env.COINBASE_CDP_KEY,
            apiKeyPrivateKey: process.env.COINBASE_CDP_SECRET
          }),
          wethActionProvider(),
          defillamaActionProvider(),
          compoundActionProvider(),
          pythActionProvider(),
          morphoActionProvider(),
          // Custom action providers
          tavilyActionProvider()
        ]
      : [];
    
    // Create LLM service based on configuration
    let llmService: LLMService;
    let langchainAgent = null;
    
    if (config.llmProvider === 'azure') {
      const azureOpenAIApiKey = process.env.AZURE_OPENAI_API_KEY;
      const azureOpenAIEndpoint = process.env.AZURE_OPENAI_API_INSTANCE_NAME
        ? `https://${process.env.AZURE_OPENAI_API_INSTANCE_NAME}.openai.azure.com`
        : undefined;
      const azureOpenAIDeploymentName = process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME;
      const azureOpenAIApiVersion = process.env.AZURE_OPENAI_API_VERSION;
      
      if (!azureOpenAIApiKey || !azureOpenAIDeploymentName) {
        console.warn('Azure OpenAI API key or deployment name missing. Falling back to using MockLLMService...');
        llmService = new MockLLMService();
      } else {
        try {
          // Create LangChain chat model
          const model = new ChatOpenAI({
            azureOpenAIApiKey,
            azureOpenAIApiVersion,
            azureOpenAIApiDeploymentName: azureOpenAIDeploymentName,
            azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
            temperature: 0
          }) as any; // Use type assertion to bypass compatibility issues
          
          // Create LangChain agent memory
          const memory = new MemorySaver();
          
          // Create LangChain agent - this integrates with AgentKit
          langchainAgent = await createLangChainAgent({
            model,
            memory,
            walletAddress: walletAddress,
            agentConfig: config
          });
          
          // Use real LLM service
          llmService = new AzureOpenAIService(model);
        } catch (error) {
          console.error('Failed to initialize LangChain agent:', error);
          console.warn('Falling back to using MockLLMService...');
          llmService = new MockLLMService();
        }
      }
    } else if (config.llmProvider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
      
      if (!apiKey) {
        console.warn('Gemini API key missing. Falling back to using MockLLMService...');
        llmService = new MockLLMService();
      } else {
        llmService = new GeminiLLMService();
      }
    } else {
      console.log('Using mock LLM service as configured');
      llmService = new MockLLMService();
    }
    
    // Create a real AgentKit instance with wallet provider
    console.log('Creating AgentKit instance with CDP wallet provider');
    const agentKit = await AgentKit.from({
      walletProvider,
      actionProviders
    });
    
    // Create and return AgentKit trading agent
    return new AgentKitTradingAgent(
      agentKit,
      llmService,
      langchainAgent,
      memoryManager,
      walletAddress,
      recallId
    );
  } catch (error) {
    console.error('Error creating AgentKit-based trading agent:', error);
    throw error;
  }
}
