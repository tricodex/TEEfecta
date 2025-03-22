/**
 * Agent Details interface
 * Describes agent capabilities and information
 */
export interface AgentDetails {
  id: string;
  name?: string;
  type: string;
  provider: string;
  capabilities: string[];
  wallet?: {
    address: string;
    network: string;
  };
  status: 'operational' | 'initializing' | 'error';
  error?: string;
}

/**
 * Portfolio Analysis Result
 * Output from portfolio analysis
 */
export interface AnalysisResult {
  summary: string;
  recommendations: string[];
  riskAssessment?: {
    level: 'low' | 'medium' | 'high';
    details: string;
  };
  opportunities?: string[];
  details?: Record<string, any>;
}

/**
 * Transaction Result
 * Result of executing a transaction
 */
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Wallet Details
 * Information about a wallet
 */
export interface WalletDetails {
  address: string;
  network: string;
  tokens?: Array<{
    symbol: string;
    name?: string;
    balance: string;
    value?: number;
  }>;
  totalValue?: number;
}

/**
 * Trading Agent interface
 * Defines the common interface for all trading agent implementations
 */
export interface TradingAgent {
  // Core methods
  initialize(options?: any): Promise<void>;
  getDetails(): Promise<AgentDetails>;
  analyzePortfolio(portfolio: any): Promise<AnalysisResult>;
  executeTransaction(transaction: any): Promise<TransactionResult>;
  
  // Memory and storage
  saveMemory(key: string, value: any): Promise<void>;
  loadMemory(key: string): Promise<any>;
  
  // Agent coordination
  coordinateWithAgents?(agents: TradingAgent[]): Promise<void>;

  // Wallet methods
  getWallet?(): Promise<any>;
  getWalletDetails?(): Promise<WalletDetails>;

  // Agent identity
  readonly recallId?: string;
} 