// Wallet Mock Implementation for Testing
import { v4 as uuidv4 } from 'uuid';

// Interface for wallet operations
export interface WalletProvider {
  getAddress(): string;
  getBalance(): Promise<string>;
  getChainId(): string;
  signMessage(message: string): Promise<string>;
  signTransaction(tx: any): Promise<string>;
  sendTransaction(tx: any): Promise<{ transactionHash: string }>;
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
}

/**
 * Factory function to create a mock wallet provider
 */
export function createMockWalletProvider(): WalletProvider {
  return new MockWalletProvider();
} 