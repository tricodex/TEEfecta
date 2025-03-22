// Test Tavily search mock functionality directly
import * as dotenv from 'dotenv';
import axios from 'axios';

// Load environment configuration
dotenv.config();

// Set mock search environment variable
process.env.USE_MOCK_SEARCH = 'true';

// Mock search results for testing
const MOCK_SEARCH_RESULTS = {
  "crypto market": {
    answer: "The cryptocurrency market is currently experiencing volatility with Bitcoin leading the way.",
    results: [
      {
        title: "Current Cryptocurrency Market Analysis - March 2025",
        url: "https://example.com/crypto-analysis-2025",
        content: "The cryptocurrency market has shown resilience in March 2025, with Bitcoin maintaining its position above $100,000."
      },
      {
        title: "DeFi Market Cap Reaches New Heights",
        url: "https://example.com/defi-growth-2025",
        content: "Decentralized Finance protocols have collectively surpassed $500 billion in Total Value Locked (TVL)."
      }
    ]
  },
  "ethereum price": {
    answer: "Ethereum (ETH) is currently trading at approximately $8,200, representing a 5.2% increase.",
    results: [
      {
        title: "Ethereum Price Analysis - March 2025",
        url: "https://example.com/eth-analysis-march-2025",
        content: "Ethereum continues its upward trajectory, currently trading at $8,200."
      }
    ]
  }
};

// Simple mock search function
async function mockSearch(query: string, maxResults = 2) {
  console.log(`Searching for: "${query}"`);
  
  // Find the best matching mock result
  const mockKeys = Object.keys(MOCK_SEARCH_RESULTS);
  const bestMatch = mockKeys.find(key => query.toLowerCase().includes(key)) || mockKeys[0];
  const mockData = MOCK_SEARCH_RESULTS[bestMatch as keyof typeof MOCK_SEARCH_RESULTS];
  
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
        results += `   Excerpt: ${result.content}\n`;
      }
      results += '\n';
    });
  } else {
    results += "No results found.\n";
  }
  
  return results;
}

// Function to test search functionality
async function testMockSearch() {
  console.log('Testing mock search functionality...');
  
  // Test with different queries
  const queries = ['crypto market', 'ethereum price', 'defi protocols', 'unknown topic'];
  
  for (const query of queries) {
    console.log(`\n\nTesting search for: "${query}"`);
    try {
      const result = await mockSearch(query, 2);
      console.log(result);
    } catch (error) {
      console.error('Error executing search:', error);
    }
  }
  
  console.log('\nMock search tests completed');
}

// Run tests
testMockSearch().catch(error => {
  console.error('Test failed:', error);
});
