// Mock Trading Agent Implementation
import { v4 as uuidv4 } from 'uuid';
import { Agent } from './index.js';
import { MemoryManager, RecallMemoryManager } from '../services/recall-memory.js';

/**
 * Mock Trading Agent Implementation
 * 
 * This implementation is used for testing and development
 * when real LLM services are not available.
 */
export class MockTradingAgent implements Agent {
  private mockMemoryStore: Map<string, any> = new Map();
  private address: string;
  
  constructor(address?: string) {
    this.address = address || `0x${Math.random().toString(16).substring(2, 10)}70591331daa4b${Math.random().toString(16).substring(2, 10)}`;
    console.log('Mock Trading Agent initialized with address:', this.address);
  }
  
  /**
   * Get agent status
   */
  async getStatus(): Promise<any> {
    return {
      status: 'operational',
      wallet: {
        address: this.address,
        network: {
          protocolFamily: 'evm',
          chainId: '84532',
          networkId: 'base-sepolia'
        },
        balance: '1.5'
      },
      llmProvider: 'mock',
      memoryProvider: 'local',
      availableActions: ['swap', 'transfer', 'get_tokens'],
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Analyze portfolio using mock data
   */
  async analyzePortfolio(portfolio: any, marketData: any): Promise<any> {
    const decisionId = uuidv4().substring(0, 8);
    
    console.log('Mock portfolio analysis with ID:', decisionId);
    console.log('Portfolio:', JSON.stringify(portfolio, null, 2));
    console.log('Market data:', JSON.stringify(marketData, null, 2));
    
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
    
    // Analysis text
    const analysis = `# Portfolio Analysis

## Portfolio Summary

Total Portfolio Value: $${totalValue.toFixed(2)}

### Asset Allocation
${assetBreakdown}

## Market Conditions
${marketConditions}

${recommendations}

## Risk Assessment

Portfolio risk level: ${highestConcentration.percentage > 70 ? 'High' : highestConcentration.percentage > 40 ? 'Medium' : 'Low'}

This is a mock analysis generated for demonstration purposes. It does not represent real financial advice.`;
    
    // Return mock analysis
    return {
      decisionId,
      timestamp: new Date().toISOString(),
      analysis,
      provider: 'mock'
    };
  }
  
  /**
   * Execute a mock trade
   */
  async executeTrade(tradeType: string, fromAsset: string, toAsset: string, amount: number): Promise<any> {
    const tradeId = uuidv4().substring(0, 8);
    
    console.log(`Mock trade execution with ID: ${tradeId}`);
    console.log(`Trade details: ${tradeType} ${amount} ${fromAsset} to ${toAsset}`);
    
    // Mock market data
    const mockMarketData = {
      [fromAsset]: {
        price: 100.0,
        change24h: -2.5
      },
      [toAsset]: {
        price: 1.0,
        change24h: 0.1
      }
    };
    
    // Calculate amounts
    const priceRatio = mockMarketData[fromAsset].price / mockMarketData[toAsset].price;
    const estimatedReceived = amount * priceRatio * 0.99; // 1% slippage
    
    // Mock analysis
    const analysis = `# Trade Analysis

## Trade Details
- Type: ${tradeType}
- From: ${amount} ${fromAsset}
- To: ${toAsset}

## Market Conditions
- ${fromAsset} price: $${mockMarketData[fromAsset]?.price} (24h change: ${mockMarketData[fromAsset]?.change24h}%)
- ${toAsset} price: $${mockMarketData[toAsset]?.price} (24h change: ${mockMarketData[toAsset]?.change24h}%)

## Analysis
The trade appears to be ${mockMarketData[fromAsset].change24h < 0 && mockMarketData[toAsset].change24h > 0 ? 'favorable' : 'risky'} based on market movements.

## Recommendation
Trade with caution. This is a mock analysis for demonstration purposes.`;
    
    // Mock execution result
    const executionResult = {
      status: 'completed',
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      fromAmount: amount,
      toAmount: estimatedReceived.toFixed(6),
      timestamp: new Date().toISOString()
    };
    
    // Return mock trade execution result
    return {
      tradeId,
      timestamp: new Date().toISOString(),
      tradeDetails: {
        tradeType,
        fromAsset,
        toAsset,
        amount
      },
      analysis,
      execution: executionResult
    };
  }
  
  /**
   * Get mock reasoning history
   */
  async getReasoningHistory(decisionId: string): Promise<any> {
    return {
      decisionId,
      timestamp: new Date().toISOString(),
      type: 'mock_decision',
      reasoning: {
        note: 'This is a mock reasoning history for ID: ' + decisionId
      }
    };
  }

  /**
   * Get memory manager for external queries
   */
  getMemoryManager(): MemoryManager {
    // Create a minimal memory manager implementation
    return new RecallMemoryManager(
      'mock-key',
      'mock-bucket',
      'testnet'
    );
  }
} 