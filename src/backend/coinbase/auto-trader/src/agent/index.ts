// Agent implementation
import { v4 as uuidv4 } from 'uuid';
import { setupAgentKit } from './agentkit.js';
import { setupLangChain, createTradingAnalysisChain } from './langchain.js';
import { setupDirectGemini, GeminiAnalysisInput, GeminiTradeInput } from './direct-gemini.js';
import { AgentKit } from '@coinbase/agentkit';
import { RecallMemoryManager, MemoryManager, MemoryEntry } from '../services/recall-memory.js';
import { MockTradingAgent } from './mock-trading-agent.js';

// Agent interface for the auto-trader
export interface Agent {
  /**
   * Get the current status of the agent
   */
  getStatus(): Promise<any>;
  
  /**
   * Analyze a portfolio given the current market data
   * 
   * @param portfolio - The portfolio to analyze
   * @param marketData - The market data to use for analysis
   */
  analyzePortfolio(portfolio: any, marketData: any): Promise<any>;
  
  /**
   * Execute a trade
   * 
   * @param tradeType - The type of trade (swap, transfer, etc)
   * @param fromAsset - The asset to trade from
   * @param toAsset - The asset to trade to
   * @param amount - The amount to trade
   */
  executeTrade(tradeType: string, fromAsset: string, toAsset: string, amount: number): Promise<any>;
  
  /**
   * Get the reasoning history for a given decision
   * 
   * @param decisionId - The ID of the decision
   */
  getReasoningHistory(decisionId: string): Promise<any>;
  
  /**
   * Get the memory manager instance
   * Used for querying memory entries by type
   */
  getMemoryManager(): MemoryManager | null;
}

// LLM provider types
export type LLMProvider = 'azure' | 'gemini' | 'mock';

/**
 * Initialize the trading agent
 * @param preferredLLM Optional preferred LLM provider (azure or gemini)
 * @returns Agent instance
 */
export async function initAgent(preferredLLM: LLMProvider = 'gemini'): Promise<Agent> {
  try {
    // Get environment variables
    const cdpApiKeyName = process.env.COINBASE_CDP_KEY;
    const cdpApiKeyPrivateKey = process.env.COINBASE_CDP_SECRET;
    const recallPrivateKey = process.env.RECALL_PRIVATE_KEY;
    const networkId = process.env.CDP_NETWORK_ID || 'base-sepolia';
    
    // Validate required environment variables
    if (!cdpApiKeyName || !cdpApiKeyPrivateKey || !recallPrivateKey) {
      console.warn('Missing required environment variables for AgentKit integration. Falling back to mock agent.');
      console.warn('Please ensure COINBASE_CDP_KEY, COINBASE_CDP_SECRET, and RECALL_PRIVATE_KEY are properly set.');
      return new MockTradingAgent();
    }
    
    console.log(`Initializing 4g3n7 agent with AgentKit, preferred LLM: ${preferredLLM}`);
    
    // Set up AgentKit with Recall integration
    const agentkit = await setupAgentKit({
      cdpApiKeyName,
      cdpApiKeyPrivateKey,
      networkId,
      recallPrivateKey
    });
    
    // Initialize the memory manager with Recall Network
    console.log('Setting up Recall Memory Manager');
    const memoryManager = new RecallMemoryManager(
      recallPrivateKey,
      process.env.RECALL_BUCKET_ALIAS || '4g3n7-reasoning',
      process.env.RECALL_NETWORK || 'testnet'
    );
    
    // Initialize LLM for AI analysis with error handling
    let llmModel;
    let analysisFunction;
    let llmProvider: LLMProvider = 'mock';
    
    // Try preferred LLM first, then fall back to alternatives
    if (preferredLLM === 'gemini' || (preferredLLM === 'azure' && llmModel === undefined)) {
      try {
        const geminiApiKey = process.env.GOOGLE_API_KEY;
        if (geminiApiKey) {
          console.log('Setting up Google Gemini directly without LangChain');
          llmModel = setupDirectGemini({
            apiKey: geminiApiKey,
            model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
            temperature: 0.7
          });
          
          // Use the direct Gemini function for analysis
          analysisFunction = llmModel.analyzePortfolio;
          console.log('Google Gemini direct integration set up successfully');
          llmProvider = 'gemini';
        } else {
          console.warn('Missing GOOGLE_API_KEY for Gemini integration');
        }
      } catch (error) {
        console.error('Failed to initialize Google Gemini:', error);
        llmModel = undefined;
      }
    }
    
    // Try Azure OpenAI if Gemini failed or Azure was preferred but failed
    if (preferredLLM === 'azure' || (preferredLLM === 'gemini' && llmModel === undefined)) {
      try {
        console.log('Setting up Azure OpenAI with LangChain');
        const azureOpenAIKey = process.env.AZURE_OPENAI_API_KEY;
        
        if (azureOpenAIKey) {
          llmModel = setupLangChain({
            azureOpenAIApiKey: azureOpenAIKey,
            azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
            azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || 'gpt-4o',
            azureOpenAIApiVersion: '2023-12-01-preview' // Force working version
          });
          
          // Create analysis chain
          analysisFunction = createTradingAnalysisChain(llmModel);
          console.log('Azure OpenAI analysis chain set up successfully');
          llmProvider = 'azure';
        } else {
          console.warn('Missing AZURE_OPENAI_API_KEY for Azure integration');
        }
      } catch (error) {
        console.error('Failed to initialize Azure OpenAI:', error);
        llmModel = undefined;
      }
    }
    
    // If both LLM providers failed, use mock LLM
    if (!llmModel) {
      console.log('All LLM providers failed, creating TradingAgent with mock LLM capability');
      llmProvider = 'mock';
    }
    
    return new TradingAgent(agentkit, analysisFunction, memoryManager, llmProvider);
  } catch (error) {
    console.error('Failed to initialize agent with AgentKit:', error);
    console.log('Falling back to mock trading agent...');
    return new MockTradingAgent();
  }
}

/**
 * Trading agent implementation using AgentKit
 */
class TradingAgent implements Agent {
  constructor(
    private agentkit: AgentKit,
    private analysisChain: any,
    private memory: MemoryManager,
    private llmProvider: LLMProvider = 'mock'
  ) {
    console.log(`Trading agent initialized with ${llmProvider} LLM and Recall Memory`);
  }
  
  /**
   * Get agent status
   */
  async getStatus(): Promise<any> {
    try {
      const actions = this.agentkit.getActions();
      
      // Find wallet action to get address
      const getAddressAction = actions.find(action => action.name === 'get_wallet_address');
      if (!getAddressAction) {
        throw new Error('get_wallet_address action not found');
      }
      
      // Get wallet address
      const address = await getAddressAction.invoke({});
      
      // Find balance action
      const getBalanceAction = actions.find(action => action.name === 'get_wallet_balance');
      if (!getBalanceAction) {
        throw new Error('get_wallet_balance action not found');
      }
      
      // Get wallet balance
      const balanceWei = await getBalanceAction.invoke({});
      const balance = (BigInt(balanceWei) / BigInt(10**18)).toString();
      
      return {
        status: 'operational',
        wallet: {
          address,
          network: {
            protocolFamily: 'evm',
            chainId: process.env.CDP_NETWORK_ID === 'base-mainnet' ? '8453' : '84532',
            networkId: process.env.CDP_NETWORK_ID || 'base-sepolia'
          },
          balance
        },
        llmProvider: this.llmProvider,
        memoryProvider: 'recall-network',
        availableActions: actions.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting agent status:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Generate a mock portfolio analysis based on provided data
   * Used when Azure OpenAI or Gemini are not available
   */
  private generateMockAnalysis(portfolio: any, marketData: any): string {
    console.log('Generating mock portfolio analysis as LLM fallback');
    
    // Extract portfolio allocation
    const totalValue = portfolio.totalValue || 
      Object.values(portfolio.assets).reduce((sum: number, asset: any) => sum + asset.value, 0);
    
    // Create asset breakdown
    const assetBreakdown = Object.entries(portfolio.assets)
      .map(([symbol, data]: [string, any]) => {
        const percentage = (data.value / totalValue * 100).toFixed(2);
        return `- ${symbol}: ${data.amount} ${symbol} (${percentage}% of portfolio)`;
      })
      .join('\n');
    
    // Create market conditions summary
    const marketConditions = Object.entries(marketData)
      .map(([symbol, data]: [string, any]) => 
        `- ${symbol}: ${data.price} USD (${data.change24h}% 24h change)`
      )
      .join('\n');
    
    // Find assets with best and worst performance
    const sortedAssets = Object.entries(marketData)
      .filter(([symbol]) => symbol in portfolio.assets)
      .sort((a, b) => (b[1] as any).change24h - (a[1] as any).change24h);
    
    const bestPerformer = sortedAssets[0];
    const worstPerformer = sortedAssets[sortedAssets.length - 1];
    
    // Generate recommendations
    let recommendations = '## Recommendations\n\n';
    
    if (bestPerformer && (bestPerformer[1] as any).change24h > 0) {
      recommendations += `1. **Consider taking profits on ${bestPerformer[0]}**: With ${(bestPerformer[1] as any).change24h}% gains in the last 24 hours, consider taking some profits.\n\n`;
    }
    
    if (worstPerformer && (worstPerformer[1] as any).change24h < 0) {
      recommendations += `2. **Monitor ${worstPerformer[0]} position**: With ${(worstPerformer[1] as any).change24h}% decline in the last 24 hours, closely monitor this position.\n\n`;
    }
    
    // Add diversification recommendation if more than 50% is in one asset
    const highestConcentration = Object.entries(portfolio.assets)
      .reduce((highest, [symbol, data]: [string, any]) => {
        const percentage = data.value / totalValue * 100;
        return percentage > highest.percentage ? { symbol, percentage } : highest;
      }, { symbol: '', percentage: 0 });
    
    if (highestConcentration.percentage > 50) {
      recommendations += `3. **Consider diversification**: ${highestConcentration.symbol} represents ${highestConcentration.percentage.toFixed(2)}% of your portfolio. Consider reducing exposure to minimize risk.\n\n`;
    }
    
    // Add stablecoin recommendation if less than 20% in stablecoins
    const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD'];
    const stablecoinPercentage = Object.entries(portfolio.assets)
      .filter(([symbol]) => stablecoins.includes(symbol))
      .reduce((sum, [_, data]: [string, any]) => sum + data.value / totalValue * 100, 0);
    
    if (stablecoinPercentage < 20) {
      recommendations += `4. **Increase stablecoin reserves**: Current stablecoin allocation is ${stablecoinPercentage.toFixed(2)}%. Consider increasing to at least 20% to have capital ready for opportunities.\n\n`;
    }
    
    // Generate full analysis report
    return `# Portfolio Analysis Report
    
## Portfolio Summary

Total Portfolio Value: $${totalValue.toFixed(2)}

### Asset Allocation
${assetBreakdown}

## Market Conditions
${marketConditions}

${recommendations}

## Risk Assessment

Portfolio risk level: ${stablecoinPercentage < 10 ? 'High' : stablecoinPercentage < 30 ? 'Medium' : 'Low'}

This is an automated analysis based on current market conditions and portfolio allocation. Consider consulting with a financial advisor before making investment decisions.`;
  }
  
  /**
   * Analyze portfolio using AI with proper error handling and fallbacks
   */
  async analyzePortfolio(portfolio: any, marketData: any): Promise<any> {
    const decisionId = uuidv4().substring(0, 8);
    
    console.log(`Starting portfolio analysis with decision ID: ${decisionId}`);
    console.log('Portfolio:', JSON.stringify(portfolio, null, 2));
    console.log('Market data:', JSON.stringify(marketData, null, 2));
    
    try {
      let analysis;
      
      // If we're using the mock LLM, generate mock analysis
      if (this.llmProvider === 'mock') {
        console.log('Using mock LLM for analysis');
        analysis = this.generateMockAnalysis(portfolio, marketData);
      } else {
        console.log(`Using ${this.llmProvider} for analysis`);
        
        // Ensure we have a LangChain analysis chain
        if (!this.analysisChain) {
          console.warn('Analysis chain not available, falling back to mock analysis');
          analysis = this.generateMockAnalysis(portfolio, marketData);
        } else {
          try {
            // Run portfolio analysis through LLM
            const analysisInput = {
              portfolio: JSON.stringify(portfolio),
              marketData: JSON.stringify(marketData),
              date: new Date().toISOString().split('T')[0]
            };
            
            // Call the appropriate analysis function depending on provider
            if (this.llmProvider === 'gemini') {
              // Direct Gemini implementation
              analysis = await this.analysisChain(analysisInput as GeminiAnalysisInput);
            } else {
              // LangChain implementation for Azure
              analysis = await this.analysisChain.invoke(analysisInput);
            }
            
            console.log('Analysis completed successfully');
          } catch (error) {
            console.error('Error running LLM analysis:', error);
            console.log('Falling back to mock analysis');
            analysis = this.generateMockAnalysis(portfolio, marketData);
          }
        }
      }
      
      // Store analysis in memory with the decision ID
      const memoryEntry: MemoryEntry = {
        id: decisionId,
        timestamp: Date.now(),
        type: 'analysis',
        decision: {
          portfolio: JSON.stringify(portfolio),
          marketData: JSON.stringify(marketData),
          analysis
        }
      };
      
      // Store in memory
      await this.memory.storeMemory(memoryEntry);
      
      // Return the analysis with metadata
      return {
        decisionId,
        timestamp: new Date().toISOString(),
        analysis,
        provider: this.llmProvider
      };
    } catch (error) {
      console.error('Error in portfolio analysis:', error);
      
      // Return error information
      return {
        decisionId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        provider: this.llmProvider
      };
    }
  }
  
  /**
   * Execute a trade with AI analysis
   */
  async executeTrade(tradeType: string, fromAsset: string, toAsset: string, amount: number): Promise<any> {
    const tradeId = uuidv4().substring(0, 8);
    
    console.log(`Starting trade execution with trade ID: ${tradeId}`);
    console.log(`Trade details: ${tradeType} ${amount} ${fromAsset} to ${toAsset}`);
    
    try {
      // Get current market data
      const marketData = {
        // Mock market data for now, would be retrieved from an API in production
        [fromAsset]: {
          price: 100.0,
          change24h: -2.5
        },
        [toAsset]: {
          price: 1.0,
          change24h: 0.1
        }
      };
      
      // Analyze the trade
      const tradeAnalysis = await this.analyzeTradeDecision(
        tradeId, 
        tradeType, 
        fromAsset, 
        toAsset, 
        amount, 
        marketData
      );
      
      // Execute the trade using AgentKit actions
      // This is a simplification, actual implementation would handle approval, gas estimation, etc.
      let executionResult;
      
      try {
        // Find the appropriate action from AgentKit
        const actions = this.agentkit.getActions();
        const swapAction = actions.find(action => action.name === 'swap_tokens');
        
        if (!swapAction) {
          throw new Error('Swap action not available');
        }
        
        // Execute the swap
        executionResult = await swapAction.invoke({
          fromToken: fromAsset,
          toToken: toAsset,
          amount: amount.toString()
        });
        
        console.log('Trade executed successfully:', executionResult);
      } catch (executionError) {
        console.error('Error executing trade:', executionError);
        executionResult = {
          status: 'failed',
          error: executionError instanceof Error ? executionError.message : String(executionError)
        };
      }
      
      // Store the complete trade data in memory
      const memoryEntry: MemoryEntry = {
        id: tradeId,
        timestamp: Date.now(),
        type: 'trade',
        decision: {
          tradeType,
          fromAsset,
          toAsset,
          amount,
          marketData: JSON.stringify(marketData),
          analysis: tradeAnalysis,
          result: executionResult
        }
      };
      
      // Store in memory
      await this.memory.storeMemory(memoryEntry);
      
      // Return execution result with metadata
      return {
        tradeId,
        timestamp: new Date().toISOString(),
        tradeDetails: {
          tradeType,
          fromAsset,
          toAsset,
          amount
        },
        analysis: tradeAnalysis,
        execution: executionResult
      };
    } catch (error) {
      console.error('Error in trade execution:', error);
      
      // Return error information
      return {
        tradeId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        tradeDetails: {
          tradeType,
          fromAsset,
          toAsset,
          amount
        }
      };
    }
  }
  
  /**
   * Analyze a trade decision using the LLM
   */
  private async analyzeTradeDecision(
    tradeId: string, 
    tradeType: string, 
    fromAsset: string, 
    toAsset: string, 
    amount: number, 
    marketData: any
  ): Promise<string> {
    // If we're using the mock LLM, return a mock analysis
    if (this.llmProvider === 'mock' || !this.analysisChain) {
      return this.generateMockTradeAnalysis(tradeType, fromAsset, toAsset, amount, marketData);
    }
    
    // Otherwise, use the LLM for analysis
    try {
      const llmInput = {
        tradeType,
        fromAsset,
        toAsset,
        fromAmount: amount,
        marketData: JSON.stringify(marketData),
        date: new Date().toISOString().split('T')[0]
      };
      
      let analysis;
      
      if (this.llmProvider === 'gemini') {
        // For Gemini, we use the direct implementation
        analysis = await this.analysisChain(llmInput as GeminiTradeInput);
      } else {
        // For Azure, use the LangChain analysis chain
        analysis = await this.analysisChain.invoke(llmInput);
      }
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing trade with LLM:', error);
      return this.generateMockTradeAnalysis(tradeType, fromAsset, toAsset, amount, marketData);
    }
  }
  
  /**
   * Generate a mock trade analysis when LLM is not available
   */
  private generateMockTradeAnalysis(
    tradeType: string, 
    fromAsset: string, 
    toAsset: string, 
    amount: number, 
    marketData: any
  ): string {
    return `# Trade Analysis
    
## Trade Details
- Type: ${tradeType}
- From: ${amount} ${fromAsset}
- To: ${toAsset}

## Market Conditions
- ${fromAsset} price: $${marketData[fromAsset]?.price || 'unknown'} (24h change: ${marketData[fromAsset]?.change24h || 'unknown'}%)
- ${toAsset} price: $${marketData[toAsset]?.price || 'unknown'} (24h change: ${marketData[toAsset]?.change24h || 'unknown'}%)

## Analysis
This is a mock analysis generated because the AI analysis system is not available.

The trade appears to be ${marketData[fromAsset]?.change24h < 0 && marketData[toAsset]?.change24h > 0 ? 'favorable' : 'risky'} based on simple heuristics:
- ${fromAsset} is ${marketData[fromAsset]?.change24h < 0 ? 'declining' : 'rising'} in value
- ${toAsset} is ${marketData[toAsset]?.change24h > 0 ? 'gaining' : 'losing'} value

## Recommendation
Proceed with caution. This is an automated fallback analysis and does not represent actual market insights.`;
  }
  
  /**
   * Get the history of reasoning for a specific decision
   */
  async getReasoningHistory(decisionId: string): Promise<any> {
    try {
      // Retrieve the memory entry
      const entry = await this.memory.getMemory(decisionId);
      
      if (!entry) {
        return {
          status: 'not_found',
          message: `No decision found with ID: ${decisionId}`
        };
      }
      
      // Format and return the entry
      return {
        decisionId: entry.id,
        timestamp: new Date(entry.timestamp).toISOString(),
        type: entry.type,
        reasoning: entry.decision
      };
    } catch (error) {
      console.error('Error retrieving reasoning history:', error);
      
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get the memory manager instance
   */
  getMemoryManager(): MemoryManager {
    return this.memory;
  }
}

// Re-export the MockTradingAgent for convenience
export { MockTradingAgent };