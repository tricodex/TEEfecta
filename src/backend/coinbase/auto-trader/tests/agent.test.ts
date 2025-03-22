import { expect, test, describe, beforeEach } from 'bun:test';
import { MockTradingAgent } from '../src/agent/index.js';
import { createAgent, AgentConfig } from '../src/create-agent.js';

describe('Trading Agent Tests', () => {
  let mockAgent: MockTradingAgent;
  
  beforeEach(() => {
    // Create a fresh mock agent for each test
    mockAgent = new MockTradingAgent();
  });
  
  test('should initialize with a valid address', async () => {
    const status = await mockAgent.getStatus();
    expect(status).toBeDefined();
    expect(status.wallet.address).toBeDefined();
    expect(typeof status.wallet.address).toBe('string');
    expect(status.wallet.address.startsWith('0x')).toBe(true);
    expect(status.wallet.address.length).toBeGreaterThan(10);
  });
  
  test('should analyze portfolio and return markdown content', async () => {
    // Mock portfolio and market data
    const portfolio = {
      totalValue: 1000,
      assets: {
        'ETH': { amount: 0.5, value: 800 },
        'USDC': { amount: 200, value: 200 }
      }
    };
    
    const marketData = {
      'ETH': { price: 1600, change24h: 2.5 },
      'USDC': { price: 1, change24h: 0 },
      'BTC': { price: 28000, change24h: -1.2 }
    };
    
    const result = await mockAgent.analyzePortfolio(portfolio, marketData);
    
    // Verify result has expected structure
    expect(result.decisionId).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.analysis).toBeDefined();
    
    // Verify analysis contains markdown content
    expect(typeof result.analysis).toBe('string');
    expect(result.analysis.includes('# Portfolio Analysis')).toBe(true);
    expect(result.analysis.includes('Asset Allocation')).toBe(true);
  });
  
  test('should execute a trade and return transaction details', async () => {
    const result = await mockAgent.executeTrade('swap', 'ETH', 'USDC', 0.1);
    
    // Verify result has expected structure
    expect(result.tradeId).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.tradeDetails).toBeDefined();
    expect(result.execution).toBeDefined();
    
    // Verify trade details
    expect(result.tradeDetails.tradeType).toBe('swap');
    expect(result.tradeDetails.fromAsset).toBe('ETH');
    expect(result.tradeDetails.toAsset).toBe('USDC');
    expect(result.tradeDetails.amount).toBe(0.1);
    
    // Verify execution details
    expect(result.execution.status).toBe('completed');
    expect(result.execution.transactionHash).toBeDefined();
    expect(result.execution.transactionHash.startsWith('0x')).toBe(true);
  });
  
  test('should get reasoning history for a decision', async () => {
    // First create a portfolio analysis to get a decision ID
    const portfolio = {
      totalValue: 1000,
      assets: {
        'ETH': { amount: 0.5, value: 800 },
        'USDC': { amount: 200, value: 200 }
      }
    };
    
    const marketData = {
      'ETH': { price: 1600, change24h: 2.5 },
      'USDC': { price: 1, change24h: 0 }
    };
    
    const analysisResult = await mockAgent.analyzePortfolio(portfolio, marketData);
    const decisionId = analysisResult.decisionId;
    
    // Now get the reasoning history for this decision
    const historyResult = await mockAgent.getReasoningHistory(decisionId);
    
    // Verify the result
    expect(historyResult).toBeDefined();
    expect(historyResult.decisionId).toBe(decisionId);
    expect(historyResult.timestamp).toBeDefined();
  });
  
  test('should create a mock agent with factory function', async () => {
    const config: AgentConfig = {
      llmProvider: 'mock',
      memoryProvider: 'local'
    };
    
    const agent = await createAgent(config);
    
    // Verify the agent was created successfully
    expect(agent).toBeDefined();
    
    // Verify it's a mock agent by checking its status
    const status = await agent.getStatus();
    expect(status.llmProvider).toBe('mock');
  });
  
  test('should fall back to mock agent if Azure initialization fails', async () => {
    // Intentionally use Azure without proper configuration
    const config: AgentConfig = {
      llmProvider: 'azure',
      memoryProvider: 'local'
    };
    
    // Should fall back to mock agent
    const agent = await createAgent(config);
    expect(agent).toBeDefined();
    
    // Verify we can still use it like a mock agent
    const status = await agent.getStatus();
    expect(status).toBeDefined();
  });
}); 