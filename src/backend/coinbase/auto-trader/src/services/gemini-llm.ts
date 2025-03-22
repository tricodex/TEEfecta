import { LLMService } from './llm-service.js';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';

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
      
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: this.tavilyApiKey,
        query: query,
        search_depth: 'basic',
        include_domains: [],
        exclude_domains: [],
        max_results: 5
      });
      
      if (response.data && response.data.results) {
        const results = response.data.results;
        let searchResults = `Web Search Results for "${query}":\n\n`;
        
        results.forEach((result: any, index: number) => {
          searchResults += `[${index + 1}] ${result.title}\n`;
          searchResults += `URL: ${result.url}\n`;
          searchResults += `${result.content.substring(0, 200)}...\n\n`;
        });
        
        console.log(`Found ${results.length} search results`);
        return searchResults;
      } else {
        return `[No relevant search results found for: ${query}]`;
      }
    } catch (error) {
      console.error('Error performing web search:', error);
      return `[Error performing web search: ${error instanceof Error ? error.message : String(error)}]`;
    }
  }
  
  /**
   * Generate text using a web search augmented prompt
   * 
   * @param prompt - The original prompt
   * @param searchQuery - Optional explicit search query, if not provided will attempt to extract one
   * @returns - Generated text with web search context
   */
  public async generateTextWithWebSearch(prompt: string, searchQuery?: string): Promise<string> {
    try {
      const query = searchQuery || this.extractSearchQuery(prompt);
      let enhancedPrompt = prompt;
      
      if (query) {
        const searchResults = await this.webSearch(query);
        enhancedPrompt = `${searchResults}\n\n${prompt}\n\nIncorporate the above web search results if relevant to your response.`;
        console.log('Enhanced prompt with web search results');
      }
      
      return await this.generateText(enhancedPrompt);
    } catch (error) {
      console.error('Error generating text with web search:', error);
      return await this.generateText(prompt); // Fallback to regular generation
    }
  }
  
  /**
   * Extract a search query from a prompt
   * 
   * @param prompt - The prompt to analyze
   * @returns - Extracted search query or null if none found
   */
  private extractSearchQuery(prompt: string): string | null {
    // Simple heuristic: Look for questions about prices, markets, or recent events
    const marketPatterns = [
      /current price of (\w+)/i,
      /(\w+) price/i,
      /market (conditions|trends|status)/i,
      /recent (news|events|developments)/i,
      /latest (information|data) (on|about) (\w+)/i
    ];
    
    for (const pattern of marketPatterns) {
      const match = prompt.match(pattern);
      if (match) {
        const baseQuery = match[0];
        const specificAsset = match[1] || match[3];
        
        if (specificAsset) {
          return `${specificAsset} cryptocurrency price and market analysis`;
        }
        return `${baseQuery} cryptocurrency market`;
      }
    }
    
    return null;
  }
  
  /**
   * Generate text using Google Gemini
   * 
   * @param prompt - The prompt to generate text from
   * @returns The generated text
   */
  async generateText(prompt: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Gemini API client not initialized');
    }
    
    try {
      console.log(`Generating text with Gemini for prompt: ${prompt.substring(0, 50)}...`);
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating text with Gemini:', error);
      throw new Error(`Gemini generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Generate structured data using Google Gemini
   * 
   * @param prompt - The prompt to generate data from
   * @param schema - The schema for the generated data
   * @returns The generated structured data
   */
  async generateStructuredData<T>(prompt: string, schema: any): Promise<T> {
    if (!this.initialized) {
      throw new Error('Gemini API client not initialized');
    }
    
    try {
      // Add instructions to generate JSON according to schema
      const jsonPrompt = `${prompt}\n\nPlease respond with valid JSON that follows this schema: ${JSON.stringify(schema)}`;
      
      console.log(`Generating structured data with Gemini: ${jsonPrompt.substring(0, 50)}...`);
      
      const result = await this.model.generateContent(jsonPrompt);
      const text = result.response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/) || [null, text];
      const jsonText = jsonMatch[1] ? jsonMatch[1].trim() : text.trim();
      
      return JSON.parse(jsonText) as T;
    } catch (error) {
      console.error('Error generating structured data with Gemini:', error);
      throw new Error(`Gemini structured data generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Check if the Gemini API client is healthy
   * 
   * @returns True if the service is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }
    
    try {
      // Simple health check by generating a short response
      const result = await this.model.generateContent('Hello, are you operational?');
      return result.response.text().length > 0;
    } catch (error) {
      console.error('Gemini API health check failed:', error);
      return false;
    }
  }
} 