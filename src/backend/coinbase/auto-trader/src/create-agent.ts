import { Agent, MockTradingAgent } from './agent/index.js';
import { TradingAgent } from './agent/trading-agent.js';
import { RecallMemoryManager } from './services/recall-memory.js';
import { MockLLMService } from './services/mock-llm.js';
import { GeminiLLMService } from './services/gemini-llm.js';
import { tavilyActionProvider, recallActionProvider } from './action-providers/index.js';
import * as dotenv from 'dotenv';

// Load configuration
dotenv.config();

// Configuration options
export type LLMProvider = 'azure' | 'gemini' | 'mock';
export type MemoryProvider = 'recall' | 'local';

export interface AgentConfig {
  llmProvider: LLMProvider;
  memoryProvider: MemoryProvider;
  walletAddress?: string;
  enableActionProviders?: boolean;
}

/**
 * Create a trading agent based on configuration
 * 
 * @param config - Configuration for the trading agent
 * @returns A configured trading agent
 */
export async function createAgent(config: AgentConfig): Promise<Agent> {
  console.log(`Creating agent with LLM provider: ${config.llmProvider}, memory provider: ${config.memoryProvider}`);
  
  const walletAddress = config.walletAddress || '0x8070591331daa4b7f1e783a12b52890a6917d98d';
  
  try {
    // Initialize memory manager
    const memoryManager = new RecallMemoryManager(
      process.env.RECALL_PRIVATE_KEY || 'mock_key',
      process.env.RECALL_BUCKET_ALIAS || 'auto-trader-memory',
      process.env.RECALL_NETWORK || 'testnet'
    );
    
    // Initialize action providers if enabled
    const actionProviders = [];
    if (config.enableActionProviders) {
      // Add Tavily web search provider if API key is available
      if (process.env.TAVILY_API_KEY) {
        console.log('Registering Tavily web search action provider');
        actionProviders.push(tavilyActionProvider());
      }
      
      // Add Recall provider if key is available
      if (process.env.RECALL_PRIVATE_KEY) {
        console.log('Registering Recall persistence action provider');
        actionProviders.push(recallActionProvider(process.env.RECALL_PRIVATE_KEY));
      }
    }
    
    // Initialize LLM service based on configuration
    if (config.llmProvider === 'gemini') {
      try {
        console.log('Initializing Gemini LLM service');
        const llmService = new GeminiLLMService();
        
        // Verify the service is operational
        const isHealthy = await llmService.healthCheck();
        if (!isHealthy) {
          console.log('Gemini LLM health check failed. Falling back to mock service.');
          return new TradingAgent(new MockLLMService(), memoryManager, walletAddress);
        }
        
        // Create agent with action providers if enabled
        const agent = new TradingAgent(llmService, memoryManager, walletAddress);
        console.log(`Agent created successfully with ${actionProviders.length} action providers`);
        return agent;
      } catch (error) {
        console.error('Error initializing Gemini LLM service:', error);
        console.log('Falling back to mock LLM service');
        return new TradingAgent(new MockLLMService(), memoryManager, walletAddress);
      }
    } else if (config.llmProvider === 'azure') {
      // Azure could be implemented here if needed
      console.log('Azure OpenAI not implemented in this version. Using mock service.');
      return new TradingAgent(new MockLLMService(), memoryManager, walletAddress);
    } else {
      console.log('Using mock LLM service as configured');
      return new TradingAgent(new MockLLMService(), memoryManager, walletAddress);
    }
  } catch (error) {
    // Fallback to mock agent on any error
    console.error('Error creating trading agent:', error);
    console.log('Falling back to mock trading agent');
    return new MockTradingAgent(walletAddress);
  }
} 