import { LLMService } from './llm-service.js';

/**
 * Mock LLM Service Implementation
 * Provides hard-coded responses for testing
 */
export class MockLLMService implements LLMService {
  private initialized: boolean = true;
  
  constructor() {
    console.log('Mock LLM service initialized');
  }
  
  /**
   * Generate text from a prompt
   */
  async generateText(prompt: string): Promise<string> {
    console.log(`Mock LLM generating text for prompt: ${prompt.substring(0, 50)}...`);
    
    // Return different mock responses based on prompt content
    if (prompt.includes('portfolio')) {
      return this.generatePortfolioAnalysis(prompt);
    } else if (prompt.includes('trade')) {
      return this.generateTradeAnalysis(prompt);
    } else {
      return 'This is a mock response from the LLM service.';
    }
  }
  
  /**
   * Generate structured data in JSON format
   */
  async generateStructuredData<T>(prompt: string, schema: any): Promise<T> {
    console.log(`Mock LLM generating structured data for prompt: ${prompt.substring(0, 50)}...`);
    
    // Return a mock object that matches the expected schema shape
    return {
      success: true,
      timestamp: new Date().toISOString(),
      analysis: 'This is a mock structured analysis',
      recommendations: ['Hold ETH', 'Buy BTC', 'Sell ADA']
    } as unknown as T;
  }
  
  /**
   * Health check - always returns true for mock implementation
   */
  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }
  
  /**
   * Generate a mock portfolio analysis
   */
  private generatePortfolioAnalysis(prompt: string): string {
    return `# Portfolio Analysis

## Current Allocation
- ETH: 60% (High concentration)
- USDC: 25%
- BTC: 15%

## Market Conditions
The market is showing mixed signals with ETH up 2.5% over the last 24 hours, while BTC is down 1.2%.
Stablecoins remain stable as expected.

## Strengths
- Strong position in Ethereum, which is showing positive momentum
- Healthy stablecoin reserves for buying opportunities
- Exposure to blue-chip crypto assets

## Weaknesses
- Possibly overexposed to ETH (60% allocation)
- Limited diversification across smaller-cap assets
- No DeFi yield-generating positions

## Recommendations
1. **Consider rebalancing ETH position**: Reduce ETH from 60% to 45-50% of the portfolio to manage risk
2. **Increase BTC allocation**: Add 5-10% more BTC to improve diversification
3. **Explore DeFi opportunities**: Allocate 5-10% to yield-generating positions
4. **Set stop-loss orders**: Protect downside with stop-loss at 10% below current prices

## Risk Assessment
Current portfolio risk: MEDIUM-HIGH
Recommended actions would reduce risk to: MEDIUM

This analysis is based on current market conditions and may need adjustment as the market evolves.`;
  }
  
  /**
   * Generate a mock trade analysis
   */
  private generateTradeAnalysis(prompt: string): string {
    const tradeType = prompt.includes('swap') ? 'swap' : 'transfer';
    
    return `# Trade Analysis

## Trade Overview
${tradeType.toUpperCase()} transaction from ETH to USDC

## Market Timing
Ethereum is currently trading in a neutral pattern, having recently broken above the $1,600 resistance level. There's notable support at $1,550 and resistance at $1,700.

## Risk Assessment
- **Transaction Risk**: LOW
- **Market Risk**: MEDIUM
- **Timing Risk**: NEUTRAL

## Trade Recommendation
This trade appears to be **FAVORABLE** at the current time.

The conversion from ETH to USDC is sensible given the recent price appreciation in ETH. Taking partial profits and increasing your stablecoin reserves will improve portfolio risk metrics and provide liquidity for future opportunities.

## Additional Considerations
- Consider executing the trade in multiple batches to average out execution price
- Current gas fees are moderate; timing is appropriate for execution
- Watch for potential volatility around upcoming economic data releases`;
  }
} 