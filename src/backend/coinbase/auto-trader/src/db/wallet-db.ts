import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// DB configuration
const DEFAULT_DB_DIR = process.env.WALLET_DB_DIR || 'data/wallets';
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

/**
 * Wallet Database Implementation
 * 
 * Secure storage for CDP wallet data with encryption
 */
export class WalletDB {
  private dbDir: string;
  private encryptionKey: string;
  private initialized: boolean = false;

  constructor(dbDir?: string, encryptionKey?: string) {
    this.dbDir = dbDir || DEFAULT_DB_DIR;
    this.encryptionKey = encryptionKey || ENCRYPTION_KEY;
  }

  /**
   * Initialize the database directory
   */
  async initialize(): Promise<void> {
    try {
      if (!fs.existsSync(this.dbDir)) {
        fs.mkdirSync(this.dbDir, { recursive: true });
        console.log(`Created wallet database directory: ${this.dbDir}`);
      }
      this.initialized = true;
    } catch (error) {
      console.error(`Failed to initialize wallet database: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`WalletDB initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Encrypt wallet data for secure storage
   * 
   * @param data - Wallet data to encrypt
   * @returns Encrypted data as a string
   */
  private encrypt(data: any): string {
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      const serializedData = JSON.stringify(data);
      let encrypted = cipher.update(serializedData, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Store IV with encrypted data for decryption
      return JSON.stringify({
        iv: iv.toString('hex'),
        data: encrypted
      });
    } catch (error) {
      console.error(`Encryption error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to encrypt wallet data');
    }
  }

  /**
   * Decrypt wallet data
   * 
   * @param encryptedStr - Encrypted data string
   * @returns Decrypted wallet data
   */
  private decrypt(encryptedStr: string): any {
    try {
      const { iv, data } = JSON.parse(encryptedStr);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error(`Decryption error: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Failed to decrypt wallet data');
    }
  }

  /**
   * Save wallet data for a specific agent/user
   * 
   * @param agentId - Unique ID for the agent/user
   * @param walletData - CDP wallet data to save
   */
  async saveWalletData(agentId: string, walletData: any): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    try {
      // Generate filename from agent ID
      const filename = path.join(this.dbDir, `${agentId}.wallet`);
      
      // Encrypt the wallet data
      const encryptedData = this.encrypt(walletData);
      
      // Write to file
      fs.writeFileSync(filename, encryptedData);
      console.log(`Saved wallet data for agent: ${agentId}`);
    } catch (error) {
      console.error(`Failed to save wallet data: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`WalletDB save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load wallet data for a specific agent/user
   * 
   * @param agentId - Unique ID for the agent/user
   * @returns The wallet data or null if not found
   */
  async loadWalletData(agentId: string): Promise<any | null> {
    if (!this.initialized) await this.initialize();
    
    try {
      // Generate filename from agent ID
      const filename = path.join(this.dbDir, `${agentId}.wallet`);
      
      // Check if file exists
      if (!fs.existsSync(filename)) {
        console.log(`No saved wallet data found for agent: ${agentId}`);
        return null;
      }
      
      // Read and decrypt the file
      const encryptedData = fs.readFileSync(filename, 'utf8');
      const walletData = this.decrypt(encryptedData);
      
      console.log(`Loaded wallet data for agent: ${agentId}`);
      return walletData;
    } catch (error) {
      console.error(`Failed to load wallet data: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Check if wallet data exists for a specific agent/user
   * 
   * @param agentId - Unique ID for the agent/user
   * @returns True if wallet data exists
   */
  async hasWalletData(agentId: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    const filename = path.join(this.dbDir, `${agentId}.wallet`);
    return fs.existsSync(filename);
  }

  /**
   * Delete wallet data for a specific agent/user
   * 
   * @param agentId - Unique ID for the agent/user
   */
  async deleteWalletData(agentId: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    try {
      const filename = path.join(this.dbDir, `${agentId}.wallet`);
      
      if (!fs.existsSync(filename)) {
        return false;
      }
      
      fs.unlinkSync(filename);
      console.log(`Deleted wallet data for agent: ${agentId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete wallet data: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * List all agents with saved wallet data
   * 
   * @returns Array of agent IDs
   */
  async listAgents(): Promise<string[]> {
    if (!this.initialized) await this.initialize();
    
    try {
      const files = fs.readdirSync(this.dbDir);
      return files
        .filter(file => file.endsWith('.wallet'))
        .map(file => file.replace('.wallet', ''));
    } catch (error) {
      console.error(`Failed to list agents: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}

// Singleton instance for global use
let walletDBInstance: WalletDB | null = null;

/**
 * Get or create the wallet database instance
 */
export function getWalletDB(): WalletDB {
  if (!walletDBInstance) {
    walletDBInstance = new WalletDB();
    walletDBInstance.initialize().catch(error => {
      console.error('Failed to initialize wallet database:', error);
    });
  }
  return walletDBInstance;
} 