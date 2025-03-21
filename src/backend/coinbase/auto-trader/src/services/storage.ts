/**
 * Secure storage service for managing sensitive data
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * StorageService provides encrypted storage for sensitive data
 */
export class StorageService {
  private dataDir: string;
  
  /**
   * Initialize the storage service
   * @param dataDir - Directory to store data files
   */
  constructor(dataDir?: string) {
    // Use data directory from environment or default to './data'
    this.dataDir = dataDir || process.env.DATA_DIR || './data';
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }
  
  /**
   * Store data securely
   * @param key - Key to identify the stored data
   * @param data - Data to store (will be stringified)
   * @param password - Password for encryption
   */
  public async store(key: string, data: any, password: string): Promise<void> {
    // Stringify data
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Encrypt the data
    const encryptedData = this.encryptData(stringData, password);
    
    // Write to file
    const filePath = path.join(this.dataDir, this.sanitizeKey(key));
    fs.writeFileSync(filePath, encryptedData);
  }
  
  /**
   * Retrieve and decrypt data
   * @param key - Key of the data to retrieve
   * @param password - Password for decryption
   * @returns The decrypted data, parsed if JSON
   */
  public async retrieve(key: string, password: string): Promise<any> {
    try {
      // Read from file
      const filePath = path.join(this.dataDir, this.sanitizeKey(key));
      const encryptedData = fs.readFileSync(filePath);
      
      // Decrypt the data
      const decryptedString = this.decryptData(encryptedData, password);
      
      // Try to parse as JSON
      try {
        return JSON.parse(decryptedString);
      } catch {
        // Return as string if not valid JSON
        return decryptedString;
      }
    } catch (error) {
      console.error(`Error retrieving data for key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Check if data exists for a key
   * @param key - Key to check
   * @returns Whether data exists for the key
   */
  public exists(key: string): boolean {
    const filePath = path.join(this.dataDir, this.sanitizeKey(key));
    return fs.existsSync(filePath);
  }
  
  /**
   * Delete data for a key
   * @param key - Key to delete
   */
  public delete(key: string): void {
    const filePath = path.join(this.dataDir, this.sanitizeKey(key));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  
  /**
   * List all stored keys
   * @returns Array of keys
   */
  public list(): string[] {
    try {
      return fs.readdirSync(this.dataDir);
    } catch (error) {
      console.error('Error listing keys:', error);
      return [];
    }
  }
  
  /**
   * Sanitize a key for use as a filename
   * @param key - Key to sanitize
   * @returns Sanitized key
   */
  private sanitizeKey(key: string): string {
    // Replace unsafe characters with underscores
    return key.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
  
  /**
   * Encrypt data with password
   * @param data - String data to encrypt
   * @param password - Password for encryption
   * @returns Encrypted data
   */
  private encryptData(data: string, password: string): Buffer {
    // Generate a salt
    const salt = crypto.randomBytes(16);
    
    // Derive a key from the password
    const key = crypto.scryptSync(password, salt, 32);
    
    // Create an initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create a cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    
    // Return salt + iv + encrypted data
    return Buffer.concat([salt, iv, encrypted]);
  }
  
  /**
   * Decrypt data with password
   * @param encryptedData - Encrypted data buffer
   * @param password - Password for decryption
   * @returns Decrypted string
   */
  private decryptData(encryptedData: Buffer, password: string): string {
    // Extract salt (first 16 bytes)
    const salt = encryptedData.subarray(0, 16);
    
    // Extract iv (next 16 bytes)
    const iv = encryptedData.subarray(16, 32);
    
    // Extract encrypted data (rest of the buffer)
    const encrypted = encryptedData.subarray(32);
    
    // Derive the key using the same parameters
    const key = crypto.scryptSync(password, salt, 32);
    
    // Create a decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    // Return as a string
    return decrypted.toString('utf8');
  }
}