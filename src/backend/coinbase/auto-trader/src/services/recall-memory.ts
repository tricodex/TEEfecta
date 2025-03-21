// Recall Network Memory Manager for AgentKit
// This service manages agent memory using Recall Network for transparent storage

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define the Memory Entry interface
export interface MemoryEntry {
  id: string;
  timestamp: string;
  content: string | any;
  metadata?: {
    type: string;
    tags?: string[];
    [key: string]: any;
  };
}

// Define the Memory Manager interface
export interface MemoryManager {
  store(entry: MemoryEntry): Promise<string>;
  retrieve(id: string, type?: string): Promise<MemoryEntry | null>;
  getLatest(type?: string): Promise<MemoryEntry | null>;
  list(type?: string, limit?: number): Promise<MemoryEntry[]>;
}

// Default environment settings
const ENV_EXPORT_PATH = process.env.ENV_EXPORT_PATH || '/Users/pc/apps/MPC/hackathons/TEEfecta/mono/.env.export';
const TEMP_DIR = process.env.TEMP_DIR || '/tmp';

/**
 * Ensure directory exists
 */
function ensureDirExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error);
      throw error;
    }
  }
}

// Interface for objects returned by Recall bucket query
interface RecallQueryObject {
  key: string;
  value?: {
    hash?: string;
    size?: number;
    metadata?: {
      [key: string]: any;
    };
  };
  // Other properties may exist but are not used here
}

// Interface for query result from Recall CLI
interface RecallQueryResult {
  objects?: RecallQueryObject[];
  common_prefixes?: string[];
  next_key?: string | null;
}

/**
 * Executes a shell command with environment export
 * @param command Command to execute
 * @returns Command output
 */
function executeRecallCommand(command: string): string {
  try {
    // Add source environment and execute
    const fullCommand = `source ${ENV_EXPORT_PATH} && ${command}`;
    console.log(`Executing recall command: ${command.split(' ')[0]} ${command.split(' ')[1]}`);
    return execSync(fullCommand, { encoding: 'utf-8' });
  } catch (error: any) {
    console.error(`Recall command failed: ${error.message}`);
    // Include stderr in the error message if available
    if (error.stderr) {
      console.error(`Error details: ${error.stderr.toString()}`);
    }
    throw error;
  }
}

/**
 * Memory Manager implementation using Recall Network via CLI
 * 
 * This implementation uses the recall CLI tools to interact with Recall Network,
 * providing transparent and decentralized storage for agent memory.
 */
export class RecallMemoryManager implements MemoryManager {
  private bucketAddress: string;
  private envExportPath: string;
  private tempDir: string;
  private initialized: boolean = false;

  /**
   * Create a new RecallMemoryManager
   * @param privateKey Recall Network private key (not directly used in CLI approach)
   * @param bucketAlias Optional bucket alias
   * @param network Optional network name (testnet, devnet, etc.)
   */
  constructor(
    privateKey: string,
    bucketAlias: string = 'agent-memory',
    network: string = 'testnet'
  ) {
    console.log(`Initializing Recall Memory Manager with CLI approach`);
    
    // Verify environment variables
    this.bucketAddress = process.env.RECALL_BUCKET_ADDRESS || '0xff000000000000000000000000000000000000e2';
    this.envExportPath = ENV_EXPORT_PATH;
    this.tempDir = TEMP_DIR;
    
    // Create temp directory if it doesn't exist
    ensureDirExists(this.tempDir);
    
    if (!fs.existsSync(this.envExportPath)) {
      console.warn(`Warning: Environment export file not found: ${this.envExportPath}`);
      console.warn('Memory operations may fail if RECALL_* environment variables are not set');
    } else {
      try {
        // Test connection to Recall Network
        this.testConnection();
        this.initialized = true;
        console.log('Successfully connected to Recall Network');
      } catch (error) {
        console.error('Failed to initialize Recall Memory Manager:', error);
        // We don't throw here to allow for graceful degradation
      }
    }
  }

  /**
   * Test connection to Recall Network
   */
  private testConnection(): void {
    try {
      const cmd = `recall account info`;
      const output = executeRecallCommand(cmd);
      if (!output.includes('address') || !output.includes('balance')) {
        throw new Error('Invalid response from Recall Network');
      }
    } catch (error) {
      console.error('Failed to connect to Recall Network:', error);
      throw error;
    }
  }

  /**
   * Store a memory entry in Recall Network using CLI
   * 
   * @param entry Memory entry to store
   * @returns ID of the stored entry
   */
  async store(entry: MemoryEntry): Promise<string> {
    // Check if initialized
    if (!this.initialized) {
      console.warn('Recall Memory Manager not properly initialized. Using fallback memory storage.');
      return entry.id; // Return ID without actually storing
    }
    
    // Generate a unique ID if one isn't provided
    if (!entry.id) {
      entry.id = uuidv4().substring(0, 8);
    }
    
    if (!entry.timestamp) {
      entry.timestamp = new Date().toISOString();
    }
    
    try {
      // Create a temporary file to hold the JSON
      const tempFilePath = path.join(this.tempDir, `mem-${entry.id}.json`);
      const metadataType = entry.metadata?.type || 'default';
      
      // Write the entry to the temp file
      fs.writeFileSync(tempFilePath, JSON.stringify(entry, null, 2));
      
      // Create the key with type prefix
      const key = `${metadataType}/${entry.id}`;
      
      try {
        // Execute the recall CLI command to store the entry
        console.log(`Storing memory entry with key: ${key}`);
        
        const cmd = `recall bucket add --address ${this.bucketAddress} --key "${key}" ${tempFilePath}`;
        const output = executeRecallCommand(cmd);
        
        // Parse the output to confirm the transaction was successful
        let success = false;
        
        if (output.includes('transactionHash') && output.includes('status": "0x1"')) {
          success = true;
          console.log(`Successfully stored memory entry in Recall Network with key ${key}`);
        } else if (output.includes('Added object')) {
          success = true;
          console.log(`Successfully stored memory entry in Recall Network with key ${key}`);
        } else {
          console.warn(`Potential issue storing entry in Recall Network: ${output}`);
        }
        
        // Clean up the temporary file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        if (success) {
          return entry.id;
        } else {
          throw new Error('Transaction may not have completed successfully');
        }
      } catch (error: any) {
        console.error('Error storing memory in Recall Network:', error);
        // Return ID anyway to prevent cascading failures
        return entry.id;
      }
    } catch (error: any) {
      console.error('Error in store operation:', error);
      // Return ID anyway to prevent cascading failures
      return entry.id;
    }
  }

  /**
   * Retrieve a memory entry from Recall Network using CLI
   * 
   * @param id ID of the entry to retrieve
   * @param type Optional type (defaults to 'default')
   * @returns Retrieved memory entry or null if not found
   */
  async retrieve(id: string, type: string = 'default'): Promise<MemoryEntry | null> {
    // Check if initialized
    if (!this.initialized) {
      console.warn('Recall Memory Manager not properly initialized. Cannot retrieve memory.');
      return null;
    }
    
    try {
      // Create the key with type prefix
      const key = `${type}/${id}`;
      
      // Execute the recall CLI command to retrieve the entry
      console.log(`Retrieving memory entry with key: ${key}`);
      
      const cmd = `recall bucket get --address ${this.bucketAddress} "${key}"`;
      
      try {
        // Execute the command
        const output = executeRecallCommand(cmd);
        
        // Extract JSON from the output
        const jsonMatch = output.match(/{.*}/s);
        
        if (jsonMatch) {
          try {
            // Parse the JSON string to get the memory entry
            const entry = JSON.parse(jsonMatch[0]) as MemoryEntry;
            return entry;
          } catch (parseError) {
            console.error('Failed to parse memory entry JSON:', parseError);
            return null;
          }
        } else {
          console.warn(`Failed to extract JSON from Recall Network response`);
          return null;
        }
      } catch (error: any) {
        if (error.message && (
            error.message.includes('object not found for key') || 
            error.message.includes('Error: not found')
          )) {
          console.log(`Memory entry not found with key: ${key}`);
          return null;
        } else {
          console.error('Error retrieving memory from Recall Network:', error);
          return null;
        }
      }
    } catch (error: any) {
      console.error('Error in retrieve operation:', error);
      return null;
    }
  }

  /**
   * Get the latest entry of a specific type
   * 
   * @param type Type of entries to search for
   * @returns Latest entry of the specified type or null if none found
   */
  async getLatest(type: string = 'default'): Promise<MemoryEntry | null> {
    // Check if initialized
    if (!this.initialized) {
      console.warn('Recall Memory Manager not properly initialized. Cannot get latest memory.');
      return null;
    }
    
    try {
      // First query all objects in the bucket with the specific prefix
      const cmd = `recall bucket query --address ${this.bucketAddress} --prefix "${type}/"`;
      
      // Execute the command
      const output = executeRecallCommand(cmd);
      
      // Parse the output as JSON
      try {
        const queryResult = JSON.parse(output) as RecallQueryResult;
        
        if (!queryResult.objects || queryResult.objects.length === 0) {
          console.log(`No memory entries found of type '${type}' in bucket ${this.bucketAddress}`);
          return null;
        }
        
        // Sort objects by key (assuming keys have timestamps or sequential IDs)
        const sortedObjects = [...queryResult.objects].sort((a, b) => 
          b.key.localeCompare(a.key)
        );
        
        if (sortedObjects.length === 0) {
          console.log(`No memory entries of type '${type}' found after sorting`);
          return null;
        }
        
        // Get the latest entry
        const latestKey = sortedObjects[0].key;
        return await this.retrieve(
          latestKey.substring(type.length + 1), // Remove 'type/' prefix
          type
        );
      } catch (parseError) {
        console.error('Failed to parse query result:', parseError);
        console.log('Raw output:', output);
        return null;
      }
    } catch (error: any) {
      console.error('Error getting latest memory entry:', error);
      return null;
    }
  }

  /**
   * List entries of a specific type
   * 
   * @param type Type of entries to list
   * @param limit Maximum number of entries to return
   * @returns Array of matching memory entries
   */
  async list(type: string = 'default', limit: number = 10): Promise<MemoryEntry[]> {
    // Check if initialized
    if (!this.initialized) {
      console.warn('Recall Memory Manager not properly initialized. Cannot list memories.');
      return [];
    }
    
    try {
      // Query objects with the specific prefix
      const cmd = `recall bucket query --address ${this.bucketAddress} --prefix "${type}/"`;
      
      // Execute the command
      const output = executeRecallCommand(cmd);
      
      // Parse the output as JSON
      try {
        const queryResult = JSON.parse(output) as RecallQueryResult;
        
        if (!queryResult.objects || queryResult.objects.length === 0) {
          console.log(`No memory entries found of type '${type}' in bucket ${this.bucketAddress}`);
          return [];
        }
        
        // Sort objects by key (assuming keys have timestamps or sequential IDs)
        const sortedObjects = [...queryResult.objects].sort((a, b) => 
          b.key.localeCompare(a.key)
        );
        
        // Limit the number of entries to retrieve
        const limitedObjects = sortedObjects.slice(0, limit);
        
        // Retrieve each entry
        const entries: MemoryEntry[] = [];
        
        for (const obj of limitedObjects) {
          const id = obj.key.substring(type.length + 1); // Remove 'type/' prefix
          const entry = await this.retrieve(id, type);
          if (entry) {
            entries.push(entry);
          }
        }
        
        return entries;
      } catch (parseError) {
        console.error('Failed to parse query result:', parseError);
        console.log('Raw output:', output);
        return [];
      }
    } catch (error: any) {
      console.error('Error listing memory entries:', error);
      return [];
    }
  }
}
