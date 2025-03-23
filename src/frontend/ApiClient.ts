// Export the real ApiClient from the services directory
import ApiClient, { API_CONFIG, TradeRequest, PortfolioAnalysisRequest, MemoryQueryParams } from './services/ApiClient';

// Re-export everything from the real ApiClient
export { 
  ApiClient,
  API_CONFIG,
  TradeRequest, 
  PortfolioAnalysisRequest, 
  MemoryQueryParams 
};

// Export the ApiClient instance as default
export default ApiClient; 