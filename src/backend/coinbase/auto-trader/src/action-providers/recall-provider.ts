// Recall Network action provider
import { z } from 'zod';
import { customActionProvider } from '@coinbase/agentkit';
// Import Recall libraries using dynamic imports to handle ESM/CommonJS compatibility
// This approach avoids the 'ERR_REQUIRE_ESM' error
import { Address } from 'viem';

// Type definitions to avoid TypeScript errors
type ChainName = 'testnet' | 'mainnet';
type Chain = any; // Simplify for now
type RecallClientType = any;
type WalletClientType = any;

// Define TypeScript interfaces for Recall responses
interface RecallBucket {
  addr: Address;
  metadata?: {
    alias?: string;
    [key: string]: any;
  };
}

interface RecallListBucketsResult {
  result?: RecallBucket[];
}

interface RecallCreateBucketResult {
  result?: {
    bucket: Address;
    [key: string]: any;
  };
}

interface RecallAddResult {
  meta?: {
    tx?: {
      transactionHash: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

interface RecallGetResult {
  result?: Uint8Array;
  [key: string]: any;
}

// Schema for the store reasoning action
interface StoreReasoningArgs {
  decisionId: string;
  reasoning: string;
  metadata?: Record<string, any>;
}

// Schema for the get reasoning action
interface GetReasoningArgs {
  decisionId: string;
}

// Timeout wrapper for async operations
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// Create Recall action provider
export function recallActionProvider(privateKey: string) {
  console.log('Initializing Recall Network action provider');
  
  // We'll initialize these later to avoid the ESM/CommonJS compatibility issue
  let chain: Chain;
  let recallClient: RecallClientType;
  let initialized = false;
  
  // Function to dynamically import and initialize Recall SDK
  async function initializeRecall() {
    if (initialized) return;
    
    try {
      // Dynamically import Recall chains and client
      const chainsModule = await import('@recallnet/chains');
      const sdkModule = await import('@recallnet/sdk/client');
      
      // Get environment variables
      const bucketAlias = process.env.RECALL_BUCKET_ALIAS || '4g3n7-reasoning';
      const network = process.env.RECALL_NETWORK as ChainName || 'testnet';
      
      // Initialize wallet client and Recall client
      chain = chainsModule.getChain(network) || chainsModule.testnet;
      const wallet = sdkModule.walletClientFromPrivateKey(privateKey as `0x${string}`, chain);
      recallClient = new sdkModule.RecallClient({ walletClient: wallet });
      
      initialized = true;
      console.log('Recall Network SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Recall SDK:', error);
      throw error;
    }
  }
    
  // Function to get or create a bucket with error handling and timeout
  async function getOrCreateBucket(bucketAlias: string): Promise<Address> {
    try {
      // Make sure Recall is initialized first
      await initializeRecall();
      
      console.log(`Looking for bucket with alias: ${bucketAlias}`);
      
      // Try to find existing bucket with timeout
      const bucketsPromise = recallClient.bucketManager().list();
      const buckets = await withTimeout(bucketsPromise, 15000, 'List buckets') as RecallListBucketsResult;
      
      if (buckets?.result) {
        const bucket = buckets.result.find((b: RecallBucket) => 
          b.metadata?.alias === bucketAlias
        );
        
        if (bucket) {
          console.log(`Found existing bucket "${bucketAlias}" at ${bucket.addr}`);
          return bucket.addr;
        }
      }
      
      // Create new bucket with timeout
      console.log(`Creating new bucket with alias "${bucketAlias}"`);
      const createPromise = recallClient.bucketManager().create({
        metadata: { alias: bucketAlias }
      });
      
      const createResult = await withTimeout(createPromise, 30000, 'Create bucket') as RecallCreateBucketResult;
      
      if (!createResult?.result?.bucket) {
        throw new Error(`Failed to create bucket with alias: ${bucketAlias}`);
      }
      
      console.log(`Created new bucket at ${createResult.result.bucket}`);
      return createResult.result.bucket;
    } catch (error) {
      console.error(`Error in getOrCreateBucket: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
    
  // Define custom actions for recall storage
  return customActionProvider([
    {
      name: 'store_reasoning',
      description: 'Store reasoning chains transparently on Recall Network',
      schema: z.object({
        decisionId: z.string(),
        reasoning: z.string(),
        metadata: z.record(z.any()).optional()
      }),
      invoke: async (args: StoreReasoningArgs) => {
        try {
          // Initialize Recall first if needed
          await initializeRecall();
          
          // Get or create reasoning bucket
          const bucketAddr = await getOrCreateBucket('4g3n7-reasoning');
          
          // Create the key
          const key = `reasoning/${args.decisionId}`;
          
          // Store reasoning data
          const data = JSON.stringify({
            reasoning: args.reasoning,
            metadata: args.metadata || {},
            timestamp: new Date().toISOString()
          });
          
          // Add to bucket with timeout
          const addPromise = recallClient.bucketManager().add(
            bucketAddr,
            key,
            data
          );
          
          const result = await withTimeout(addPromise, 30000, 'Add object to bucket') as RecallAddResult;
          
          if (!result?.meta?.tx) {
            return `Warning: Reasoning storage may not have been confirmed. Please verify later with ID: ${args.decisionId}`;
          }
          
          return `Reasoning stored successfully with ID: ${args.decisionId}. TX: ${result.meta.tx.transactionHash}`;
        } catch (error) {
          console.error('Error storing reasoning:', error);
          return `Error storing reasoning: ${(error instanceof Error) ? error.message : String(error)}`;
        }
      }
    },
    {
      name: 'get_reasoning',
      description: 'Retrieve reasoning chains from Recall Network',
      schema: z.object({
        decisionId: z.string()
      }),
      invoke: async (args: GetReasoningArgs) => {
        try {
          // Initialize Recall first if needed
          await initializeRecall();
          
          // Get reasoning bucket
          const bucketAddr = await getOrCreateBucket('4g3n7-reasoning');
          
          // Create the key
          const key = `reasoning/${args.decisionId}`;
          
          // Get from bucket with timeout
          const getPromise = recallClient.bucketManager().get(
            bucketAddr,
            key
          );
          
          const result = await withTimeout(getPromise, 15000, 'Get object from bucket') as RecallGetResult;
          
          if (!result?.result) {
            return `No reasoning found for ID: ${args.decisionId}`;
          }
          
          // Decode and parse
          const data = new TextDecoder().decode(result.result);
          return `Retrieved reasoning: ${data}`;
        } catch (error) {
          console.error('Error retrieving reasoning:', error);
          return `Error retrieving reasoning: ${(error instanceof Error) ? error.message : String(error)}`;
        }
      }
    }
  ]);
}