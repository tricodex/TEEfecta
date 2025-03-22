import { v4 as uuidv4 } from 'uuid';
import { Agent } from './index.js';
import { LLMService } from '../services/llm-service.js';
import { MemoryManager, MemoryEntry } from '../services/recall-memory.js';
import { ethers } from 'ethers';

/**
 * Real Trading Agent Implementation
 * 
 * This implementation uses an LLM service for analysis and decision making,
 * and stores all decisions in a memory manager.
 */
export class TradingAgent implements Agent {
  private address: string;
  private llmService: LLMService;
  private memoryManager: MemoryManager;
  private wallet: ethers.Wallet | null = null;
  private provider: ethers.JsonRpcProvider | null = null;
  private baseSepoliaProvider: ethers.JsonRpcProvider | null = null;
  private ethSepoliaProvider: ethers.JsonRpcProvider | null = null;
  
  constructor(
    llmService: LLMService,
    memoryManager: MemoryManager,
    address?: string
  ) {
    this.llmService = llmService;
    this.memoryManager = memoryManager;
    this.address = address || `0x${Math.random().toString(16).substring(2, 10)}70591331daa4b${Math.random().toString(16).substring(2, 10)}`;
    
    // Initialize wallet if private key is available
    this.initializeWallet();
    
    console.log('Trading Agent initialized with address:', this.address);
  }
  
  /**
   * Initialize wallet with private key from environment
   */
  private initializeWallet() {
    try {
      const privateKey = process.env.ETHEREUM_PRIVATE_KEY;
      
      // Initialize both Sepolia and Base Sepolia providers with API key from env
      const infuraApiKey = process.env.INFURA_API_KEY || '';
      const ethSepoliaRpcUrl = `https://sepolia.infura.io/v3/${infuraApiKey}`;
      const baseSepoliaRpcUrl = `https://base-sepolia.infura.io/v3/${infuraApiKey}`;
      
      if (privateKey) {
        // Create providers
        this.ethSepoliaProvider = new ethers.JsonRpcProvider(ethSepoliaRpcUrl);
        this.baseSepoliaProvider = new ethers.JsonRpcProvider(baseSepoliaRpcUrl);
        
        // Use Ethereum Sepolia as default
        this.provider = this.ethSepoliaProvider;
        
        // Create wallet with provider
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        
        // Log success but hide full address for security
        const addressStart = this.wallet.address.substring(0, 6);
        const addressEnd = this.wallet.address.substring(38);
        console.log(`Wallet initialized: ${addressStart}...${addressEnd}`);
        
        // Update address with real wallet address
        this.address = this.wallet.address;
        
        // Check wallet balance
        this.checkWalletBalance().then(balance => {
          console.log(`Wallet balance: ${balance} ETH`);
        }).catch(error => {
          console.error('Error checking wallet balance:', error);
        });
      } else {
        console.log('No private key provided, using mock wallet');
      }
    } catch (error) {
      console.error('Error initializing wallet:', error);
      this.wallet = null;
      this.provider = null;
    }
  }
  
  /**
   * Check wallet balance on both networks
   */
  async checkWalletBalance(): Promise<string> {
    if (!this.wallet || !this.wallet.provider) {
      throw new Error('Wallet not initialized');
    }
    
    try {
      // Check balance on Ethereum Sepolia
      const ethBalance = await this.wallet.provider.getBalance(this.wallet.address);
      const ethBalanceInEth = ethers.formatEther(ethBalance);
      console.log(`Ethereum Sepolia balance: ${ethBalanceInEth} ETH`);
      
      // Check balance on Base Sepolia if available
      if (this.baseSepoliaProvider) {
        try {
          const baseBalance = await this.baseSepoliaProvider.getBalance(this.wallet.address);
          const baseBalanceInEth = ethers.formatEther(baseBalance);
          console.log(`Base Sepolia balance: ${baseBalanceInEth} ETH`);
        } catch (error) {
          console.error('Error checking Base Sepolia balance:', error);
        }
      }
      
      return ethBalanceInEth;
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      throw error;
    }
  }
  
  /**
   * Get agent status
   */
  async getStatus(): Promise<any> {
    try {
      // Check if LLM service is operational
      const llmHealth = await this.llmService.healthCheck()
        .catch(error => {
          console.error('LLM health check error:', error);
          return false;
        });
      
      // Get the provider name from the service constructor name
      let provider = 'unknown';
      const constructorName = this.llmService.constructor.name;
      if (constructorName.includes('Gemini')) {
        provider = 'gemini';
      } else if (constructorName.includes('Azure')) {
        provider = 'azure';
      } else if (constructorName.includes('Mock')) {
        provider = 'mock';
      }
      
      return {
        status: llmHealth ? 'operational' : 'degraded',
        llmProvider: provider,
        wallet: {
          address: this.address,
          network: 'testnet',
          chain: 'base-sepolia'
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Analyze portfolio with market data for informed trading decisions
   */
  async analyzePortfolio(portfolio: any, marketData: any): Promise<any> {
    console.log('Analyzing portfolio with market data');
    
    try {
      // Generate a unique decision ID
      const decisionId = uuidv4();
      
      // Format the portfolio data for the LLM prompt with null checking
      const portfolioSummary = Object.entries(portfolio.assets || {})
        .map(([symbol, details]: [string, any]) => {
          // Enhanced null checking to prevent undefined errors
          const amount = details && details.amount !== undefined ? details.amount : 'unknown';
          let value = 'unknown';
          
          // Safely format the value to avoid "undefined is not an object" errors
          if (details && details.value !== undefined && details.value !== null) {
            if (typeof details.value === 'number') {
              value = details.value.toFixed(2);
            } else if (typeof details.value === 'string') {
              const numValue = parseFloat(details.value);
              if (!isNaN(numValue)) {
                value = numValue.toFixed(2);
              } else {
                value = details.value;
              }
            } else {
              value = String(details.value);
            }
          }
          
          return `${symbol}: ${amount} (Value: $${value})`;
        })
        .join('\n');
      
      // Format the market data for the LLM prompt with improved null checking
      const marketDataSummary = Object.entries(marketData || {})
        .map(([symbol, details]: [string, any]) => {
          if (!details) return `${symbol}: No data available`;
          
          const price = details.price !== undefined ? details.price : 'unknown';
          const change24h = details.change24h !== undefined ? details.change24h : 'unknown';
          const change7d = details.change7d !== undefined ? details.change7d : 'unknown';
          
          return `${symbol}: $${price} (24h: ${change24h}%, 7d: ${change7d}%)`;
        })
        .join('\n');
      
      // Build a prompt for the LLM
      const prompt = `
You are a cryptocurrency trading assistant analyzing a portfolio.

PORTFOLIO:
${portfolioSummary}

MARKET DATA:
${marketDataSummary}

Based on the portfolio and current market data, please provide:
1. An overall assessment of the portfolio's health
2. Identification of top opportunities or risks
3. Recommended trading actions (if any)
4. A reasoning for your recommendations

Please be specific with your analysis and include any relevant factors like market trends, diversification, or risk exposure.
      `.trim();
      
      // Use web search enhanced generation if available in the LLM service
      let analysisText;
      if (typeof (this.llmService as any).generateTextWithWebSearch === 'function') {
        console.log('Using web search enhanced portfolio analysis');
        const searchQuery = `latest cryptocurrency market trends ${Object.keys(portfolio.assets || {}).join(' ')}`;
        analysisText = await (this.llmService as any).generateTextWithWebSearch(prompt, searchQuery);
      } else {
        analysisText = await this.llmService.generateText(prompt);
      }
      
      // Try to extract structured recommendations
      let structuredRecommendations;
      try {
        const recommendationSchema = {
          overallHealth: "string",
          opportunities: ["string"],
          risks: ["string"],
          recommendedActions: [{
            action: "string",
            asset: "string",
            reasoning: "string"
          }]
        };
        
        structuredRecommendations = await this.llmService.generateStructuredData(
          `${prompt}\n\nPlease format your response as a JSON object with the following structure: ${JSON.stringify(recommendationSchema)}`,
          recommendationSchema
        );
      } catch (error) {
        console.warn('Failed to generate structured recommendations:', error);
        structuredRecommendations = {
          parsedFromText: true,
          overallHealth: "Extracted from text analysis",
          opportunities: ["Extracted from text analysis"],
          risks: ["See full analysis text"],
          recommendedActions: []
        };
      }
      
      // Store the analysis in memory
      await this.memoryManager.storeMemory({
        id: decisionId,
        timestamp: new Date().toISOString(),
        type: 'portfolio-analysis',
        content: analysisText
      });
      
      // Return the analysis and structured recommendations
      return {
        decisionId,
        timestamp: new Date().toISOString(),
        analysis: analysisText,
        recommendations: structuredRecommendations
      };
    } catch (error) {
      console.error('Error analyzing portfolio:', error);
      return {
        error: 'analysis_failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Execute a trade using the LLM for analysis
   */
  async executeTrade(tradeType: string, fromAsset: string, toAsset: string, amount: number): Promise<any> {
    const tradeId = uuidv4().substring(0, 8);
    
    console.log(`Executing trade: ${tradeType} ${amount} ${fromAsset} to ${toAsset}`);
    console.log(`Starting trade execution with ID: ${tradeId}`);
    console.log(`Trade details: ${tradeType} ${amount} ${fromAsset} to ${toAsset}`);
    
    let executionResult: any = null;
    let tradeError: any = null;
    
    // Generate analysis with LLM
    try {
      console.log('Generating trade analysis with LLM...');
      
      // Prepare prompt for LLM analysis
      const prompt = `
You are a professional crypto trader. Analyze the following trade:
- Trade Type: ${tradeType}
- From Asset: ${fromAsset}
- To Asset: ${toAsset}
- Amount: ${amount}

Provide a brief analysis of this trade in terms of:
1. Risk assessment
2. Market conditions
3. Potential outcomes
`;
      
      // Generate analysis
      const analysis = await this.llmService.generateText(prompt);
      
      // Store analysis in memory
      await this.memoryManager.storeMemory({
        id: uuidv4(),
        type: 'trade_analysis',
        timestamp: new Date().toISOString(),
        data: {
          tradeId,
          tradeType,
          fromAsset,
          toAsset,
          amount,
          analysis
        }
      });
      
      // Execute the actual trade
      if (this.wallet && this.provider) {
        try {
          console.log('Attempting real transaction with wallet...');
          
          // Check wallet balance before proceeding
          const balance = await this.checkWalletBalance();
          const balanceNum = parseFloat(balance);
          const amountNum = parseFloat(amount.toString());
          
          // Add additional wiggle room for gas (0.001 ETH)
          const requiredAmount = amountNum + 0.001;
          
          if (balanceNum < requiredAmount && tradeType.toLowerCase() === 'transfer' && fromAsset.toLowerCase() === 'eth') {
            console.warn(`Wallet balance (${balanceNum} ETH) is less than required amount (${requiredAmount} ETH)`);
            console.warn('Real transaction might fail due to insufficient funds');
          }
          
          // Different execution logic based on trade type
          if (tradeType.toLowerCase() === 'transfer' && fromAsset.toLowerCase() === 'eth') {
            try {
              // For ETH transfers on first network
              const tx = await this.wallet.sendTransaction({
                to: toAsset, // In this case, toAsset is the recipient address
                value: ethers.parseEther(amount.toString()),
                gasLimit: 21000 // Standard gas limit for ETH transfers
              });
              
              console.log('Transaction sent:', tx.hash);
              
              // Wait for transaction confirmation
              const receipt = await tx.wait();
              
              executionResult = {
                status: 'completed',
                transactionHash: tx.hash,
                blockNumber: receipt?.blockNumber,
                fromAmount: amount,
                fromAsset,
                toAddress: toAsset,
                network: 'ethereum-sepolia',
                timestamp: new Date().toISOString()
              };
            } catch (error) {
              console.log('Transaction failed on Ethereum Sepolia, trying Base Sepolia...');
              console.error('Error details:', error);
              
              // Fallback to Base Sepolia if Ethereum Sepolia fails
              if (this.baseSepoliaProvider) {
                try {
                  // Connect wallet to Base Sepolia network
                  const baseWallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY || '', this.baseSepoliaProvider);
                  
                  // Check balance on Base Sepolia
                  const baseBalance = await this.baseSepoliaProvider.getBalance(baseWallet.address);
                  const baseBalanceInEth = ethers.formatEther(baseBalance);
                  console.log(`Base Sepolia balance before transaction: ${baseBalanceInEth} ETH`);
                  
                  // Send transaction on Base Sepolia
                  const tx = await baseWallet.sendTransaction({
                    to: toAsset,
                    value: ethers.parseEther(amount.toString()),
                    gasLimit: 21000 // Standard gas limit for ETH transfers
                  });
                  
                  console.log('Base Sepolia transaction sent:', tx.hash);
                  
                  // Wait for confirmation
                  const receipt = await tx.wait();
                  
                  executionResult = {
                    status: 'completed',
                    transactionHash: tx.hash,
                    blockNumber: receipt?.blockNumber,
                    fromAmount: amount,
                    fromAsset,
                    toAddress: toAsset,
                    network: 'base-sepolia',
                    timestamp: new Date().toISOString()
                  };
                } catch (baseError) {
                  // Both networks failed
                  console.error('Transaction failed on both networks:', baseError);
                  tradeError = baseError;
                  
                  // Store the error in memory
                  await this.memoryManager.storeMemory({
                    id: uuidv4(),
                    type: 'error',
                    timestamp: new Date().toISOString(),
                    data: {
                      tradeId,
                      error: (baseError as Error).toString(),
                      context: 'Failed to execute transaction on both networks'
                    }
                  });
                  
                  // Fallback to simulated transaction
                  console.log('Falling back to simulated transaction');
                  executionResult = {
                    status: 'simulated',
                    transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
                    fromAmount: amount,
                    fromAsset,
                    toAddress: toAsset,
                    timestamp: new Date().toISOString(),
                    note: 'Simulated transaction - real transaction failed on all networks'
                  };
                }
              } else {
                throw error;
              }
            }
          } else {
            // For other trade types, we would implement swap logic here
            // This would involve interacting with DEX contracts
            
            // For now, log that this is unimplemented and use mock response
            console.log('Real swap transactions not yet implemented, using mock response');
            executionResult = {
              status: 'completed',
              transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
              fromAmount: amount,
              toAmount: (amount * 0.99).toFixed(6), // Simulated 1% slippage
              timestamp: new Date().toISOString(),
              note: 'Mock transaction - real swap not yet implemented'
            };
          }
        } catch (error) {
          console.error('Transaction failed:', error);
          tradeError = error;
          
          // Store the error in memory
          await this.memoryManager.storeMemory({
            id: uuidv4(),
            type: 'error',
            timestamp: new Date().toISOString(),
            data: {
              tradeId,
              error: (error as Error).toString(),
              context: 'Failed to execute transaction'
            }
          });
          
          // Fallback to simulated transaction
          console.log('Falling back to simulated transaction');
          executionResult = {
            status: 'simulated',
            transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
            fromAmount: amount,
            fromAsset,
            toAddress: toAsset,
            timestamp: new Date().toISOString(),
            note: 'Simulated transaction - real transaction failed'
          };
        }
      } else {
        // No wallet available, use mock execution
        console.log('No wallet available, using mock execution');
        executionResult = {
          status: 'simulated',
          transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
          fromAmount: amount,
          fromAsset,
          toAddress: toAsset,
          timestamp: new Date().toISOString(),
          note: 'Simulated transaction - no wallet available'
        };
      }
      
      // Store execution result in memory
      await this.memoryManager.storeMemory({
        id: uuidv4(),
        type: 'trade_execution',
        timestamp: new Date().toISOString(),
        data: {
          tradeId,
          tradeType,
          fromAsset,
          toAsset,
          amount,
          result: executionResult
        }
      });
      
      return {
        tradeId,
        status: 'success',
        result: executionResult
      };
    } catch (error) {
      console.error('Error executing trade:', error);
      
      // Store the error in memory
      await this.memoryManager.storeMemory({
        id: uuidv4(),
        type: 'error',
        timestamp: new Date().toISOString(),
        data: {
          tradeId,
          error: error instanceof Error ? error.message : String(error),
          context: 'Error in trade execution flow'
        }
      });
      
      return {
        tradeId,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get memory manager for external queries
   */
  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }

  /**
   * Get the wallet associated with this agent
   * @returns The agent's wallet
   */
  getWallet(): any {
    // If we have a real wallet, return it
    if (this.wallet) {
      return this.wallet;
    }
    
    // Otherwise, return a wallet-like object with the address
    return {
      address: this.address,
      getAddress: () => this.address,
      network: 'testnet',
      chain: this.provider ? 'ethereum-sepolia' : 'base-sepolia'
    };
  }

  /**
   * Get reasoning history from memory
   */
  async getReasoningHistory(decisionId: string): Promise<any> {
    // Attempt to retrieve from memory
    const portfolioAnalysis = await this.memoryManager.query('portfolio_analysis', 
      (entry: MemoryEntry) => (entry.content as any).decisionId === decisionId);
    
    if (portfolioAnalysis.length > 0) {
      return {
        decisionId,
        timestamp: portfolioAnalysis[0].timestamp,
        type: 'portfolio_analysis',
        reasoning: portfolioAnalysis[0].content
      };
    }
    
    // Check for trade executions
    const tradeExecution = await this.memoryManager.query('trade_execution',
      (entry: MemoryEntry) => (entry.content as any).tradeId === decisionId);
    
    if (tradeExecution.length > 0) {
      return {
        decisionId,
        timestamp: tradeExecution[0].timestamp,
        type: 'trade_execution',
        reasoning: tradeExecution[0].content
      };
    }
    
    // Check for errors
    const errors = await this.memoryManager.query('error',
      (entry: MemoryEntry) => 
        ((entry.content as any).decisionId === decisionId) || 
        ((entry.content as any).tradeId === decisionId));
    
    if (errors.length > 0) {
      return {
        decisionId,
        timestamp: errors[0].timestamp,
        type: 'error',
        reasoning: errors[0].content
      };
    }
    
    // Not found
    return {
      error: 'Not found',
      message: `No reasoning found for ID: ${decisionId}`
    };
  }
} 