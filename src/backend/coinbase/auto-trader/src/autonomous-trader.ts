import { Agent } from './agent/index.js';
import { getWebSocketService } from './services/websocket.js';
import { getAgentQueueService, TaskType, TaskPriority } from './services/agent-queue.js';
import { getConversationTracker, MessageType } from './services/conversation-tracker.js';
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
  private queueService = getAgentQueueService();
  private conversationTracker = getConversationTracker();
  private agentId: string = 'autonomous-trader';
  private currentConversationId: string | null = null;
  
  constructor(agent: Agent) {
    this.agent = agent;
    this.isEnabled = process.env.ENABLE_AUTONOMOUS_MODE === 'true';
    this.intervalMinutes = parseInt(process.env.AUTONOMOUS_INTERVAL_MINUTES || '60', 10);
    this.riskLevel = process.env.RISK_LEVEL || 'medium';
    
    // Create initial conversation for the autonomous trader
    this.createConversation();
    
    if (this.isEnabled) {
      console.log(`Autonomous trader initialized with ${this.intervalMinutes} minute interval and ${this.riskLevel} risk level`);
    } else {
      console.log('Autonomous trader is disabled by configuration');
    }
  }
  
  /**
   * Create a new conversation for the autonomous trader
   */
  private createConversation(): void {
    this.currentConversationId = this.conversationTracker.createConversation(
      `Autonomous Trading Session - ${new Date().toISOString()}`,
      [this.agentId],
      { 
        type: 'autonomous',
        riskLevel: this.riskLevel,
        intervalMinutes: this.intervalMinutes
      }
    );
    
    // Add initial system message
    this.conversationTracker.addMessage(
      this.currentConversationId,
      MessageType.SYSTEM,
      'system',
      `Autonomous trading session initialized with ${this.intervalMinutes} minute interval and ${this.riskLevel} risk level.`,
      { timestamp: new Date().toISOString() }
    );
    
    console.log(`Created new conversation ${this.currentConversationId} for autonomous trader`);
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
    
    // Log start to conversation
    if (this.currentConversationId) {
      this.conversationTracker.addMessage(
        this.currentConversationId,
        MessageType.SYSTEM,
        'system',
        `Autonomous trading session started. Will analyze the market every ${this.intervalMinutes} minutes.`,
        { timestamp: new Date().toISOString() }
      );
    }
    
    // Run immediately on start
    this.executeCycle();
    
    // Schedule regular execution
    const intervalMs = this.intervalMinutes * 60 * 1000;
    this.interval = setInterval(() => this.executeCycle(), intervalMs);
    
    // Broadcast start event
    this.websocketService.broadcast('autonomous_started', {
      interval: this.intervalMinutes,
      riskLevel: this.riskLevel,
      timestamp: new Date().toISOString(),
      conversationId: this.currentConversationId
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
      
      // Log stop to conversation
      if (this.currentConversationId) {
        this.conversationTracker.addMessage(
          this.currentConversationId,
          MessageType.SYSTEM,
          'system',
          `Autonomous trading session stopped.`,
          { timestamp: new Date().toISOString() }
        );
      }
      
      // Broadcast stop event
      this.websocketService.broadcast('autonomous_stopped', {
        timestamp: new Date().toISOString(),
        conversationId: this.currentConversationId
      });
    }
  }
  
  /**
   * Execute a single trading cycle
   */
  private async executeCycle(): Promise<void> {
    const cycleId = uuidv4().substring(0, 8);
    console.log(`Starting autonomous trading cycle ${cycleId}`);
    
    // Create task in queue
    const cycleTaskId = this.queueService.addTask(
      TaskType.AUTONOMOUS_CYCLE,
      this.agentId,
      { cycleId },
      TaskPriority.NORMAL,
      true, // Allow frontend intervention
      5 * 60 * 1000 // 5 minute timeout for frontend to intervene
    );
    
    // Log cycle start to conversation
    if (this.currentConversationId) {
      this.conversationTracker.addMessage(
        this.currentConversationId,
        MessageType.SYSTEM,
        'system',
        `Starting trading cycle ${cycleId}.`,
        { cycleId, taskId: cycleTaskId, timestamp: new Date().toISOString() }
      );
    }
    
    // Broadcast cycle start
    this.websocketService.broadcast('cycle_started', {
      cycleId,
      taskId: cycleTaskId,
      timestamp: new Date().toISOString(),
      conversationId: this.currentConversationId
    });
    
    try {
      // 1. Get market data
      this.websocketService.broadcast('agent_thinking', {
        cycleId,
        stage: 'market_analysis',
        message: 'Gathering current market data',
        timestamp: new Date().toISOString(),
        conversationId: this.currentConversationId
      });
      
      // Log to conversation
      if (this.currentConversationId) {
        this.conversationTracker.addMessage(
          this.currentConversationId,
          MessageType.AGENT,
          this.agentId,
          'Gathering current market data...',
          { cycleId, stage: 'market_analysis', timestamp: new Date().toISOString() }
        );
      }
      
      // Simulate market data collection
      const marketData = await this.collectMarketData();
      
      // Log market data to conversation
      if (this.currentConversationId) {
        this.conversationTracker.addMessage(
          this.currentConversationId,
          MessageType.AGENT,
          this.agentId,
          `Market data collected: ${Object.keys(marketData).length} assets analyzed.`,
          { 
            cycleId, 
            stage: 'market_analysis_complete', 
            marketData: JSON.stringify(marketData),
            timestamp: new Date().toISOString() 
          }
        );
      }
      
      // 2. Analyze portfolio
      this.websocketService.broadcast('analysis_started', {
        cycleId,
        timestamp: new Date().toISOString(),
        conversationId: this.currentConversationId
      });
      
      // Log to conversation
      if (this.currentConversationId) {
        this.conversationTracker.addMessage(
          this.currentConversationId,
          MessageType.AGENT,
          this.agentId,
          'Analyzing portfolio with current market conditions...',
          { cycleId, stage: 'portfolio_analysis', timestamp: new Date().toISOString() }
        );
      }
      
      const portfolioAnalysis = await this.agent.analyzePortfolio({ assets: {} }, marketData);
      
      this.websocketService.broadcast('analysis_completed', {
        cycleId,
        analysis: portfolioAnalysis,
        timestamp: new Date().toISOString(),
        conversationId: this.currentConversationId
      });
      
      // Log analysis to conversation
      if (this.currentConversationId) {
        this.conversationTracker.addMessage(
          this.currentConversationId,
          MessageType.AGENT,
          this.agentId,
          `Portfolio analysis complete: ${portfolioAnalysis.summary || 'No summary available'}`,
          { 
            cycleId, 
            stage: 'portfolio_analysis_complete', 
            analysis: JSON.stringify(portfolioAnalysis),
            timestamp: new Date().toISOString() 
          }
        );
      }
      
      // 3. Make trading decision
      this.websocketService.broadcast('agent_thinking', {
        cycleId,
        stage: 'decision_making',
        message: 'Making trading decisions based on analysis',
        timestamp: new Date().toISOString(),
        conversationId: this.currentConversationId
      });
      
      // Log to conversation
      if (this.currentConversationId) {
        this.conversationTracker.addMessage(
          this.currentConversationId,
          MessageType.AGENT,
          this.agentId,
          'Making trading decisions based on portfolio analysis...',
          { cycleId, stage: 'decision_making', timestamp: new Date().toISOString() }
        );
      }
      
      // Generate trading decision
      const tradingDecision = await this.generateTradingDecision(portfolioAnalysis);
      
      // Log decision to conversation
      if (this.currentConversationId) {
        this.conversationTracker.addMessage(
          this.currentConversationId,
          MessageType.AGENT,
          this.agentId,
          `Trading decision: ${tradingDecision.shouldTrade ? 'Execute trade' : 'No trade'} - ${tradingDecision.reason}`,
          { 
            cycleId, 
            stage: 'decision_complete', 
            decision: JSON.stringify(tradingDecision),
            timestamp: new Date().toISOString() 
          }
        );
      }
      
      // 4. Execute trades if needed
      if (tradingDecision && tradingDecision.shouldTrade) {
        this.websocketService.broadcast('trade_started', {
          cycleId,
          tradeDetails: tradingDecision.trade,
          timestamp: new Date().toISOString(),
          conversationId: this.currentConversationId
        });
        
        // Log to conversation
        if (this.currentConversationId) {
          this.conversationTracker.addMessage(
            this.currentConversationId,
            MessageType.AGENT,
            this.agentId,
            `Executing trade: ${tradingDecision.trade.tradeType} ${tradingDecision.trade.amount} ${tradingDecision.trade.fromAsset} to ${tradingDecision.trade.toAsset}`,
            { 
              cycleId, 
              stage: 'trade_execution', 
              trade: JSON.stringify(tradingDecision.trade),
              timestamp: new Date().toISOString() 
            }
          );
        }
        
        const tradeResult = await this.agent.executeTrade(
          tradingDecision.trade.tradeType,
          tradingDecision.trade.fromAsset,
          tradingDecision.trade.toAsset,
          tradingDecision.trade.amount
        );
        
        this.websocketService.broadcast('trade_completed', {
          cycleId,
          tradeResult,
          timestamp: new Date().toISOString(),
          conversationId: this.currentConversationId
        });
        
        // Log result to conversation
        if (this.currentConversationId) {
          this.conversationTracker.addMessage(
            this.currentConversationId,
            MessageType.AGENT,
            this.agentId,
            `Trade execution complete: ${tradeResult.success ? 'Successful' : 'Failed'} - ${tradeResult.message || ''}`,
            { 
              cycleId, 
              stage: 'trade_complete', 
              result: JSON.stringify(tradeResult),
              timestamp: new Date().toISOString() 
            }
          );
        }
      } else {
        this.websocketService.broadcast('no_trade_decision', {
          cycleId,
          reason: tradingDecision ? tradingDecision.reason : 'No trading opportunity identified',
          timestamp: new Date().toISOString(),
          conversationId: this.currentConversationId
        });
        
        // Log no-trade to conversation
        if (this.currentConversationId) {
          this.conversationTracker.addMessage(
            this.currentConversationId,
            MessageType.AGENT,
            this.agentId,
            `No trade executed: ${tradingDecision ? tradingDecision.reason : 'No trading opportunity identified'}`,
            { 
              cycleId, 
              stage: 'no_trade', 
              reason: tradingDecision ? tradingDecision.reason : 'No trading opportunity identified',
              timestamp: new Date().toISOString() 
            }
          );
        }
      }
      
      // 5. Complete cycle
      this.websocketService.broadcast('cycle_completed', {
        cycleId,
        result: 'success',
        timestamp: new Date().toISOString(),
        conversationId: this.currentConversationId
      });
      
      // Complete the queue task
      this.queueService.completeTask(cycleTaskId, { cycleId, result: 'success' });
      
      // Log cycle completion to conversation
      if (this.currentConversationId) {
        this.conversationTracker.addMessage(
          this.currentConversationId,
          MessageType.SYSTEM,
          'system',
          `Trading cycle ${cycleId} completed successfully.`,
          { 
            cycleId, 
            taskId: cycleTaskId,
            status: 'complete',
            timestamp: new Date().toISOString() 
          }
        );
      }
      
      console.log(`Autonomous trading cycle ${cycleId} completed successfully`);
    } catch (error) {
      console.error(`Error in autonomous trading cycle ${cycleId}:`, error);
      
      // Log error to conversation
      if (this.currentConversationId) {
        this.conversationTracker.addErrorMessage(
          this.currentConversationId,
          this.agentId,
          `Error in trading cycle ${cycleId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      
      // Mark task as failed
      this.queueService.failTask(cycleTaskId, error instanceof Error ? error.message : String(error));
      
      this.websocketService.broadcast('cycle_error', {
        cycleId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        conversationId: this.currentConversationId
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
    };
    
    return prices[asset] || 1; // Default to 1 if asset not found
  }
  
  /**
   * Generate a trading decision based on portfolio analysis
   */
  private async generateTradingDecision(analysis: any): Promise<any> {
    // This should use the agent to make a decision
    // For now, we'll implement a simple mock decision maker
    
    // 70% chance of no trade to avoid excessive trading in mock mode
    if (Math.random() < 0.7) {
      return {
        shouldTrade: false,
        reason: 'Market conditions do not warrant a trade at this time.'
      };
    }
    
    // Mock trade decision
    const assets = ['ETH', 'BTC', 'USDC', 'WETH', 'MATIC'];
    const fromAsset = assets[Math.floor(Math.random() * assets.length)];
    
    // Select a different "to" asset
    let toAsset = fromAsset;
    while (toAsset === fromAsset) {
      toAsset = assets[Math.floor(Math.random() * assets.length)];
    }
    
    const tradeType = Math.random() > 0.5 ? 'buy' : 'sell';
    const amount = parseFloat((Math.random() * 0.5).toFixed(4)); // Small amount for mock
    
    return {
      shouldTrade: true,
      reason: 'Favorable market conditions identified for this trade.',
      trade: {
        tradeType,
        fromAsset,
        toAsset,
        amount
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