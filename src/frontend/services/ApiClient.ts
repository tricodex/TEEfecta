/**
 * ApiClient - Service to interface with the 4g3n7 Auto Trader backend
 * Provides methods for API interactions with proper types and error handling
 */

// Default API configuration - Can be updated after deployment
export const API_CONFIG = {
  // Get the base URL from environment variable or fallback to development values
  baseUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3222',
  
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// Request Types
export interface TradeRequest {
  fromAsset: string;
  toAsset: string;
  amount: number;
  type: 'market' | 'limit';
  price?: number;
}

export interface PortfolioAnalysisRequest {
  portfolio: {
    tokens: Array<{
      symbol: string;
      balance: string;
    }>;
  };
  marketData: {
    tokens: Array<{
      symbol: string;
      price: string;
      change24h: string;
    }>;
  };
}

export interface MemoryQueryParams {
  type?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  agentId?: string;
  tags?: string[];
}

/**
 * Main API client for the 4g3n7 Auto Trader backend
 */
export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private timeout: number;

  constructor(config = API_CONFIG) {
    this.baseUrl = config.baseUrl;
    this.headers = config.headers;
    this.timeout = config.timeout;
  }

  /**
   * Make a GET request to the API
   */
  private async get(endpoint: string, params?: Record<string, any>) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key].toString());
        }
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Make a POST request to the API
   */
  private async post(endpoint: string, data: any) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Set a new base URL for the API client (useful for changing environments)
   */
  public setBaseUrl(url: string) {
    this.baseUrl = url;
    console.log(`API client now pointing to: ${url}`);
    return this;
  }

  /**
   * Check the health status of the backend
   */
  public async getHealth() {
    return this.get('/api/health');
  }

  /**
   * Get the status of the agent
   */
  public async getAgentStatus() {
    return this.get('/api/agent/status');
  }

  /**
   * Analyze the portfolio
   */
  public async analyzePortfolio(request: PortfolioAnalysisRequest) {
    return this.post('/api/analyze', request);
  }

  /**
   * Execute a trade
   */
  public async executeTrade(request: TradeRequest) {
    return this.post('/api/trade', request);
  }

  /**
   * Get memories from Recall
   */
  public async getMemories(params: MemoryQueryParams) {
    return this.get('/api/recall', params);
  }

  /**
   * Get the attestation status
   */
  public async getAttestationStatus() {
    return this.get('/api/attestation');
  }
}

// Export a singleton instance
export default new ApiClient(); 