import { LLMService } from './llm-service.js';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import { getWebSocketService } from './websocket.js';
import { getConversationTracker, MessageType } from './conversation-tracker.js';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

/**
 * LLM service that leverages Google's Gemini API
 */
export class GeminiLLMService implements LLMService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private initialized: boolean = false;
  private tavilyApiKey: string | undefined;
  private websocketService = getWebSocketService();
  private conversationTracker = getConversationTracker();
  private activeConversationId: string | null = null;
  private agentId: string = 'gemini-agent'; // Default agent ID

  constructor() {
    // Get API key from environment
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required');
    }
    
    // Initialize Google Generative AI client
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    this.initialized = true;
    this.tavilyApiKey = process.env.TAVILY_API_KEY;
    
    console.log('Initialized Gemini LLM service with model: gemini-2.0-flash');
    if (this.tavilyApiKey) {
      console.log('Web search capability enabled with Tavily API');
    }
    
    // Create a new conversation for this LLM service
    this.activeConversationId = this.conversationTracker.createConversation(
      'Gemini Agent Conversation',
      [this.agentId],
      { modelName: 'gemini-2.0-flash' }
    );
  }
  
  /**
   * Set the agent ID for this LLM service
   * 
   * @param agentId - The agent ID to use
   */
  public setAgentId(agentId: string): void {
    this.agentId = agentId;
    
    // Update the conversation if it exists
    if (this.activeConversationId) {
      const conversation = this.conversationTracker.getConversation(this.activeConversationId);
      if (conversation) {
        conversation.agentIds = [agentId];
      }
    }
  }
  
  /**
   * Get the current conversation ID
   * 
   * @returns - The current conversation ID
   */
  public getConversationId(): string | null {
    return this.activeConversationId;
  }
  
  /**
   * Create a new conversation
   * 
   * @param title - Title of the conversation
   * @param metadata - Additional metadata
   * @returns - The new conversation ID
   */
  public createNewConversation(title?: string, metadata?: Record<string, any>): string {
    const conversationTitle = title || `${this.agentId} Conversation ${new Date().toISOString()}`;
    
    this.activeConversationId = this.conversationTracker.createConversation(
      conversationTitle,
      [this.agentId],
      metadata
    );
    
    return this.activeConversationId;
  }
  
  /**
   * Perform web search using Tavily API
   * 
   * @param query - The search query
   * @returns - Formatted search results
   */
  private async webSearch(query: string): Promise<string> {
    if (!this.tavilyApiKey) {
      console.warn('TAVILY_API_KEY not set, skipping web search');
      return `[No web search results - TAVILY_API_KEY not configured]`;
    }
    
    try {
      console.log(`Performing web search for: ${query}`);
      
      // Add search query to conversation
      if (this.activeConversationId) {
        this.conversationTracker.addMessage(
          this.activeConversationId,
          MessageType.SYSTEM,
          'web-search',
          `Searching for: ${query}`,
          { searchType: 'tavily' }
        );
      }
      
      const response = await axios.post(
        'https://api.tavily.com/search',
        {
          api_key: this.tavilyApiKey,
          query: query,
          search_depth: 'basic',
          include_domains: [],
          exclude_domains: [],
          max_results: 5
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const results = response.data.results;
      
      console.log(`Found ${results.length} search results`);
      
      // Format results
      let formattedResults = `Web Search Results for "${query}":\n\n`;
      
      results.forEach((result: any, index: number) => {
        formattedResults += `[${index + 1}] "${result.title}"\n`;
        formattedResults += `URL: ${result.url}\n`;
        formattedResults += `Content: ${result.content.substring(0, 300)}...\n\n`;
      });
      
      // Add search results to conversation
      if (this.activeConversationId) {
        this.conversationTracker.addMessage(
          this.activeConversationId,
          MessageType.SYSTEM,
          'web-search',
          formattedResults,
          { 
            searchType: 'tavily',
            resultCount: results.length,
            query
          }
        );
      }
      
      // Broadcast search results via WebSocket
      this.websocketService.broadcast('web_search_results', {
        query,
        resultCount: results.length,
        timestamp: new Date().toISOString()
      });
      
      return formattedResults;
    } catch (error) {
      console.error('Error performing web search:', error);
      
      // Add error to conversation
      if (this.activeConversationId) {
        this.conversationTracker.addErrorMessage(
          this.activeConversationId,
          'Web search failed',
          error,
          { query }
        );
      }
      
      return `[Web search error: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }
  
  /**
   * Generate text with web search enhancement
   * 
   * @param prompt - The text prompt to generate from
   * @param searchQuery - Optional search query override
   * @returns - The generated text
   */
  public async generateTextWithWebSearch(prompt: string, searchQuery?: string): Promise<string> {
    try {
      // Extract search query from prompt if not provided
      const query = searchQuery || this.extractSearchQuery(prompt) || '';
      
      if (!query) {
        console.log('No search query extracted or provided, falling back to regular generation');
        return this.generateText(prompt);
      }
      
      // Perform web search
      const searchResults = await this.webSearch(query);
      console.log('Enhanced prompt with web search results');
      
      // Combine search results with original prompt
      const enhancedPrompt = `${searchResults}\n\n${prompt}`;
      
      // Generate text with enhanced prompt
      return this.generateText(enhancedPrompt, { enhancedWithSearch: true, searchQuery: query });
    } catch (error) {
      console.error('Error in generateTextWithWebSearch:', error);
      
      // Add error to conversation
      if (this.activeConversationId) {
        this.conversationTracker.addErrorMessage(
          this.activeConversationId,
          'Text generation with web search failed',
          error
        );
      }
      
      // Fall back to regular generation
      return this.generateText(prompt);
    }
  }
  
  /**
   * Extract a search query from a prompt
   * 
   * @param prompt - The prompt to extract from
   * @returns - The extracted search query or null
   */
  private extractSearchQuery(prompt: string): string | null {
    // Look for patterns like [SEARCH:...] or "search for X"
    const searchTagMatch = prompt.match(/\[SEARCH:(.*?)\]/i);
    if (searchTagMatch && searchTagMatch[1]) {
      return searchTagMatch[1].trim();
    }
    
    const searchForMatch = prompt.match(/search for ["']?(.*?)["']?[.,;]/i);
    if (searchForMatch && searchForMatch[1]) {
      return searchForMatch[1].trim();
    }
    
    // For crypto analysis, try to extract relevant tokens
    if (prompt.toLowerCase().includes('crypto') || 
        prompt.toLowerCase().includes('token') || 
        prompt.toLowerCase().includes('blockchain')) {
      
      const tokens = prompt.match(/\b(ETH|BTC|USDC|MATIC|SOL|DOT|ADA|XRP|DOGE|SHIB|LINK|UNI|AVAX)\b/g);
      if (tokens && tokens.length > 0) {
        return `latest cryptocurrency market trends ${tokens.join(' ')}`;
      }
      
      return 'latest cryptocurrency market trends';
    }
    
    return null;
  }
  
  /**
   * Generate text from a prompt
   * 
   * @param prompt - The text prompt to generate from
   * @param metadata - Additional metadata to include with the conversation
   * @returns - The generated text
   */
  async generateText(prompt: string, metadata?: Record<string, any>): Promise<string> {
    if (!this.initialized) {
      throw new Error('GeminiLLMService not initialized');
    }
    
    try {
      // Truncate the prompt for logging
      const truncatedPrompt = prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt;
      console.log(`Generating text with Gemini for prompt: ${truncatedPrompt}`);
      
      // Broadcast generation started
      this.websocketService.broadcast('llm_generation_started', {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        promptLength: prompt.length,
        agentId: this.agentId,
        timestamp: new Date().toISOString()
      });
      
      // Generate content
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      // Ensure we have a conversation to add to
      if (!this.activeConversationId) {
        this.createNewConversation();
      }
      
      // Add to conversation tracker
      this.conversationTracker.addLLMResponse(
        this.activeConversationId!,
        this.agentId,
        prompt,
        text,
        {
          ...metadata,
          model: 'gemini-2.0-flash',
          provider: 'gemini',
          generationId: uuidv4()
        }
      );
      
      // Broadcast generation completed
      this.websocketService.broadcast('llm_generation_completed', {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        promptLength: prompt.length,
        responseLength: text.length,
        agentId: this.agentId,
        timestamp: new Date().toISOString()
      });
      
      return text;
    } catch (error) {
      console.error('Error generating text with Gemini:', error);
      
      // Add error to conversation
      if (this.activeConversationId) {
        this.conversationTracker.addErrorMessage(
          this.activeConversationId,
          'Text generation failed',
          error
        );
      }
      
      // Broadcast generation error
      this.websocketService.broadcast('llm_generation_error', {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        error: error instanceof Error ? error.message : String(error),
        agentId: this.agentId,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Generate structured data from a prompt
   * 
   * @param prompt - The text prompt to generate from
   * @param schema - JSON schema of the expected result
   * @returns - The generated structured data
   */
  async generateStructuredData<T>(prompt: string, schema: any): Promise<T> {
    if (!this.initialized) {
      throw new Error('GeminiLLMService not initialized');
    }
    
    try {
      // Truncate the prompt for logging
      const truncatedPrompt = prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt;
      console.log(`Generating structured data with Gemini: ${truncatedPrompt}`);
      
      // Broadcast generation started
      this.websocketService.broadcast('llm_generation_started', {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        promptLength: prompt.length,
        isStructured: true,
        agentId: this.agentId,
        timestamp: new Date().toISOString()
      });
      
      // Add to conversation tracker
      if (this.activeConversationId) {
        this.conversationTracker.addMessage(
          this.activeConversationId,
          MessageType.AGENT,
          this.agentId,
          prompt,
          {
            isStructuredRequest: true,
            schema: JSON.stringify(schema)
          }
        );
      }
      
      // Generate content
      const generationConfig = {
        response_mime_type: "application/json", 
        temperature: 0.1
      };
  
      const result = await this.model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
        generation_config: generationConfig,
      });
      
      let jsonStr = result.response.text();
      
      // Sometimes Gemini wraps the JSON in ```json or ```
      if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].replace('json', '').trim();
      }
      
      // Parse JSON
      const jsonData = JSON.parse(jsonStr) as T;
      
      // Add to conversation tracker
      if (this.activeConversationId) {
        this.conversationTracker.addMessage(
          this.activeConversationId,
          MessageType.LLM,
          'llm',
          JSON.stringify(jsonData, null, 2),
          {
            model: 'gemini-2.0-flash',
            provider: 'gemini',
            isStructuredResponse: true,
            generationId: uuidv4()
          }
        );
      }
      
      // Broadcast generation completed
      this.websocketService.broadcast('llm_generation_completed', {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        promptLength: prompt.length,
        isStructured: true,
        agentId: this.agentId,
        timestamp: new Date().toISOString()
      });
      
      return jsonData;
    } catch (error) {
      console.error('Error generating structured data with Gemini:', error);
      
      // Add error to conversation
      if (this.activeConversationId) {
        this.conversationTracker.addErrorMessage(
          this.activeConversationId,
          'Structured data generation failed',
          error
        );
      }
      
      // Broadcast generation error
      this.websocketService.broadcast('llm_generation_error', {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        isStructured: true,
        error: error instanceof Error ? error.message : String(error),
        agentId: this.agentId,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
  
  /**
   * Check if the LLM service is healthy
   * 
   * @returns - True if healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hello, are you working properly? Just say "yes" if you are.');
      const text = result.response.text();
      
      // Check if response contains yes
      return text.toLowerCase().includes('yes');
    } catch (error) {
      console.error('Gemini health check failed:', error);
      return false;
    }
  }
} 