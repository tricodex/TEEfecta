/**
 * LLM Service Interface
 * Defines the contract that all LLM implementations must follow
 */
export interface LLMService {
  /**
   * Generate text using an LLM model
   * 
   * @param prompt - The prompt to generate text from
   * @returns The generated text
   */
  generateText(prompt: string): Promise<string>;
  
  /**
   * Generate text with web search enhancement
   * 
   * @param prompt - The prompt to generate text from
   * @param searchQuery - Optional explicit search query 
   * @returns The generated text enhanced with web search results
   */
  generateTextWithWebSearch?(prompt: string, searchQuery?: string): Promise<string>;
  
  /**
   * Generate structured data using an LLM model
   * 
   * @param prompt - The prompt to generate data from
   * @param schema - The schema for the generated data
   * @returns The generated structured data
   */
  generateStructuredData<T>(prompt: string, schema: any): Promise<T>;
  
  /**
   * Check if the LLM service is healthy
   * 
   * @returns True if the service is healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;
} 