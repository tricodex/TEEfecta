/**
 * Agent Coordination Module
 * 
 * This module provides coordination between the traditional agent and AgentKit agent,
 * allowing them to collaborate on trading decisions.
 */

import { Agent } from './index.js';
import { RecallMemoryManager } from '../services/recall-memory.js';

/**
 * CoordinatedAgent combines insights from multiple agents
 * 
 * This implementation allows for collaboration between the traditional trading agent
 * and the AgentKit-based agent, providing more comprehensive analysis and resilience.
 */
export class CoordinatedAgent implements Agent {
  private primaryAgent: Agent;
  private secondaryAgent: Agent;
  private memoryManager: RecallMemoryManager;
  
  /**
   * Create a new coordinated agent
   * 
   * @param primaryAgent - The primary agent (traditional agent)
   * @param secondaryAgent - The secondary agent (AgentKit agent)
   */
  constructor(primaryAgent: Agent, secondaryAgent: Agent) {
    this.primaryAgent = primaryAgent;
    this.secondaryAgent = secondaryAgent;
    
    // Use the primary agent's memory manager
    this.memoryManager = primaryAgent.getMemoryManager() as RecallMemoryManager;
    
    console.log('Coordinated Agent initialized with dual-agent architecture');
  }
  
  /**
   * Get agent status from both agents
   */
  async getStatus(): Promise<any> {
    try {
      const [primaryStatus, secondaryStatus] = await Promise.allSettled([
        this.primaryAgent.getStatus(),
        this.secondaryAgent.getStatus()
      ]);
      
      // Format results based on promise results
      const formattedPrimary = primaryStatus.status === 'fulfilled' 
        ? primaryStatus.value 
        : { status: 'error', error: primaryStatus.reason };
        
      const formattedSecondary = secondaryStatus.status === 'fulfilled'
        ? secondaryStatus.value
        : { status: 'error', error: secondaryStatus.reason };
      
      // Determine overall status based on component statuses
      const overallStatus = formattedPrimary.status === 'operational' || 
                            formattedSecondary.status === 'operational'
                           ? 'operational' : 'degraded';
      
      return {
        status: overallStatus,
        type: 'coordinated',
        primary: formattedPrimary,
        agentKit: formattedSecondary,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting coordinated agent status:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Get coordinated portfolio analysis from both agents
   * 
   * This merges insights from both agents for more comprehensive analysis
   */
  async analyzePortfolio(portfolio: any, marketData: any): Promise<any> {
    console.log('Coordinated agent analyzing portfolio');
    const decisionId = `coordinated-${Date.now().toString(36).substring(5)}`;
    
    try {
      // Get analyses from both agents with error handling
      const primaryPromise = this.primaryAgent.analyzePortfolio(portfolio, marketData)
        .catch(error => {
          console.error('Error in primary agent analysis:', error);
          return { error: error instanceof Error ? error.message : String(error) };
        });
      
      const secondaryPromise = this.secondaryAgent.analyzePortfolio(portfolio, marketData)
        .catch(error => {
          console.error('Error in secondary agent analysis:', error);
          return { error: error instanceof Error ? error.message : String(error) };
        });
      
      // Wait for both to complete
      const [primaryAnalysis, secondaryAnalysis] = await Promise.all([
        primaryPromise,
        secondaryPromise
      ]);
      
      // Store the combined analysis in memory
      await this.memoryManager.store('coordinated-analysis', {
        primary: primaryAnalysis,
        agentKit: secondaryAnalysis
      }, {
        decisionId,
        timestamp: new Date().toISOString(),
        portfolioAssets: Object.keys(portfolio.assets || {})
      });
      
      // Format and return the combined result
      return {
        decisionId,
        timestamp: new Date().toISOString(),
        analyses: {
          primary: primaryAnalysis,
          agentKit: secondaryAnalysis
        },
        // Extract combined recommendations if both analyses succeeded
        recommendations: this.extractCombinedRecommendations(primaryAnalysis, secondaryAnalysis),
        provider: 'coordinated'
      };
    } catch (error) {
      console.error('Error in coordinated portfolio analysis:', error);
      
      // Store error in memory
      await this.memoryManager.store('error', {
        error: error instanceof Error ? error.message : String(error),
        context: 'coordinated-analysis',
        decisionId
      });
      
      return {
        decisionId,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        provider: 'coordinated'
      };
    }
  }
  
  /**
   * Execute a trade with coordinated analysis
   * 
   * For safety, we only execute the trade with the primary agent
   * but include analysis from both agents
   */
  async executeTrade(tradeType: string, fromAsset: string, toAsset: string, amount: number): Promise<any> {
    console.log(`Coordinated agent executing trade: ${tradeType} ${amount} ${fromAsset} to ${toAsset}`);
    const tradeId = `coordinated-trade-${Date.now().toString(36).substring(5)}`;
    
    try {
      // Get analysis from the secondary agent first
      const secondaryAnalysis = await this.secondaryAgent.analyzePortfolio(
        { assets: { [fromAsset]: { amount, value: amount * 100 } } },
        { [fromAsset]: { price: 100, change24h: 0 }, [toAsset]: { price: 1, change24h: 0 } }
      ).catch(error => {
        console.error('Error getting secondary agent analysis:', error);
        return { error: error instanceof Error ? error.message : String(error) };
      });
      
      // Execute the trade with the primary agent
      const executionResult = await this.primaryAgent.executeTrade(tradeType, fromAsset, toAsset, amount);
      
      // Store the coordinated trade in memory
      await this.memoryManager.store('coordinated-trade', {
        trade: executionResult,
        secondaryAnalysis
      }, {
        tradeId,
        tradeType,
        fromAsset,
        toAsset,
        amount,
        timestamp: new Date().toISOString()
      });
      
      // Return the combined result
      return {
        tradeId,
        timestamp: new Date().toISOString(),
        ...executionResult,
        secondaryAnalysis,
        provider: 'coordinated'
      };
    } catch (error) {
      console.error('Error in coordinated trade execution:', error);
      
      // Store error in memory
      await this.memoryManager.store('error', {
        error: error instanceof Error ? error.message : String(error),
        context: 'coordinated-trade',
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
        error: error instanceof Error ? error.message : String(error),
        tradeType,
        fromAsset,
        toAsset,
        amount,
        provider: 'coordinated'
      };
    }
  }
  
  /**
   * Get reasoning history from both agents
   */
  async getReasoningHistory(decisionId: string): Promise<any> {
    try {
      // Query memory for coordinated analysis/trade
      const coordinatedEntries = await this.memoryManager.query('coordinated-analysis', 
        (entry: any) => entry.metadata?.decisionId === decisionId);
      
      if (coordinatedEntries.length > 0) {
        return {
          decisionId,
          timestamp: coordinatedEntries[0].timestamp,
          type: 'coordinated-analysis',
          reasoning: coordinatedEntries[0].content
        };
      }
      
      // Check for coordinated trades
      const tradeEntries = await this.memoryManager.query('coordinated-trade',
        (entry: any) => entry.metadata?.tradeId === decisionId);
      
      if (tradeEntries.length > 0) {
        return {
          decisionId,
          timestamp: tradeEntries[0].timestamp,
          type: 'coordinated-trade',
          reasoning: tradeEntries[0].content
        };
      }
      
      // Try individual agent reasoning if coordination entries not found
      const [primaryHistory, secondaryHistory] = await Promise.allSettled([
        this.primaryAgent.getReasoningHistory(decisionId),
        this.secondaryAgent.getReasoningHistory(decisionId)
      ]);
      
      // Format results based on promise results
      const formattedPrimary = primaryHistory.status === 'fulfilled' 
        ? primaryHistory.value 
        : { error: 'not_found' };
        
      const formattedSecondary = secondaryHistory.status === 'fulfilled'
        ? secondaryHistory.value
        : { error: 'not_found' };
        
      // If either agent found matching reasoning, return it
      if (formattedPrimary.error !== 'not_found' || formattedSecondary.error !== 'not_found') {
        return {
          decisionId,
          timestamp: new Date().toISOString(),
          histories: {
            primary: formattedPrimary,
            agentKit: formattedSecondary
          }
        };
      }
      
      // No reasoning found
      return {
        error: 'not_found',
        message: `No reasoning found for ID: ${decisionId}`
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
   * Get the wallet associated with this agent
   * Returns the primary agent's wallet
   */
  getWallet(): any {
    return this.primaryAgent.getWallet();
  }
  
  /**
   * Extract combined recommendations from both analyses
   * 
   * This creates a unified view of recommendations from both agents,
   * cross-referencing and prioritizing their suggestions.
   */
  private extractCombinedRecommendations(primaryAnalysis: any, secondaryAnalysis: any): any {
    // Check if both analyses have recommendations
    if (!primaryAnalysis?.recommendations && !secondaryAnalysis?.recommendations) {
      return { 
        note: 'No specific recommendations available from either agent' 
      };
    }
    
    // Start with primary recommendations if available
    const combined = primaryAnalysis?.recommendations 
      ? { ...primaryAnalysis.recommendations }
      : {};
    
    // Add secondary recommendations with 'agentKit' prefix if not already included
    if (secondaryAnalysis?.recommendations) {
      // For simple fields, merge them or add with prefix
      for (const [key, value] of Object.entries(secondaryAnalysis.recommendations)) {
        if (key === 'overallHealth' || key === 'summary') {
          combined[`agentKit_${key}`] = value;
        } else if (Array.isArray(value)) {
          // For arrays (like opportunities, risks), merge unique items
          if (!combined[key]) {
            combined[key] = [];
          }
          
          // Only add unique items from secondary analysis
          for (const item of value as any[]) {
            if (!combined[key].includes(item)) {
              combined[key].push(item);
            }
          }
          
          // Add additional agentKit-specific items
          combined[`agentKit_${key}`] = value;
        } else if (typeof value === 'object') {
          // For nested objects, merge or add with prefix
          if (!combined[key]) {
            combined[key] = {};
          }
          combined[key] = { ...combined[key], ...value };
          combined[`agentKit_${key}`] = value;
        }
      }
    }
    
    // Add metadata about the combined analysis
    combined.sources = {
      primaryAgent: !primaryAnalysis?.error,
      agentKitAgent: !secondaryAnalysis?.error
    };
    
    return combined;
  }
}