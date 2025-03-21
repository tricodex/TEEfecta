// Recall Network connection verification script
import { RecallMemoryManager, MemoryEntry } from './recall-memory.js';

const RECALL_PRIVATE_KEY = process.env.RECALL_PRIVATE_KEY;
const RECALL_BUCKET_ALIAS = process.env.RECALL_BUCKET_ALIAS || 'auto-trader-memory';
const RECALL_BUCKET_ADDRESS = process.env.RECALL_BUCKET_ADDRESS || '0xff000000000000000000000000000000000000e2';

// Sleep function to add delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('Recall Network Connection Verification');
  console.log('--------------------------------------');
  console.log(`Using bucket alias: ${RECALL_BUCKET_ALIAS}`);
  console.log(`Using bucket address: ${RECALL_BUCKET_ADDRESS}`);

  // Verify private key
  if (!RECALL_PRIVATE_KEY) {
    console.error('Error: RECALL_PRIVATE_KEY environment variable is not set.');
    console.error('Please source the environment file before running this script.');
    process.exit(1);
  }

  try {
    // Initialize RecallMemoryManager
    console.log('\nInitializing RecallMemoryManager...');
    const memoryManager = new RecallMemoryManager(
      RECALL_PRIVATE_KEY,
      RECALL_BUCKET_ALIAS,
      process.env.RECALL_NETWORK || 'testnet'
    );

    // Create a test memory entry
    const testEntry: MemoryEntry = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      content: {
        test: 'Testing Recall Network connection',
        timestamp: Date.now()
      },
      metadata: {
        type: 'test',
        tags: ['verification', 'test']
      }
    };

    // Store the test entry
    console.log('\nStoring test memory entry...');
    console.log(`Entry ID: ${testEntry.id}`);
    const storedId = await memoryManager.store(testEntry);
    console.log(`Successfully stored memory entry with ID: ${storedId}`);

    // Add a delay to allow for transaction processing
    console.log('\nWaiting for 5 seconds to allow for transaction confirmation...');
    await sleep(5000);

    // Retrieve the test entry
    console.log('\nRetrieving test memory entry...');
    const retrievedEntry = await memoryManager.retrieve(storedId, 'test');
    
    if (retrievedEntry) {
      console.log('Successfully retrieved memory entry:');
      console.log(JSON.stringify(retrievedEntry, null, 2));
    } else {
      console.warn('Warning: Failed to retrieve the test memory entry.');
      console.warn('This can happen if the transaction is still being processed on the Recall Network.');
      console.warn('Try running this script again in a few minutes to verify retrieval.');
    }

    // List recent entries
    console.log('\nListing recent test entries...');
    const recentEntries = await memoryManager.list('test', 5);
    console.log(`Found ${recentEntries.length} recent test entries:`);
    
    recentEntries.forEach((entry: MemoryEntry, index: number) => {
      if (entry && entry.id) {
        console.log(`\n[${index + 1}] ID: ${entry.id}, Timestamp: ${entry.timestamp}`);
      } else {
        console.log(`\n[${index + 1}] Invalid entry (missing ID or timestamp)`);
      }
    });

    console.log('\nRecall Network verification completed successfully!');
  } catch (error) {
    console.error('\nError during Recall Network verification:');
    console.error(error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Uncaught error in main function:');
  console.error(error);
  process.exit(1);
}); 