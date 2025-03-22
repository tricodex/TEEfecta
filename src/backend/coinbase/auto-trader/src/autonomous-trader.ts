import { Agent } from './agent/index.js';
import { getWebSocketService } from './services/websocket.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * AutonomousTrader runs background trading operations at scheduled intervals
 */
export class AutonomousTrader {
  private agent: Agent;
  private interval: NodeJS.Timeout | null = null;
  private isEnabled: boolean;
  private intervalMinutes: number;
  private riskLevel: string;
  private websocketService = getWebSocketService();
  
  constructor(agent: Agent) {
    this.agent = agent;
    this.isEnabled = process.env.ENABLE_AUTONOMOUS_MODE === 'true';
    this.intervalMinutes = parseInt(process.env.AUTONOMOUS_INTERVAL_MINUTES || '60', 10);
    this.riskLevel = process.env.RISK_LEVEL || 'medium';
    
    if (this.isEnabled) {
      console.log(`Autonomous trader initialized with ${this.intervalMinutes} minute interval and ${this.riskLevel} risk level`);
    } else {
      console.log('Autonomous trader is disabled by configuration');
    }
  }
  
  /**
   * Start the autonomous trading cycle
   */
  public start(): void {
    if (!this.isEnabled) {
      console.log('Autonomous mode is disabled, not starting');
      return;
    }
    
    console.log(`Starting autonomous trader with ${this.intervalMinutes} minute interval`);
    
    // Run immediately on start
    this.executeCycle();
    
    // Schedule regular execution
    const intervalMs = this.intervalMinutes * 60 * 1000;
    this.interval = setInterval(() => this.executeCycle(), intervalMs);
    
    // Broadcast start event
    this.websocketService.broadcast('autonomous_started', {
      interval: this.intervalMinutes,
      riskLevel: this.riskLevel,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Stop the autonomous trading cycle
   */
  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Autonomous trader stopped');
      
      // Broadcast stop event
      this.websocketService.broadcast('autonomous_stopped', {
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Execute a single trading cycle
   */
  private async executeCycle(): Promise<void> {
    const cycleId = uuidv4().substring(0, 8);
    console.log(`Starting autonomous trading cycle ${cycleId}`);
    
    // Broadcast cycle start
    this.websocketService.broadcast('cycle_started', {
      cycleId,
      timestamp: new Date().toISOString()
    });
    
    try {
      // 1. Get market data
      this.websocketService.broadcast('agent_thinking', {
        cycleId,
        stage: 'market_analysis',
        message: 'Gathering current market data',
        timestamp: new Date().toISOString()
      });
      
      // Simulate market data collection
      const marketData = await this.collectMarketData();
      
      // 2. Analyze portfolio
      this.websocketService.broadcast('analysis_started', {
        cycleId,
        timestamp: new Date().toISOString()
      });
      
      const portfolioAnalysis = await this.agent.analyzePortfolio({ assets: {} }, marketData);
      
      this.websocketService.broadcast('analysis_completed', {
        cycleId,
        analysis: portfolioAnalysis,
        timestamp: new Date().toISOString()
      });
      
      // 3. Make trading decision
      this.websocketService.broadcast('agent_thinking', {
        cycleId,
        stage: 'decision_making',
        message: 'Making trading decisions based on analysis',
        timestamp: new Date().toISOString()
      });
      
      // Generate trading decision
      const tradingDecision = await this.generateTradingDecision(portfolioAnalysis);
      
      // 4. Execute trades if needed
      if (tradingDecision && tradingDecision.shouldTrade) {
        this.websocketService.broadcast('trade_started', {
          cycleId,
          tradeDetails: tradingDecision.trade,
          timestamp: new Date().toISOString()
        });
        
        const tradeResult = await this.agent.executeTrade(
          tradingDecision.trade.tradeType,
          tradingDecision.trade.fromAsset,
          tradingDecision.trade.toAsset,
          tradingDecision.trade.amount
        );
        
        this.websocketService.broadcast('trade_completed', {
          cycleId,
          tradeResult,
          timestamp: new Date().toISOString()
        });
      } else {
        this.websocketService.broadcast('no_trade_decision', {
          cycleId,
          reason: tradingDecision ? tradingDecision.reason : 'No trading opportunity identified',
          timestamp: new Date().toISOString()
        });
      }
      
      // 5. Complete cycle
      this.websocketService.broadcast('cycle_completed', {
        cycleId,
        result: 'success',
        timestamp: new Date().toISOString()
      });
      
      console.log(`Autonomous trading cycle ${cycleId} completed successfully`);
    } catch (error) {
      console.error(`Error in autonomous trading cycle ${cycleId}:`, error);
      
      this.websocketService.broadcast('cycle_error', {
        cycleId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Collect current market data from external sources
   */
  private async collectMarketData(): Promise<any> {
    // In a real implementation, this would fetch real-time data from exchanges or APIs
    const assets = ['ETH', 'BTC', 'USDC', 'WETH', 'MATIC'];
    const marketData: any = {};
    
    // Generate mock market data
    assets.forEach(asset => {
      const basePrice = this.getBasePrice(asset);
      const randomChange = (Math.random() * 8) - 4; // -4% to +4%
      
      marketData[asset] = {
        price: basePrice * (1 + (randomChange / 100)),
        change24h: randomChange,
        change7d: (Math.random() * 12) - 6 // -6% to +6%
      };
    });
    
    return marketData;
  }
  
  /**
   * Get a base price for an asset for mock data generation
   */
  private getBasePrice(asset: string): number {
    const prices: Record<string, number> = {
      'ETH': 3000,
      'BTC': 60000,
      'USDC': 1,
      'WETH': 3000,
      'MATIC': 0.80,
      'LINK': 15,
      'UNI': 8
    };
    
    return prices[asset] || 10; // Default price for unknown assets
  }
  
  /**
   * Generate a trading decision based on portfolio analysis
   */
  private async generateTradingDecision(analysis: any): Promise<any> {
    // In a real implementation, this would use more sophisticated logic
    // This is a simplified example that makes random decisions
    const shouldTrade = Math.random() > 0.7; // 30% chance of trading
    
    if (!shouldTrade) {
      return {
        shouldTrade: false,
        reason: 'Market conditions not favorable for trading'
      };
    }
    
    // For demo purposes, create a simple trade
    // In a real implementation, this would be based on the analysis
    const assets = ['ETH', 'BTC', 'USDC', 'WETH'];
    const fromAsset = assets[Math.floor(Math.random() * assets.length)];
    
    let toAsset;
    do {
      toAsset = assets[Math.floor(Math.random() * assets.length)];
    } while (toAsset === fromAsset);
    
    // Generate a random amount based on risk level
    let maxPercentage = 0.01; // 1% for low risk
    if (this.riskLevel === 'medium') {
      maxPercentage = 0.05; // 5% for medium risk
    } else if (this.riskLevel === 'high') {
      maxPercentage = 0.1; // 10% for high risk
    }
    
    const amount = Math.random() * maxPercentage * this.getBasePrice(fromAsset);
    
    return {
      shouldTrade: true,
      reason: 'Trading opportunity identified',
      trade: {
        tradeType: 'swap',
        fromAsset,
        toAsset,
        amount: parseFloat(amount.toFixed(6))
      }
    };
  }
  
  /**
   * Check if autonomous trading is enabled
   */
  public isAutonomousEnabled(): boolean {
    return this.isEnabled;
  }
  
  /**
   * Set the trading interval in minutes
   */
  public setInterval(minutes: number): void {
    this.intervalMinutes = minutes;
    
    if (this.interval) {
      // Restart with new interval
      this.stop();
      this.start();
    }
  }
  
  /**
   * Set the risk level
   */
  public setRiskLevel(level: string): void {
    if (['low', 'medium', 'high'].includes(level)) {
      this.riskLevel = level;
      console.log(`Risk level set to ${level}`);
    } else {
      console.error(`Invalid risk level: ${level}. Must be one of: low, medium, high`);
    }
  }
} 