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
 * Mock search results for testing
 */
const MOCK_SEARCH_RESULTS: Record<string, any> = {
  "crypto market": {
    answer: "The cryptocurrency market is currently experiencing a period of volatility with Bitcoin leading the way. Ethereum shows strong fundamentals with its ecosystem growth, while DeFi protocols continue to attract significant liquidity. Regulatory developments in major markets are shaping investor sentiment.",
    results: [
      {
        title: "Current Cryptocurrency Market Analysis - March 2025",
        url: "https://example.com/crypto-analysis-2025",
        content: "The cryptocurrency market has shown resilience in March 2025, with Bitcoin maintaining its position above $100,000. Institutional adoption continues to grow as major banks integrate blockchain technology into their services."
      },
      {
        title: "DeFi Market Cap Reaches New Heights",
        url: "https://example.com/defi-growth-2025",
        content: "Decentralized Finance protocols have collectively surpassed $500 billion in Total Value Locked (TVL), marking a significant milestone for the sector. Lending protocols lead the growth."
      },
      {
        title: "NFT Market Rebounds in 2025",
        url: "https://example.com/nft-rebound-2025",
        content: "After a period of consolidation, the NFT market is seeing renewed interest in 2025, with gaming and metaverse-related NFTs driving growth. Major brands continue to explore Web3 engagement strategies."
      }
    ]
  },
  "ethereum price": {
    answer: "Ethereum (ETH) is currently trading at approximately $8,200, representing a 5.2% increase over the past 24 hours. The recent Shanghai upgrade has positively impacted network performance, while increased institutional adoption continues to drive demand.",
    results: [
      {
        title: "Ethereum Price Analysis - March 2025",
        url: "https://example.com/eth-analysis-march-2025",
        content: "Ethereum continues its upward trajectory, currently trading at $8,200. Technical indicators suggest strong support at $7,800 with resistance at $8,500. The recent network upgrades have significantly improved scalability."
      },
      {
        title: "Institutional ETH Holdings Reach Record Levels",
        url: "https://example.com/eth-institutional-2025",
        content: "Major financial institutions have increased their Ethereum holdings by 25% in Q1 2025, citing improved network fundamentals and the growing DeFi ecosystem built on Ethereum."
      }
    ]
  },
  "defi protocols": {
    answer: "Leading DeFi protocols are showing strong growth in 2025, with total value locked (TVL) exceeding $500 billion. Lending platforms and decentralized exchanges dominate the space, while newer categories like real-world asset tokenization are gaining momentum.",
    results: [
      {
        title: "Top DeFi Protocols by TVL - March 2025",
        url: "https://example.com/defi-tvl-rankings-2025",
        content: "Aave, Compound, and MakerDAO continue to lead the DeFi lending space, while decentralized exchanges like Uniswap V5 and SushiSwap show record trading volumes. New entrants in the RWA space are gaining significant attention."
      },
      {
        title: "DeFi Yield Opportunities in 2025",
        url: "https://example.com/defi-yield-2025",
        content: "Despite market maturation, DeFi protocols still offer attractive yields compared to traditional finance. Stablecoin lending rates average 4-5%, while liquidity provision on DEXes can yield 15-20% for popular pairs."
      }
    ]
  }
};

/**
 * Executes a web search using Tavily API or returns mock results for testing
 */
async function executeSearch(params: z.infer<typeof TavilySearchSchema>): Promise<string> {
  const { query, topic, searchDepth, maxResults } = params;
  
  // Check if we should use mock data
  const useMock = process.env.USE_MOCK_SEARCH === 'true';
  
  if (useMock) {
    console.log(`Using mock search results for query: ${query}`);
    
    // Find the best matching mock result
    const mockKeys = Object.keys(MOCK_SEARCH_RESULTS);
    const bestMatch = mockKeys.find(key => query.toLowerCase().includes(key)) || mockKeys[0];
    const mockData = MOCK_SEARCH_RESULTS[bestMatch];
    
    // Format the mock results
    let results = `Search results for "${query}":\n\n`;
    
    if (mockData.answer) {
      results += `Summary: ${mockData.answer}\n\n`;
    }
    
    if (mockData.results && mockData.results.length > 0) {
      results += "Sources:\n";
      mockData.results.slice(0, maxResults).forEach((result: any, index: number) => {
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
  }
  
  // Use the real API
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
 * Mock image search results for testing
 */
const MOCK_IMAGE_SEARCH_RESULTS: Record<string, any> = {
  "default": {
    images: [
      {
        title: "Bitcoin Price Chart 2025",
        url: "https://example.com/images/bitcoin-chart-2025.jpg",
        description: "Bitcoin price chart showing the growth trend throughout 2025"
      },
      {
        title: "Ethereum Network Visualization",
        url: "https://example.com/images/ethereum-network-2025.jpg",
        description: "Visual representation of Ethereum network activity in 2025"
      },
      {
        title: "DeFi Dashboard Interface",
        url: "https://example.com/images/defi-dashboard-2025.jpg",
        description: "Modern DeFi dashboard showing portfolio performance and yield opportunities"
      }
    ]
  },
  "crypto logo": {
    images: [
      {
        title: "Bitcoin Logo 2025 Edition",
        url: "https://example.com/images/bitcoin-logo-2025.jpg",
        description: "Official Bitcoin logo with 2025 anniversary markings"
      },
      {
        title: "Ethereum Diamond Logo",
        url: "https://example.com/images/ethereum-logo-2025.jpg",
        description: "Ethereum's diamond-shaped logo in gradient colors"
      },
      {
        title: "Top 10 Cryptocurrency Logos",
        url: "https://example.com/images/top-crypto-logos-2025.jpg",
        description: "Compilation of the top 10 cryptocurrency logos by market cap in 2025"
      }
    ]
  }
};

/**
 * Executes an image search using Tavily API or returns mock results for testing
 */
async function executeImageSearch(params: z.infer<typeof TavilyImageSearchSchema>): Promise<string> {
  const { query, maxResults } = params;
  
  // Check if we should use mock data
  const useMock = process.env.USE_MOCK_SEARCH === 'true';
  
  if (useMock) {
    console.log(`Using mock image search results for query: ${query}`);
    
    // Find the best matching mock result
    const mockKeys = Object.keys(MOCK_IMAGE_SEARCH_RESULTS);
    const bestMatch = mockKeys.find(key => query.toLowerCase().includes(key)) || 'default';
    const mockData = MOCK_IMAGE_SEARCH_RESULTS[bestMatch];
    
    // Format the mock results
    let results = `Image search results for "${query}":\n\n`;
    
    if (mockData.images && mockData.images.length > 0) {
      mockData.images.slice(0, maxResults).forEach((image: any, index: number) => {
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
  }
  
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
 * Mock crypto news results for testing
 */
const MOCK_CRYPTO_NEWS_RESULTS: Record<string, any> = {
  "default": {
    answer: "The cryptocurrency market has been trending upward over the past week with Bitcoin reaching new all-time highs above $120,000. Institutional adoption continues to drive the market, with several major banks announcing crypto custody services. Regulatory developments remain a focus, with positive signals from various jurisdictions.",
    results: [
      {
        title: "Bitcoin Breaks $120K as Institutional Money Flows In",
        published_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        url: "https://example.com/news/bitcoin-new-ath-2025",
        content: "Bitcoin has reached a new all-time high above $120,000 as institutional investors continue to allocate portions of their portfolios to the leading cryptocurrency. Several Fortune 500 companies announced Bitcoin treasury allocations this week."
      },
      {
        title: "Ethereum's Sharding Implementation Shows Promising Results",
        published_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        url: "https://example.com/news/ethereum-sharding-success",
        content: "Ethereum developers have reported significant progress with the network's sharding implementation, with early tests showing transaction throughput exceeding 100,000 TPS. This development could solidify Ethereum's position as the leading smart contract platform."
      },
      {
        title: "DeFi TVL Surpasses $500 Billion Milestone",
        published_date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        url: "https://example.com/news/defi-tvl-milestone",
        content: "The total value locked in DeFi protocols has exceeded $500 billion for the first time, marking a significant milestone for the sector. Lending protocols and decentralized exchanges account for the majority of the locked value."
      }
    ]
  },
  "bitcoin": {
    answer: "Bitcoin has been experiencing strong bullish momentum, breaking the $120,000 mark for the first time. The surge is attributed to increased institutional adoption, reduced selling pressure following the latest halving, and growing mainstream acceptance as a store of value.",
    results: [
      {
        title: "Bitcoin Eyes $130K After Breaking Key Resistance",
        published_date: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
        url: "https://example.com/news/bitcoin-130k-target",
        content: "Technical analysts predict Bitcoin could reach $130,000 within weeks after breaking through key resistance levels. On-chain metrics show strong holder behavior with over 70% of supply not moving in more than a year."
      },
      {
        title: "Major Pension Fund Allocates 3% to Bitcoin",
        published_date: new Date(Date.now() - 129600000).toISOString(), // 1.5 days ago
        url: "https://example.com/news/pension-fund-bitcoin",
        content: "One of the largest U.S. pension funds has announced a 3% allocation to Bitcoin, representing approximately $15 billion in investment. The CIO cited Bitcoin's maturation as an institutional-grade asset and inflation hedge."
      }
    ]
  },
  "ethereum": {
    answer: "Ethereum has seen significant growth with price exceeding $8,200 as network activity reaches all-time highs. The successful implementation of various scaling solutions has substantially improved transaction throughput and reduced gas fees. Institutional interest in Ethereum continues to grow alongside its expanding ecosystem.",
    results: [
      {
        title: "Ethereum Surpasses Bitcoin in Daily Transaction Value",
        published_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        url: "https://example.com/news/ethereum-transaction-value",
        content: "For the third consecutive week, Ethereum has processed more daily transaction value than Bitcoin, highlighting its growing importance in the cryptocurrency ecosystem. DeFi and NFT activity continue to drive network usage."
      },
      {
        title: "Ethereum's Deflationary Mechanism Burns $1B Monthly",
        published_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        url: "https://example.com/news/ethereum-burn-rate",
        content: "Ethereum's EIP-1559 fee burning mechanism is now removing approximately $1 billion worth of ETH from circulation monthly, contributing to the asset's deflationary status and supporting its price appreciation."
      }
    ]
  }
};

/**
 * Executes a crypto news search using Tavily API or returns mock results for testing
 */
async function executeCryptoNews(params: z.infer<typeof TavilyCryptoNewsSchema>): Promise<string> {
  const { asset, days, maxResults } = params;
  
  const query = asset 
    ? `latest news about ${asset} cryptocurrency`
    : 'latest cryptocurrency market news';
  
  // Check if we should use mock data
  const useMock = process.env.USE_MOCK_SEARCH === 'true';
  
  if (useMock) {
    console.log(`Using mock crypto news search results for: ${query}`);
    
    // Find the best matching mock result
    const mockKeys = Object.keys(MOCK_CRYPTO_NEWS_RESULTS);
    const bestMatch = asset && mockKeys.find(key => key.toLowerCase().includes(asset.toLowerCase())) || 'default';
    const mockData = MOCK_CRYPTO_NEWS_RESULTS[bestMatch];
    
    // Format the mock results
    let results = asset 
      ? `Latest news for ${asset} cryptocurrency:\n\n` 
      : "Latest cryptocurrency market news:\n\n";
    
    if (mockData.answer) {
      results += `Summary: ${mockData.answer}\n\n`;
    }
    
    if (mockData.results && mockData.results.length > 0) {
      results += "News sources:\n";
      mockData.results.slice(0, maxResults).forEach((result: any, index: number) => {
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
  }
  
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