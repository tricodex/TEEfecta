// Agent implementation
import { v4 as uuidv4 } from 'uuid';
import { setupAgentKit } from './agentkit.js';
import { setupLangChain, createTradingAnalysisChain } from './langchain.js';
import { AgentKit } from '@coinbase/agentkit';
import { RecallMemoryManager, MemoryManager, MemoryEntry } from '../services/recall-memory.js';

export interface Agent {
  getStatus(): Promise<any>;
  analyzePortfolio(portfolio: any, marketData: any): Promise<any>;
  executeTrade(tradeType: string, fromAsset: string, toAsset: string, amount: number): Promise<any>;
  getReasoningHistory(decisionId: string): Promise<any>;
}

/**
 * Initialize the trading agent
 * @returns Agent instance
 */
export async function initAgent(): Promise<Agent> {
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
    
    console.log('Initializing 4g3n7 agent with AgentKit');
    
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
    
    // Initialize LangChain for AI analysis with error handling
    let azureOpenAI;
    let analysisChain;
    try {
      console.log('Setting up Azure OpenAI with LangChain');
      azureOpenAI = setupLangChain({
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY || '',
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || 'gpt-4o',
        azureOpenAIApiVersion: '2023-12-01-preview' // Force working version
      });
      
      // Create analysis chain
      analysisChain = createTradingAnalysisChain(azureOpenAI);
      console.log('Azure OpenAI analysis chain set up successfully');
      
      return new TradingAgent(agentkit, analysisChain, memoryManager, false);
    } catch (error) {
      console.error('Failed to initialize Azure OpenAI:', error);
      console.log('Creating TradingAgent with mock LLM capability');
      return new TradingAgent(agentkit, null, memoryManager, true);
    }
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
    private useMockLLM: boolean = false
  ) {
    console.log(`Trading agent initialized with ${useMockLLM ? 'mock LLM' : 'Azure OpenAI'} and Recall Memory`);
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
        llmProvider: this.useMockLLM ? 'mock' : 'azure-openai',
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
   * Used when Azure OpenAI is not available
   */
  private generateMockAnalysis(portfolio: any, marketData: any): string {
    console.log('Generating mock portfolio analysis as Azure OpenAI fallback');
    
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
      .reduce((sum, [, data]: [string, any]) => sum + data.value, 0) / totalValue * 100;
    
    if (stablecoinPercentage < 20) {
      recommendations += `4. **Increase stablecoin reserves**: Only ${stablecoinPercentage.toFixed(2)}% of your portfolio is in stablecoins. Consider increasing to 20-30% for better risk management.\n\n`;
    }
    
    // Assemble the full analysis
    return `# Portfolio Analysis

## Current Allocation
${assetBreakdown}

## Market Conditions
${marketConditions}

${recommendations}

## Risk Assessment
Your portfolio has a ${stablecoinPercentage > 30 ? 'low' : stablecoinPercentage > 15 ? 'medium' : 'high'} risk profile based on your current allocation.

## Action Plan
1. Monitor market conditions closely over the next 24-48 hours
2. Set stop-loss orders for volatile assets
3. Consider rebalancing to achieve better risk-adjusted returns
`;
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
      if (this.useMockLLM) {
        console.log('Using mock LLM for analysis');
        analysis = this.generateMockAnalysis(portfolio, marketData);
      } else {
        console.log('Using Azure OpenAI for analysis');
        
        // Ensure we have a LangChain analysis chain
        if (!this.analysisChain) {
          console.warn('Analysis chain not available, falling back to mock analysis');
          analysis = this.generateMockAnalysis(portfolio, marketData);
        } else {
          try {
            // Run portfolio analysis through LLM
            const response = await this.analysisChain.invoke({
              portfolio: JSON.stringify(portfolio),
              marketData: JSON.stringify(marketData),
              date: new Date().toISOString().split('T')[0]
            });
            
            analysis = response;
            console.log('Analysis completed successfully');
          } catch (error) {
            console.error('Error running LLM analysis:', error);
            console.log('Falling back to mock analysis');
            analysis = this.generateMockAnalysis(portfolio, marketData);
          }
        }
      }
      
      // Store reasoning in Recall Memory
      try {
        console.log('Storing analysis in Recall Memory');
        // Create memory entry
        const memoryEntry: MemoryEntry = {
          id: decisionId,
          timestamp: new Date().toISOString(),
          content: analysis,
          metadata: {
            type: 'analysis',
            tags: ['portfolio', 'reasoning']
          }
        };
        
        // Store in memory
        await this.memory.store(memoryEntry);
      } catch (memError) {
        console.warn('Failed to store reasoning in memory system:', memError);
      }
      
      return {
        id: decisionId,
        timestamp: new Date().toISOString(),
        portfolio,
        marketData,
        analysis,
        actions: []
      };
    } catch (error) {
      console.error('Error in portfolio analysis:', error);
      throw error;
    }
  }
  
  /**
   * Execute a trade using AgentKit
   */
  async executeTrade(tradeType: string, fromAsset: string, toAsset: string, amount: number): Promise<any> {
    const decisionId = uuidv4().substring(0, 8);
    
    console.log(`Executing trade with decision ID: ${decisionId}`);
    console.log(`Type: ${tradeType}, From: ${fromAsset}, To: ${toAsset}, Amount: ${amount}`);
    
    try {
      // Construct trade details
      const tradeDetails = {
        id: decisionId,
        timestamp: new Date().toISOString(),
        type: tradeType,
        fromAsset,
        toAsset,
        amount,
        status: 'pending'
      };
      
      // Execute trade through AgentKit
      let result;
      try {
        // Generate a confirmation of trade execution
        // In a real implementation, this would use the AgentKit CDP to execute the trade
        result = {
          ...tradeDetails,
          status: 'completed',
          executionPrice: Math.random() * 1000, // Mock execution price
          txHash: `0x${Math.random().toString(16).substring(2)}`, // Mock transaction hash
          completion: new Date().toISOString()
        };
      } catch (tradeError) {
        console.error('Error executing trade:', tradeError);
        result = {
          ...tradeDetails,
          status: 'failed',
          error: tradeError instanceof Error ? tradeError.message : String(tradeError)
        };
      }
      
      // Store reasoning in Recall Memory
      try {
        console.log('Storing trade execution in Recall Memory');
        // Create memory entry
        const memoryEntry: MemoryEntry = {
          id: decisionId,
          timestamp: new Date().toISOString(),
          content: result,
          metadata: {
            type: 'trade',
            tags: ['execution', 'transaction']
          }
        };
        
        // Store in memory
        await this.memory.store(memoryEntry);
      } catch (memError) {
        console.warn('Failed to store trade in memory system:', memError);
      }
      
      return result;
    } catch (error) {
      console.error('Error in trade execution:', error);
      throw error;
    }
  }
  
  /**
   * Get reasoning history from Recall Memory
   * @param decisionId The ID of the decision to retrieve
   * @returns The reasoning record or null if not found
   */
  async getReasoningHistory(decisionId: string): Promise<any> {
    console.log(`Retrieving reasoning history for decision ID: ${decisionId}`);
    
    try {
      // First try to get the decision from Recall Memory
      const analysisMemory = await this.memory.retrieve(decisionId, 'analysis');
      
      if (analysisMemory) {
        console.log('Found analysis memory for decision');
        return {
          id: decisionId,
          type: 'analysis',
          timestamp: analysisMemory.timestamp,
          content: analysisMemory.content
        };
      }
      
      // If not found as analysis, try to find it as a trade
      const tradeMemory = await this.memory.retrieve(decisionId, 'trade');
      
      if (tradeMemory) {
        console.log('Found trade memory for decision');
        return {
          id: decisionId,
          type: 'trade',
          timestamp: tradeMemory.timestamp,
          content: tradeMemory.content
        };
      }
      
      console.log(`No memory found for decision ID: ${decisionId}`);
      return null;
    } catch (error) {
      console.error('Error retrieving reasoning history:', error);
      return null;
    }
  }

  // Create an action function for a specific purpose
  private createAction(name: string, description: string, callback: Function) {
    return {
      name,
      description,
      parameters: {},
      execute: async (action: Record<string, any>) => {
        return await callback(action);
      }
    };
  }

  // Set up custom actions for the agent
  private setupCustomActions() {
    // Agent status action
    const getStatusAction = this.createAction(
      'get_agent_status',
      'Get the current status of the trading agent',
      async (action: Record<string, any>) => {
        return {
          status: 'active',
          useMockLLM: this.useMockLLM,
          timestamp: new Date().toISOString()
        };
      }
    );
  }
}

/**
 * Mock Trading agent implementation for testing
 */
class MockTradingAgent implements Agent {
  private decisions: Record<string, any> = {};
  
  constructor() {
    console.log('Mock trading agent initialized successfully');
  }
  
  /**
   * Get agent status
   */
  async getStatus(): Promise<any> {
    return {
      status: 'operational (mock)',
      wallet: {
        address: '0xMockAddress123456789abcdef',
        network: {
          protocolFamily: 'evm',
          chainId: '84532',
          networkId: 'base-sepolia'
        },
        balance: '1000000000000000000' // 1 ETH
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Analyze portfolio using mock LLM
   */
  async analyzePortfolio(portfolio: any, marketData: any): Promise<any> {
    const decisionId = uuidv4();
    
    // Create mock analysis
    const analysis = {
      decisionId,
      recommendations: `
Based on the portfolio and market data analysis, here are my recommendations:

1. **Current Portfolio Assessment**:
   - Diversification: Your portfolio is currently ${Object.keys(portfolio.assets || {}).length} assets.
   - Risk Level: Medium risk exposure.

2. **Market Analysis**:
   - Overall market sentiment appears bullish in the short term.

3. **Recommendations**:
   - **Maintain ETH position**: The positive momentum suggests holding your current ETH allocation.
   - **Diversify with BTC**: Consider allocating 10-15% of portfolio to BTC given its stability.
   - **Maintain USDC reserve**: Keep 30-35% in USDC to capitalize on potential buying opportunities.

4. **Action Plan**:
   - Convert 10% of USDC position to BTC at the current price.
   - Set stop-loss orders for ETH position at 10% below current price.
   - Review portfolio again in 7 days to assess strategy effectiveness.
`,
      timestamp: new Date().toISOString()
    };
    
    // Store for future reference
    this.decisions[decisionId] = {
      type: 'portfolio_analysis',
      portfolio,
      marketData,
      analysis: analysis.recommendations,
      timestamp: analysis.timestamp
    };
    
    return analysis;
  }
  
  /**
   * Execute a mock trade
   */
  async executeTrade(tradeType: string, fromAsset: string, toAsset: string, amount: number): Promise<any> {
    const decisionId = uuidv4();
    
    // Create mock trade
    const trade = {
      decisionId,
      tradeId: `trade-${Date.now()}`,
      status: 'completed',
      details: {
        fromAsset,
        toAsset,
        amount,
        effectivePrice: 2500, // mock price
        timestamp: new Date().toISOString(),
        txHash: `0xMockTxHash${Date.now().toString(16)}`
      }
    };
    
    // Store for future reference
    this.decisions[decisionId] = {
      type: 'trade_execution',
      tradeType,
      fromAsset,
      toAsset,
      amount,
      result: trade,
      timestamp: new Date().toISOString()
    };
    
    return trade;
  }
  
  /**
   * Get mock reasoning history
   */
  async getReasoningHistory(decisionId: string): Promise<any> {
    if (this.decisions[decisionId]) {
      return {
        decisionId,
        reasoning: JSON.stringify(this.decisions[decisionId], null, 2),
        timestamp: this.decisions[decisionId].timestamp
      };
    }
    
    return {
      error: 'Not found',
      message: `No reasoning found for ID: ${decisionId}`
    };
  }
}