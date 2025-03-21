/**
 * 4g3n7 Autotrader Module
 * 
 * This module implements the core trading logic for the 4g3n7 agent,
 * including portfolio analysis, trade recommendation, and execution.
 * All operations run within a secure Trusted Execution Environment (TEE)
 * using Marlin Oyster CVM for privacy-preserving computation.
 */

const crypto = require('crypto');
const fs = require('fs');

// Trading strategies with different risk profiles
const STRATEGIES = {
  CONSERVATIVE: {
    name: "Conservative",
    description: "Low risk, focuses on stable assets with small regular trades",
    maxTradePercent: 0.05,  // Max 5% of portfolio per trade
    volatilityTolerance: "low",
    rebalanceThreshold: 0.1,  // 10% deviation triggers rebalance
    targetAllocation: {
      "ETH": 0.3,
      "USDC": 0.6,
      "WETH": 0.1
    }
  },
  MODERATE: {
    name: "Moderate",
    description: "Balanced risk/reward with diversified assets",
    maxTradePercent: 0.15,  // Max 15% of portfolio per trade
    volatilityTolerance: "medium",
    rebalanceThreshold: 0.15,  // 15% deviation triggers rebalance
    targetAllocation: {
      "ETH": 0.4,
      "USDC": 0.4,
      "WETH": 0.2
    }
  },
  AGGRESSIVE: {
    name: "Aggressive",
    description: "Higher risk for potential higher returns",
    maxTradePercent: 0.25,  // Max 25% of portfolio per trade
    volatilityTolerance: "high",
    rebalanceThreshold: 0.2,  // 20% deviation triggers rebalance
    targetAllocation: {
      "ETH": 0.7,
      "USDC": 0.1,
      "WETH": 0.2
    }
  }
};

/**
 * PortfolioAnalyzer class
 * Analyzes wallet portfolios and identifies rebalancing opportunities.
 */
class PortfolioAnalyzer {
  /**
   * Initialize the portfolio analyzer
   * @param {Object} strategy - Trading strategy configuration
   */
  constructor(strategy) {
    this.strategy = strategy;
    this.config = STRATEGIES[strategy] || STRATEGIES.CONSERVATIVE;
  }
  
  /**
   * Analyze portfolio to identify rebalancing opportunities
   * @param {Object} portfolio - Portfolio data from CDP SDK
   * @param {Object} marketData - Current market price data
   * @returns {Object} Analysis results
   */
  analyzePortfolio(portfolio, marketData) {
    try {
      console.log(`Analyzing portfolio using ${this.config.name} strategy`);
      
      // If portfolio is empty, return basic analysis
      if (!portfolio || !portfolio.assets || portfolio.assets.length === 0) {
        return {
          timestamp: new Date().toISOString(),
          portfolio: { assets: [], totalValue: 0 },
          currentAllocation: {},
          deviations: {},
          needsRebalance: false,
          message: "Empty portfolio, no analysis possible"
        };
      }
      
      // Convert to standard format
      const standardizedPortfolio = this._standardizePortfolio(portfolio, marketData);
      
      // Calculate current allocation percentages
      const currentAllocation = this._calculateCurrentAllocation(standardizedPortfolio);
      
      // Identify deviations from target allocation
      const deviations = this._identifyDeviations(currentAllocation, this.config.targetAllocation);
      
      // Determine if portfolio needs rebalancing
      const needsRebalance = this._needsRebalance(deviations);
      
      // Return the complete analysis
      return {
        timestamp: new Date().toISOString(),
        portfolio: standardizedPortfolio,
        currentAllocation,
        deviations,
        needsRebalance,
        message: needsRebalance ? 
          "Portfolio requires rebalancing based on target allocation" : 
          "Portfolio is within acceptable allocation ranges"
      };
    } catch (error) {
      console.error("Error analyzing portfolio:", error);
      throw error;
    }
  }
  
  /**
   * Standardize portfolio data format
   * @param {Object} portfolio - Raw portfolio data
   * @param {Object} marketData - Current market data
   * @returns {Object} Standardized portfolio
   */
  _standardizePortfolio(portfolio, marketData) {
    const standardizedAssets = [];
    let totalValue = 0;
    
    // Process each asset
    portfolio.assets.forEach(asset => {
      const assetId = asset.assetId || asset.asset_id;
      const balance = parseFloat(asset.balance || asset.amount || 0);
      const price = marketData && marketData.prices ? 
        marketData.prices[assetId] || 0 : 
        asset.priceUsd || asset.price || 0;
      
      const value = balance * price;
      totalValue += value;
      
      standardizedAssets.push({
        assetId,
        balance,
        price,
        value,
        allocation: 0 // Will be updated after total calculation
      });
    });
    
    // Update allocation percentages
    if (totalValue > 0) {
      standardizedAssets.forEach(asset => {
        asset.allocation = asset.value / totalValue;
      });
    }
    
    return {
      assets: standardizedAssets,
      totalValue
    };
  }
  
  /**
   * Calculate current allocation percentages
   * @param {Object} portfolio - Standardized portfolio
   * @returns {Object} Current allocations by asset ID
   */
  _calculateCurrentAllocation(portfolio) {
    const allocations = {};
    
    portfolio.assets.forEach(asset => {
      allocations[asset.assetId] = asset.allocation;
    });
    
    return allocations;
  }
  
  /**
   * Identify deviations from target allocation
   * @param {Object} currentAllocation - Current allocation
   * @param {Object} targetAllocation - Target allocation from strategy
   * @returns {Object} Deviations with needed trades
   */
  _identifyDeviations(currentAllocation, targetAllocation) {
    const deviations = {};
    const targetAssets = Object.keys(targetAllocation);
    
    // Calculate deviation for each target asset
    targetAssets.forEach(assetId => {
      const target = targetAllocation[assetId] || 0;
      const current = currentAllocation[assetId] || 0;
      const deviation = current - target;
      
      deviations[assetId] = {
        assetId,
        target,
        current,
        deviation,
        percentDeviation: target > 0 ? (deviation / target) * 100 : 0,
        needsRebalance: Math.abs(deviation) > this.config.rebalanceThreshold
      };
    });
    
    // Also check for assets in portfolio that aren't in target allocation
    Object.keys(currentAllocation).forEach(assetId => {
      if (!targetAssets.includes(assetId)) {
        const current = currentAllocation[assetId] || 0;
        
        // Assets not in target allocation have an implicit target of 0
        deviations[assetId] = {
          assetId,
          target: 0,
          current,
          deviation: current,
          percentDeviation: 100, // 100% deviation since target is 0
          needsRebalance: current > this.config.rebalanceThreshold / 2 // Lower threshold for non-target assets
        };
      }
    });
    
    return deviations;
  }
  
  /**
   * Determine if portfolio needs rebalancing
   * @param {Object} deviations - Deviation analysis
   * @returns {boolean} Whether rebalancing is needed
   */
  _needsRebalance(deviations) {
    return Object.values(deviations).some(dev => dev.needsRebalance);
  }
  
  /**
   * Generate trade recommendations based on portfolio analysis
   * @param {Object} analysis - Portfolio analysis results
   * @param {Object} marketData - Current market data
   * @returns {Array} Array of recommended trades
   */
  generateTradeRecommendations(analysis, marketData) {
    try {
      if (!analysis.needsRebalance) {
        console.log("No rebalancing needed, no trades recommended");
        return [];
      }
      
      const trades = [];
      const { portfolio, deviations } = analysis;
      
      // Find assets that are overallocated (selling candidates)
      const overallocated = Object.values(deviations)
        .filter(dev => dev.deviation > 0 && dev.needsRebalance)
        .sort((a, b) => b.deviation - a.deviation);
      
      // Find assets that are underallocated (buying candidates)
      const underallocated = Object.values(deviations)
        .filter(dev => dev.deviation < 0 && dev.needsRebalance)
        .sort((a, b) => a.deviation - b.deviation);
      
      // If nothing is overallocated or underallocated, no trades needed
      if (overallocated.length === 0 || underallocated.length === 0) {
        return trades;
      }
      
      // Calculate maximum trade amounts based on strategy
      const maxTradePercent = this.config.maxTradePercent;
      
      // Create trades to bring allocation closer to targets
      for (const overAsset of overallocated) {
        // Skip if we've corrected all underallocated assets
        if (underallocated.length === 0) break;
        
        // Find the asset in the portfolio
        const portfolioAsset = portfolio.assets.find(a => a.assetId === overAsset.assetId);
        if (!portfolioAsset) continue;
        
        // Calculate amount to sell based on deviation and max trade constraint
        const deviationValue = overAsset.deviation * portfolio.totalValue;
        const maxTradeValue = portfolioAsset.value * maxTradePercent;
        const tradeValue = Math.min(deviationValue, maxTradeValue);
        
        // Convert to asset amount based on price
        const tradeAmount = portfolioAsset.price > 0 ? 
          tradeValue / portfolioAsset.price : 0;
        
        if (tradeAmount <= 0) continue;
        
        // Find the most underallocated asset to buy
        const underAsset = underallocated[0];
        
        // Create a trade recommendation
        trades.push({
          fromAsset: overAsset.assetId,
          toAsset: underAsset.assetId,
          fromAmount: tradeAmount,
          reason: `Rebalancing: ${overAsset.assetId} is ${overAsset.percentDeviation.toFixed(1)}% over target, ${underAsset.assetId} is ${Math.abs(underAsset.percentDeviation).toFixed(1)}% under target`
        });
        
        // Update the allocation for the next iteration
        const estimatedValueTransfer = tradeAmount * portfolioAsset.price;
        
        // Reduce the deviation of the underallocated asset
        underAsset.deviation += estimatedValueTransfer / portfolio.totalValue;
        
        // If this asset is now sufficiently allocated, remove it from consideration
        if (Math.abs(underAsset.deviation) <= this.config.rebalanceThreshold / 2) {
          underallocated.shift();
        } else {
          // Re-sort based on updated deviation
          underallocated.sort((a, b) => a.deviation - b.deviation);
        }
      }
      
      return trades;
    } catch (error) {
      console.error("Error generating trade recommendations:", error);
      return [];
    }
  }
}

/**
 * TradeExecutor class
 * Executes trades based on recommendations generated by the PortfolioAnalyzer
 */
class TradeExecutor {
  /**
   * Initialize the trade executor
   * @param {Object} strategy - Trading strategy configuration
   */
  constructor(strategy) {
    this.strategy = strategy;
    this.config = STRATEGIES[strategy] || STRATEGIES.CONSERVATIVE;
  }
  
  /**
   * Execute recommended trades
   * @param {Array} recommendations - Array of trade recommendations
   * @param {Function} tradeFunction - Function to execute a trade
   * @returns {Promise<Array>} Array of executed trades with results
   */
  async executeTrades(recommendations, tradeFunction) {
    if (!recommendations || recommendations.length === 0) {
      console.log("No trade recommendations to execute");
      return [];
    }
    
    if (!tradeFunction || typeof tradeFunction !== 'function') {
      throw new Error("Trade execution function is required");
    }
    
    const executedTrades = [];
    
    for (const recommendation of recommendations) {
      try {
        console.log(`Executing trade: ${recommendation.fromAmount} ${recommendation.fromAsset} → ${recommendation.toAsset}`);
        
        // Call the provided trade function (typically from CDP SDK)
        const result = await tradeFunction(
          recommendation.fromAsset,
          recommendation.toAsset,
          recommendation.fromAmount
        );
        
        // Add to executed trades
        executedTrades.push({
          ...recommendation,
          success: true,
          tradeId: result.id || crypto.randomUUID(),
          timestamp: result.timestamp || new Date().toISOString(),
          status: result.status || 'completed',
          txHash: result.txHash || null
        });
        
        console.log(`Trade executed successfully: ${recommendation.fromAsset} → ${recommendation.toAsset}`);
      } catch (error) {
        console.error(`Error executing trade: ${error.message}`);
        
        // Add failed trade to results
        executedTrades.push({
          ...recommendation,
          success: false,
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    }
    
    return executedTrades;
  }
}

/**
 * MarketDataProvider class
 * Fetches and processes market data for trading decisions
 */
class MarketDataProvider {
  /**
   * Get current market data (prices, trends, etc.)
   * @returns {Object} Current market data
   */
  async getCurrentMarketData() {
    try {
      // In production, this would call external APIs for market data
      // For now, we'll use simulated data
      return this.getSimulatedMarketData();
    } catch (error) {
      console.error("Error fetching market data:", error);
      return {
        timestamp: new Date().toISOString(),
        prices: {},
        trends: {},
        volatility: {}
      };
    }
  }
  
  /**
   * Generate simulated market data for testing
   * @returns {Object} Simulated market data
   */
  getSimulatedMarketData() {
    const assets = ["ETH", "USDC", "WETH", "BTC", "MATIC", "LINK"];
    
    const prices = {};
    const trends = {};
    const volatility = {};
    
    // Generate simulated prices and trends
    prices["ETH"] = 1800 + (Date.now() % 200 - 100);
    prices["USDC"] = 1.0 + (Date.now() % 0.01 - 0.005);
    prices["WETH"] = prices["ETH"] * (0.98 + (Date.now() % 0.04));
    prices["BTC"] = 52000 + (Date.now() % 2000 - 1000);
    prices["MATIC"] = 0.8 + (Date.now() % 0.2 - 0.1);
    prices["LINK"] = 15 + (Date.now() % 3 - 1.5);
    
    // Generate trend indicators
    const trendOptions = ["bullish", "neutral", "bearish"];
    const volatilityOptions = ["low", "medium", "high"];
    
    for (const asset of assets) {
      // Deterministically select trend and volatility based on time
      // This makes it change regularly but not randomly each call
      const trendIndex = Math.floor((Date.now() / 3600000) + asset.charCodeAt(0)) % 3;
      const volatilityIndex = Math.floor((Date.now() / 7200000) + asset.charCodeAt(0)) % 3;
      
      trends[asset] = trendOptions[trendIndex];
      volatility[asset] = volatilityOptions[volatilityIndex];
    }
    
    return {
      timestamp: new Date().toISOString(),
      prices,
      trends,
      volatility
    };
  }
}

/**
 * Secure Autotrader main class
 * Coordinates portfolio analysis, recommendation generation, and trade execution
 * within the Trusted Execution Environment
 */
class SecureAutotrader {
  /**
   * Initialize the secure autotrader
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.strategy = options.strategy || 'CONSERVATIVE';
    this.strategyConfig = STRATEGIES[this.strategy] || STRATEGIES.CONSERVATIVE;
    
    // Initialize components
    this.portfolioAnalyzer = new PortfolioAnalyzer(this.strategy);
    this.tradeExecutor = new TradeExecutor(this.strategy);
    this.marketDataProvider = new MarketDataProvider();
    
    // Generate TEE identity (in a real implementation, this would use the enclave identity)
    this.generateTeeIdentity();
  }
  
  /**
   * Set the trading strategy
   * @param {string} strategy - Strategy name (CONSERVATIVE, MODERATE, AGGRESSIVE)
   */
  setStrategy(strategy) {
    if (!STRATEGIES[strategy]) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }
    
    this.strategy = strategy;
    this.strategyConfig = STRATEGIES[strategy];
    
    // Recreate components with new strategy
    this.portfolioAnalyzer = new PortfolioAnalyzer(strategy);
    this.tradeExecutor = new TradeExecutor(strategy);
  }
  
  /**
   * Generate a TEE identity for signing operations
   * In a real implementation, this would use the enclave's key
   */
  generateTeeIdentity() {
    // Check if enclave identity key is available
    try {
      if (fs.existsSync('/app/id.sec')) {
        console.log('Using enclave identity key for secure operations');
        this.teeIdentity = {
          available: true,
          source: 'enclave'
        };
      } else {
        console.log('Enclave identity key not found, using simulated identity');
        this.teeIdentity = {
          available: false,
          source: 'simulated',
          id: `sim-${crypto.randomUUID()}`
        };
      }
    } catch (error) {
      console.error('Error accessing enclave identity:', error);
      this.teeIdentity = {
        available: false,
        source: 'simulated',
        id: `sim-${crypto.randomUUID()}`
      };
    }
  }
  
  /**
   * Generate a signature for a data payload
   * @param {Object} data - Data to sign
   * @returns {string} Signature
   */
  signData(data) {
    try {
      // In a real implementation, this would use the enclave's private key
      // For now, generate a simulated signature
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      return `sig_${crypto.createHash('sha256').update(dataStr).digest('hex')}`;
    } catch (error) {
      console.error('Error signing data:', error);
      return `invalid_sig_${Date.now()}`;
    }
  }
  
  /**
   * Analyze portfolio and generate trade recommendations
   * @param {Object} portfolio - Portfolio data from CDP SDK
   * @returns {Promise<Object>} Analysis results with trade recommendations
   */
  async analyzePortfolio(portfolio) {
    try {
      console.log('Securely analyzing portfolio within TEE...');
      
      // Get current market data
      const marketData = await this.marketDataProvider.getCurrentMarketData();
      
      // Analyze portfolio
      const analysis = this.portfolioAnalyzer.analyzePortfolio(portfolio, marketData);
      
      // Generate trade recommendations
      const recommendations = this.portfolioAnalyzer.generateTradeRecommendations(analysis, marketData);
      
      // Sign the analysis and recommendations
      const signature = this.signData({ analysis, recommendations });
      
      return {
        timestamp: new Date().toISOString(),
        analysis,
        marketData,
        recommendations,
        strategy: this.strategy,
        signature
      };
    } catch (error) {
      console.error('Error in secure portfolio analysis:', error);
      throw error;
    }
  }
  
  /**
   * Execute trades based on recommendations
   * @param {Array} recommendations - Array of trade recommendations
   * @param {Function} tradeFunction - Function to execute a trade
   * @returns {Promise<Object>} Trade execution results
   */
  async executeTrades(recommendations, tradeFunction) {
    try {
      console.log('Securely executing trades within TEE...');
      
      // Execute trades
      const executedTrades = await this.tradeExecutor.executeTrades(recommendations, tradeFunction);
      
      // Sign the executed trades
      const signature = this.signData(executedTrades);
      
      return {
        timestamp: new Date().toISOString(),
        executedTrades,
        success: executedTrades.some(trade => trade.success),
        strategy: this.strategy,
        signature
      };
    } catch (error) {
      console.error('Error in secure trade execution:', error);
      throw error;
    }
  }
  
  /**
   * Get all available trading strategies
   * @returns {Object} Available strategies
   */
  getStrategies() {
    return STRATEGIES;
  }
}

// Export components
module.exports = {
  SecureAutotrader,
  PortfolioAnalyzer,
  TradeExecutor,
  MarketDataProvider,
  STRATEGIES
};
