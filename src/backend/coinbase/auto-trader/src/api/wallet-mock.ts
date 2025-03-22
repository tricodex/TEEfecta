// Wallet Mock Implementation for Testing
import { v4 as uuidv4 } from 'uuid';

// Extended interface for wallet operations to match AgentKit's expectations
export interface WalletProvider {
  getAddress(): string;
  getBalance(): Promise<string>;
  getChainId(): string;
  signMessage(message: string): Promise<string>;
  signTransaction(tx: any): Promise<string>;
  sendTransaction(tx: any): Promise<{ transactionHash: string }>;
  
  // Additional methods needed for AgentKit
  execute?: (params: any) => Promise<any>;
  trackInitialization?: (status: string) => void;
  getNetwork?: () => Promise<{ id: string, name: string }>;
  getName?: () => string;
  nativeTransfer?: (to: string, amount: string) => Promise<any>;
}

/**
 * A mock wallet provider for testing
 * This can be used when a real wallet provider is not available
 */
export class MockWalletProvider implements WalletProvider {
  private address: string;
  private privateKey: string;
  private chainId: string;
  private balance: string;

  constructor(
    address: string = `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    privateKey: string = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    chainId: string = '84532',
    balance: string = '1000000000000000000' // 1 ETH
  ) {
    this.address = address;
    this.privateKey = privateKey;
    this.chainId = chainId;
    this.balance = balance;
    
    console.log(`MockWalletProvider initialized with address: ${this.address}`);
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    return this.address;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<string> {
    return this.balance;
  }

  /**
   * Get chain ID
   */
  getChainId(): string {
    return this.chainId;
  }

  /**
   * Sign a message (mock implementation)
   */
  async signMessage(message: string): Promise<string> {
    console.log(`[MOCK] Signing message: ${message}`);
    // Create a mock signature (65 bytes = 130 hex chars + 0x prefix)
    return `0x${Array(130).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  }

  /**
   * Sign a transaction (mock implementation)
   */
  async signTransaction(tx: any): Promise<string> {
    console.log(`[MOCK] Signing transaction to: ${tx.to}, value: ${tx.value}`);
    // Create a mock signed transaction
    return `0x${Array(200).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  }

  /**
   * Send a transaction (mock implementation)
   */
  async sendTransaction(tx: any): Promise<{ transactionHash: string }> {
    console.log(`[MOCK] Sending transaction to: ${tx.to}, value: ${tx.value}`);
    
    // Create a mock transaction hash
    const hash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    // Log the transaction information
    console.log(`[MOCK] Transaction sent with hash: ${hash}`);
    
    return { transactionHash: hash };
  }
  
  /**
   * Execute a wallet action (mock implementation for AgentKit compatibility)
   */
  async execute(params: any): Promise<any> {
    console.log(`[MOCK] Executing action: ${JSON.stringify(params)}`);
    
    // Mock different actions based on actionId
    if (params.actionId === 'get_wallet_details') {
      return {
        address: this.address,
        balance: this.balance,
        chainId: this.chainId,
        network: 'testnet'
      };
    }
    
    if (params.actionId === 'transfer') {
      console.log(`[MOCK] Transferring ${params.params.amount} to ${params.params.to}`);
      return {
        success: true,
        transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        status: 'completed'
      };
    }
    
    // Default mock response
    return {
      success: true,
      mockResponse: true,
      params
    };
  }
  
  /**
   * Track initialization (mock implementation for AgentKit compatibility)
   */
  trackInitialization(status: string): void {
    console.log(`[MOCK] Tracking initialization: ${status}`);
  }
  
  /**
   * Get network (mock implementation for AgentKit compatibility)
   */
  async getNetwork(): Promise<{ id: string, name: string }> {
    return {
      id: this.chainId,
      name: 'Base Sepolia'
    };
  }
  
  /**
   * Get name (mock implementation for AgentKit compatibility)
   */
  getName(): string {
    return 'MockWalletProvider';
  }
  
  /**
   * Native transfer (mock implementation for AgentKit compatibility)
   */
  async nativeTransfer(to: string, amount: string): Promise<any> {
    console.log(`[MOCK] Native transfer: ${amount} to ${to}`);
    return {
      success: true,
      transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      status: 'completed'
    };
  }
}

/**
 * Factory function to create a mock wallet provider
 * @param address Optional wallet address
 */
export function createMockWalletProvider(address?: string): WalletProvider {
  return new MockWalletProvider(address);
} 