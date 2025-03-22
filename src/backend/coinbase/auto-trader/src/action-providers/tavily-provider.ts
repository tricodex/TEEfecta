import axios from 'axios';
import { z } from 'zod';
import { customActionProvider } from '@coinbase/agentkit';

// Schema for the Tavily web search action
const TavilySearchSchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  topic: z.string().optional().default('general'),
  searchDepth: z.enum(['basic', 'advanced']).optional().default('basic'),
  maxResults: z.number().int().positive().optional().default(5)
});

// Schema for the Tavily image search action
const TavilyImageSearchSchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  maxResults: z.number().int().positive().optional().default(5)
});

// Schema for the Tavily crypto news search action
const TavilyCryptoNewsSchema = z.object({
  asset: z.string().optional(),
  days: z.number().int().positive().optional().default(3),
  maxResults: z.number().int().positive().optional().default(5)
});

/**
 * Executes a web search using Tavily API
 */
async function executeSearch(params: z.infer<typeof TavilySearchSchema>): Promise<string> {
  const { query, topic, searchDepth, maxResults } = params;
  
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set');
  }
  
  try {
    console.log(`Executing Tavily search for query: ${query}`);
    
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query,
      topic,
      search_depth: searchDepth,
      max_results: maxResults,
      include_answer: true
    });
    
    // Format the results in a readable format
    let results = `Search results for "${query}":\n\n`;
    
    if (response.data.answer) {
      results += `Summary: ${response.data.answer}\n\n`;
    }
    
    if (response.data.results && response.data.results.length > 0) {
      results += "Sources:\n";
      response.data.results.forEach((result: any, index: number) => {
        results += `${index + 1}. ${result.title}\n`;
        results += `   URL: ${result.url}\n`;
        if (result.content) {
          results += `   Excerpt: ${result.content.substring(0, 150)}...\n`;
        }
        results += '\n';
      });
    } else {
      results += "No results found.\n";
    }
    
    return results;
  } catch (error) {
    console.error('Error in Tavily search:', error);
    throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Executes an image search using Tavily API
 */
async function executeImageSearch(params: z.infer<typeof TavilyImageSearchSchema>): Promise<string> {
  const { query, maxResults } = params;
  
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set');
  }
  
  try {
    console.log(`Executing Tavily image search for query: ${query}`);
    
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query,
      include_images: true,
      max_results: maxResults,
      include_answer: false
    });
    
    // Format the results in a readable format
    let results = `Image search results for "${query}":\n\n`;
    
    if (response.data.images && response.data.images.length > 0) {
      response.data.images.forEach((image: any, index: number) => {
        results += `${index + 1}. Image: ${image.title || 'Untitled'}\n`;
        results += `   URL: ${image.url}\n`;
        if (image.description) {
          results += `   Description: ${image.description}\n`;
        }
        results += '\n';
      });
    } else {
      results += "No images found.\n";
    }
    
    return results;
  } catch (error) {
    console.error('Error in Tavily image search:', error);
    throw new Error(`Tavily image search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Executes a crypto news search using Tavily API
 */
async function executeCryptoNews(params: z.infer<typeof TavilyCryptoNewsSchema>): Promise<string> {
  const { asset, days, maxResults } = params;
  
  const query = asset 
    ? `latest news about ${asset} cryptocurrency`
    : 'latest cryptocurrency market news';
  
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is not set');
  }
  
  try {
    console.log(`Executing Tavily crypto news search for: ${query}`);
    
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query,
      topic: 'news',
      search_depth: 'basic',
      max_results: maxResults,
      time_window: `${days}d`,
      include_answer: true,
      sort_by: 'date'
    });
    
    // Format the results in a readable format
    let results = asset 
      ? `Latest news for ${asset} cryptocurrency:\n\n` 
      : "Latest cryptocurrency market news:\n\n";
    
    if (response.data.answer) {
      results += `Summary: ${response.data.answer}\n\n`;
    }
    
    if (response.data.results && response.data.results.length > 0) {
      results += "News sources:\n";
      response.data.results.forEach((result: any, index: number) => {
        results += `${index + 1}. ${result.title}\n`;
        results += `   Date: ${new Date(result.published_date || Date.now()).toLocaleString()}\n`;
        results += `   URL: ${result.url}\n`;
        if (result.content) {
          results += `   Excerpt: ${result.content.substring(0, 150)}...\n`;
        }
        results += '\n';
      });
    } else {
      results += "No news articles found.\n";
    }
    
    return results;
  } catch (error) {
    console.error('Error in Tavily crypto news search:', error);
    throw new Error(`Tavily crypto news search failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * TavilyActionProvider creates a Tavily web search action provider for AgentKit
 */
export function tavilyActionProvider() {
  return customActionProvider([
    {
      name: 'tavily_search',
      description: 'Search the web for real-time cryptocurrency information using Tavily API',
      schema: TavilySearchSchema,
      invoke: executeSearch
    },
    {
      name: 'tavily_image_search',
      description: 'Search for images related to cryptocurrency and financial markets',
      schema: TavilyImageSearchSchema,
      invoke: executeImageSearch
    },
    {
      name: 'tavily_crypto_news',
      description: 'Search for the latest cryptocurrency news and market updates',
      schema: TavilyCryptoNewsSchema,
      invoke: executeCryptoNews
    }
  ]);
} 