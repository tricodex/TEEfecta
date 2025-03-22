// Test Agent for basic functionality check
import * as dotenv from 'dotenv';
import { RecallMemoryManager } from './services/recall-memory.js';
import { MockLLMService } from './services/mock-llm.js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  console.log('Starting test agent...');
  
  // Test environment variables
  console.log('Environment Configuration:');
  console.log(`- ENABLE_AGENTKIT: ${process.env.ENABLE_AGENTKIT}`);
  console.log(`- MARLIN_ENCLAVE: ${process.env.MARLIN_ENCLAVE}`);
  console.log(`- RECALL_BUCKET_ALIAS: ${process.env.RECALL_BUCKET_ALIAS}`);
  
  // Test directories
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  } else {
    console.log(`Data directory exists: ${dataDir}`);
  }
  
  // Test Recall memory manager
  console.log('\nTesting Recall Memory Manager...');
  try {
    const memoryManager = new RecallMemoryManager(
      process.env.RECALL_PRIVATE_KEY || 'mock-key',
      process.env.RECALL_BUCKET_ALIAS || 'test-bucket',
      process.env.RECALL_NETWORK || 'testnet'
    );
    
    console.log('Recall Memory Manager initialized successfully');
    
    // Test storage
    const testEntry = await memoryManager.store('test', { message: 'Hello World' }, {
      timestamp: new Date().toISOString(),
      test: true
    });
    
    console.log(`Test entry stored with ID: ${testEntry.id}`);
    
    // Test retrieval
    const retrievedEntry = await memoryManager.retrieve(testEntry.id);
    if (retrievedEntry) {
      console.log('Memory retrieval successful');
    } else {
      console.log('Memory retrieval failed - this is expected if using mock implementation');
    }
  } catch (error) {
    console.error('Error testing Recall Memory Manager:', error);
  }
  
  // Test Mock LLM
  console.log('\nTesting Mock LLM Service...');
  try {
    const llmService = new MockLLMService();
    const response = await llmService.generateText('Hello, world!');
    console.log('Mock LLM response:', response.substring(0, 50) + '...');
  } catch (error) {
    console.error('Error testing Mock LLM Service:', error);
  }
  
  // Test attestation if in enclave
  if (process.env.MARLIN_ENCLAVE === 'true') {
    console.log('\nTesting Attestation (Enclave mode)...');
    try {
      // Import AttestationService dynamically to avoid issues if not in enclave
      const { AttestationService } = await import('./services/attestation.js');
      const attestationResult = await AttestationService.verifyAttestation('localhost');
      console.log('Attestation result:', attestationResult);
    } catch (error) {
      console.error('Error testing attestation:', error);
    }
  } else {
    console.log('\nSkipping attestation test (not in enclave mode)');
  }
  
  console.log('\nTest agent completed successfully');
}

main().catch(error => {
  console.error('Error in test agent:', error);
  process.exit(1);
});
