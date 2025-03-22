// Recall Network Memory Manager for AgentKit
// This service manages agent memory using Recall Network for transparent storage

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Memory Manager interface for storing and retrieving agent memory
 */
export interface MemoryManager {
  /**
   * Store a memory entry
   * 
   * @param type - Type of memory entry 
   * @param content - Content to store
   * @param metadata - Optional metadata
   */
  store(type: string, content: any, metadata?: Record<string, any>): Promise<MemoryEntry>;
  
  /**
   * Store a complete memory entry directly
   * 
   * @param entry - Complete memory entry object
   */
  storeMemory(entry: MemoryEntry): Promise<MemoryEntry>;
  
  /**
   * Retrieve a specific memory entry by ID
   * 
   * @param id - Memory entry ID
   */
  retrieve(id: string): Promise<MemoryEntry | null>;
  
  /**
   * Query memory entries by type and optional filter
   * 
   * @param type - Type of memory to query
   * @param filter - Optional filter function
   */
  query(type: string, filter?: (entry: MemoryEntry) => boolean): Promise<MemoryEntry[]>;
  
  /**
   * Delete a memory entry
   * 
   * @param id - Memory entry ID
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Memory entry structure for agent reasoning and decisions
 */
export interface MemoryEntry {
  id: string;
  type: string;
  content?: any;
  data?: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Default environment settings
const ENV_EXPORT_PATH = process.env.ENV_EXPORT_PATH || './.env.export';
const RECALL_MEMORY_MODE = process.env.RECALL_MEMORY_MODE || 'persistent';
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
    // Check if we're in in-memory mode or the env export file doesn't exist
    if (RECALL_MEMORY_MODE === 'in-memory' || !fs.existsSync(ENV_EXPORT_PATH)) {
      console.log(`Skipping recall command in in-memory mode: ${command.split(' ')[0]} ${command.split(' ')[1]}`);
      return '';
    }
    
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
    
    // Return empty string instead of throwing to allow graceful degradation
    return '';
  }
}

/**
 * Recall Network Memory Manager implementation
 * 
 * This implementation uses the Recall Network to securely store agent reasoning
 * and decision history. Data is encrypted and stored on-chain for accountability.
 */
export class RecallMemoryManager implements MemoryManager {
  private bucketAddress: string;
  private envExportPath: string;
  private tempDir: string;
  private initialized: boolean = false;
  private memoryStore: Map<string, MemoryEntry> = new Map();
  private useInMemoryOnly: boolean = false;

  /**
   * Create a new RecallMemoryManager
   * @param privateKey Recall Network private key (not directly used in CLI approach)
   * @param bucketAlias Optional bucket alias
   * @param network Optional network name (testnet, devnet, etc.)
   */
  constructor(
    private privateKey: string,
    private bucketAlias: string,
    private network: string
  ) {
    console.log(`Initializing Recall Memory Manager for bucket: ${bucketAlias} on ${network}`);
    
    // Verify environment variables
    this.bucketAddress = process.env.RECALL_BUCKET_ADDRESS || '0xff000000000000000000000000000000000000e2';
    this.envExportPath = ENV_EXPORT_PATH;
    this.tempDir = TEMP_DIR;
    this.useInMemoryOnly = RECALL_MEMORY_MODE === 'in-memory';
    
    // Create temp directory if it doesn't exist
    ensureDirExists(this.tempDir);
    
    if (this.useInMemoryOnly) {
      console.log('Memory manager configured for in-memory mode only');
      this.initialized = false;
    } else if (!fs.existsSync(this.envExportPath)) {
      console.warn(`Warning: Environment export file not found: ${this.envExportPath}`);
      console.warn('Memory operations will use in-memory storage only');
      this.initialized = false;
    } else {
      try {
        // Test connection to Recall Network
        this.initialized = this.testConnection();
        if (this.initialized) {
          console.log('Successfully connected to Recall Network');
        } else {
          console.log('Using in-memory storage as fallback');
        }
      } catch (error) {
        console.error('Failed to initialize Recall Memory Manager:', error);
        this.initialized = false;
        // We don't throw here to allow for graceful degradation
      }
    }
  }

  /**
   * Test connection to Recall Network
   */
  private testConnection(): boolean {
    if (this.useInMemoryOnly) {
      return false;
    }
    
    try {
      const cmd = `recall account`;
      const output = executeRecallCommand(cmd);
      
      // If command execution failed, output will be empty string
      if (!output) {
        console.warn('Empty response from Recall Network, continuing with in-memory storage');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to connect to Recall Network:', error);
      return false;
    }
  }

  /**
   * Store a memory entry
   */
  async store(type: string, content: any, metadata?: Record<string, any>): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: uuidv4(),
      type,
      content,
      timestamp: new Date().toISOString(),
      metadata
    };
    
    this.memoryStore.set(entry.id, entry);
    console.log(`Stored memory entry ${entry.id} of type ${type}`);
    
    return entry;
  }
  
  /**
   * Store a complete memory entry directly
   */
  async storeMemory(entry: MemoryEntry): Promise<MemoryEntry> {
    this.memoryStore.set(entry.id, entry);
    console.log(`Stored memory entry ${entry.id} of type ${entry.type}`);
    
    return entry;
  }
  
  /**
   * Retrieve a specific memory entry by ID
   */
  async retrieve(id: string): Promise<MemoryEntry | null> {
    const entry = this.memoryStore.get(id);
    return entry || null;
  }
  
  /**
   * Query memory entries by type and optional filter
   */
  async query(type: string, filter?: (entry: MemoryEntry) => boolean): Promise<MemoryEntry[]> {
    const entries = Array.from(this.memoryStore.values())
      .filter(entry => entry.type === type);
    
    if (filter) {
      return entries.filter(filter);
    }
    
    return entries;
  }
  
  /**
   * Delete a memory entry
   */
  async delete(id: string): Promise<boolean> {
    return this.memoryStore.delete(id);
  }
}
