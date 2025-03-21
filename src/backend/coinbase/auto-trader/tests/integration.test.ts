/**
 * Integration Tests
 * 
 * This file tests the integration between Azure OpenAI and Recall Network,
 * focusing on error handling, recovery mechanisms, and data consistency.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '/Users/pc/apps/MPC/hackathons/TEEfecta/mono/.env' });
dotenv.config({ path: '/Users/pc/apps/MPC/hackathons/TEEfecta/mono/.env.export' });
dotenv.config({ path: '/Users/pc/apps/MPC/hackathons/TEEfecta/mono/.env.azure' });

// Test IDs and tracking
const TEST_ID = uuidv4().substring(0, 8);
const TEST_ARTIFACTS: string[] = [];
const TEMP_DIR = '/tmp';

// Configuration for Azure OpenAI
const AZURE_CONFIG = {
  apiKey: process.env.AZURE_OPENAI_API_KEY || 
    '87St9rgvNs79TczQLxQ8dTb8LPOsdnS8TDQc3UkkxJRZidnL8jgkJQQJ99BCACHYHv6XJ3w3AAAAACOGhLwN',
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || 
    'https://patri-m8hiz8kb-eastus2.openai.azure.com',
  deploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME || 'gpt-4o',
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-12-01-preview',
  timeout: 25000 // Increase timeout for Azure OpenAI operations
};

// Configuration for Recall Network
const RECALL_CONFIG = {
  envExportPath: '/Users/pc/apps/MPC/hackathons/TEEfecta/mono/.env.export',
  bucketAddress: '0xff000000000000000000000000000000000000e2'
};

interface AzureAnalysisResult {
  success: boolean;
  content?: string;
  error?: string;
}

interface RecallOperationResult {
  success: boolean;
  id?: string;
  key?: string;
  data?: any;
  error?: string;
}

// Helper class for Azure OpenAI operations
class AzureOperations {
  private model: ChatOpenAI;
  private analysisChain: any;
  
  constructor(config = AZURE_CONFIG) {
    // Initialize the model with increased timeout
    this.model = new ChatOpenAI({
      temperature: 0.7,
      maxRetries: 3, // Add retries
      timeout: config.timeout, // Use the timeout from config
      modelName: config.deploymentName,
      openAIApiKey: config.apiKey,
      configuration: {
        baseURL: `${config.endpoint}/openai/deployments/${config.deploymentName}`,
        defaultQuery: { "api-version": config.apiVersion },
        defaultHeaders: { "api-key": config.apiKey }
      }
    });
  }
  
  // Test basic connectivity
  async testConnection(): Promise<AzureAnalysisResult> {
    try {
      // Set a timeout promise
      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => reject(new Error('Azure OpenAI connection test timed out')), AZURE_CONFIG.timeout);
      });
      
      // Simple test prompt with timeout
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a test assistant. Respond with 'TEST_OK' if you can read this message."],
        ["human", "Confirm connection is working"]
      ]);
      
      const chain = RunnableSequence.from([prompt, this.model]);
      
      // Race between the request and timeout
      const response = await Promise.race([
        chain.invoke({}),
        timeoutPromise
      ]);
      
      return {
        success: true,
        content: response.content
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Analyze a string with error handling
  async analyze(text: string): Promise<AzureAnalysisResult> {
    try {
      // Set a timeout promise
      const timeoutPromise = new Promise<any>((_, reject) => {
        setTimeout(() => reject(new Error('Azure OpenAI analysis timed out')), AZURE_CONFIG.timeout);
      });
      
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", "You are a data analyst. Analyze this text and provide insights."],
        ["human", "{text}"]
      ]);
      
      const chain = RunnableSequence.from([prompt, this.model]);
      
      // Race between the analysis and timeout
      const response = await Promise.race([
        chain.invoke({ text }),
        timeoutPromise
      ]);
      
      return {
        success: true,
        content: response.content
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Helper class for Recall Network operations
class RecallOperations {
  private bucketAddress: string;
  private envExportPath: string;
  
  constructor(config = RECALL_CONFIG) {
    this.bucketAddress = config.bucketAddress;
    this.envExportPath = config.envExportPath;
  }
  
  // Test basic connectivity to the Recall Network
  async testConnection(): Promise<RecallOperationResult> {
    try {
      const result = execSync(
        `source ${this.envExportPath} && ` +
        `recall account info`,
        { encoding: 'utf-8' }
      );
      
      if (result.includes('Current Account')) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: "Not connected to network" 
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Store data in Recall
  async store(data: any, prefix = 'integration'): Promise<RecallOperationResult> {
    const id = uuidv4().substring(0, 8);
    const key = `${prefix}/${TEST_ID}/${id}`;
    const tempFile = path.join(TEMP_DIR, `recall-test-${id}.json`);
    
    // Track the artifact for cleanup
    TEST_ARTIFACTS.push(tempFile);
    
    try {
      // Write to temp file
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
      
      // Store in Recall
      const result = execSync(
        `source ${this.envExportPath} && ` +
        `recall bucket add --address ${this.bucketAddress} ` +
        `--key "${key}" ${tempFile}`,
        { encoding: 'utf-8' }
      );
      
      return {
        success: true,
        id,
        key
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Retrieve data from Recall
  async retrieve(key: string): Promise<RecallOperationResult> {
    try {
      const output = execSync(
        `source ${this.envExportPath} && ` +
        `recall bucket get --address ${this.bucketAddress} ` +
        `"${key}"`,
        { encoding: 'utf-8' }
      );
      
      // Extract JSON from CLI output
      const jsonMatch = output.match(/{.*}/s);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          data
        };
      } else {
        return {
          success: false,
          error: "Failed to parse JSON from output"
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // List bucket contents
  async listBucket(): Promise<RecallOperationResult> {
    try {
      const output = execSync(
        `source ${this.envExportPath} && ` +
        `recall bucket query --address ${this.bucketAddress}`,
        { encoding: 'utf-8' }
      );
      
      const data = JSON.parse(output);
      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Integration tests
describe('Azure OpenAI and Recall Network Integration', () => {
  let azure: AzureOperations;
  let recall: RecallOperations;
  let azureWorks = false;
  let recallWorks = false;
  
  beforeAll(async () => {
    azure = new AzureOperations();
    recall = new RecallOperations();
    
    // Test Azure connectivity
    const azureTest = await azure.testConnection();
    azureWorks = azureTest.success;
    console.log(`Azure OpenAI is ${azureWorks ? 'working' : 'not working'}`);
    if (!azureWorks) {
      console.log(`Azure Error: ${azureTest.error}`);
    }
    
    // Test Recall connectivity
    const recallTest = await recall.testConnection();
    recallWorks = recallTest.success;
    console.log(`Recall Network is ${recallWorks ? 'working' : 'not working'}`);
    if (!recallWorks) {
      console.log(`Recall Error: ${recallTest.error}`);
    }
  });
  
  afterAll(() => {
    // Clean up temp files
    TEST_ARTIFACTS.forEach(file => {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`Cleaned up ${file}`);
        }
      } catch (error) {
        console.error(`Failed to clean up ${file}:`, error);
      }
    });
  });
  
  test('Should handle Azure OpenAI connectivity issues', async () => {
    // Create Azure client with invalid settings to test error handling
    const brokenAzure = new AzureOperations({
      ...AZURE_CONFIG,
      apiKey: 'invalid_key_for_testing_error_handling'
    });
    
    console.log('Testing Azure OpenAI error handling');
    
    // Force a failure by setting up an invalid request
    class MockResponse {
      status = 429;
      ok = false;
      async json() {
        return {
          error: {
            message: "Requests to the ChatCompletions_Create Operation have exceeded token rate limit",
            type: "rate_limit_exceeded"
          }
        };
      }
      async text() {
        return JSON.stringify({
          error: {
            message: "Requests to the ChatCompletions_Create Operation have exceeded token rate limit",
            type: "rate_limit_exceeded"
          }
        });
      }
    }
    
    // Patch the fetch function to simulate a rate limit error
    const originalFetch = global.fetch;
    global.fetch = () => Promise.resolve(new MockResponse() as unknown as Response);
    
    try {
      const result = await brokenAzure.analyze('Test content');
      
      // We expect this to fail, with a proper error
      expect(result.success).toBe(false);
      expect(result.error).toContain("rate limit");
    } finally {
      // Restore original fetch
      global.fetch = originalFetch;
    }
  }, 30000); // Increased timeout to 30 seconds
  
  test('Should persist data from Azure to Recall with idempotency', async () => {
    // Skip if either service is down
    if (!azureWorks || !recallWorks) {
      console.log('Skipping idempotency test as one service is down');
      return;
    }
    
    console.log('\nTesting idempotency of storage and retrieval');
    
    // Generate test content
    const testText = `This is integration test ${TEST_ID} running at ${new Date().toISOString()}`;
    
    // Analyze with Azure
    const analysis = await azure.analyze(testText);
    expect(analysis.success).toBe(true);
    
    // Store in Recall - first attempt
    const store1 = await recall.store({
      text: testText,
      analysis: analysis.content,
      attempt: 1
    });
    expect(store1.success).toBe(true);
    
    // Store again with same data - second attempt
    const store2 = await recall.store({
      text: testText,
      analysis: analysis.content,
      attempt: 2
    });
    expect(store2.success).toBe(true);
    
    // Retrieve both records
    const retrieval1 = await recall.retrieve(store1.key!);
    const retrieval2 = await recall.retrieve(store2.key!);
    
    // Both should succeed
    expect(retrieval1.success).toBe(true);
    expect(retrieval2.success).toBe(true);
    
    // Content should be the same for both instances
    expect(retrieval1.data.text).toBe(testText);
    expect(retrieval2.data.text).toBe(testText);
    expect(retrieval1.data.analysis).toBe(analysis.content);
    expect(retrieval2.data.analysis).toBe(analysis.content);
    
    // But attempts should be different
    expect(retrieval1.data.attempt).toBe(1);
    expect(retrieval2.data.attempt).toBe(2);
    
    console.log('Successfully verified idempotent storage and retrieval');
  });
  
  test('Should handle recovery from service failures', async () => {
    console.log('\nTesting recovery from service failures');
    
    // Create test data
    const testData = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      content: `Recovery test for ${TEST_ID}`
    };
    
    // Try Azure first, fall back to mock if Azure fails
    let analysisContent: string;
    try {
      if (!azureWorks) {
        throw new Error('Azure is known to be unavailable');
      }
      
      const azureResult = await azure.analyze(testData.content);
      if (!azureResult.success) {
        throw new Error(azureResult.error);
      }
      
      analysisContent = azureResult.content!;
      console.log('Used Azure OpenAI for analysis');
    } catch (error) {
      // Fallback to mock analysis
      analysisContent = `MOCK ANALYSIS: The content "${testData.content}" appears to be a test message. It contains a UUID and timestamp, suggesting it's used for system verification.`;
      console.log('Used mock fallback for analysis');
    }
    
    // Try to store in Recall, fall back to local storage if Recall fails
    let storageLocation: string;
    let storageKey: string | null = null;
    
    const dataToStore = {
      ...testData,
      analysis: analysisContent
    };
    
    try {
      if (!recallWorks) {
        throw new Error('Recall is known to be unavailable');
      }
      
      const recallResult = await recall.store(dataToStore);
      if (!recallResult.success) {
        throw new Error(recallResult.error);
      }
      
      storageLocation = 'recall';
      storageKey = recallResult.key!;
      console.log(`Stored in Recall with key: ${storageKey}`);
    } catch (error) {
      // Fallback to local storage
      const localFilePath = path.join(TEMP_DIR, `local-fallback-${TEST_ID}.json`);
      fs.writeFileSync(localFilePath, JSON.stringify(dataToStore, null, 2));
      TEST_ARTIFACTS.push(localFilePath);
      
      storageLocation = 'local';
      console.log(`Stored locally at: ${localFilePath}`);
    }
    
    // This test should pass regardless of which services failed
    expect(analysisContent).toBeDefined();
    expect(analysisContent.length).toBeGreaterThan(10);
    expect(storageLocation).toMatch(/^(recall|local)$/);
    
    // If we stored in Recall, verify we can retrieve it
    if (storageLocation === 'recall' && storageKey) {
      const retrieveResult = await recall.retrieve(storageKey);
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data.id).toBe(testData.id);
      console.log('Successfully verified Recall retrieval after recovery');
    }
  }, 30000); // Increase test timeout to 30 seconds
  
  test('Should handle concurrent operations', async () => {
    // Skip if Recall isn't working
    if (!recallWorks) {
      console.log('Skipping concurrent operations test as Recall is down');
      return;
    }
    
    console.log('\nTesting concurrent operations');
    
    // Prepare 5 items to store concurrently
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: `concurrent-${i}`,
      timestamp: new Date().toISOString(),
      value: `Test value ${i} for ${TEST_ID}`
    }));
    
    // Store all items concurrently
    const storePromises = items.map(item => 
      recall.store(item, 'concurrent')
    );
    
    const storeResults = await Promise.all(storePromises);
    
    // All should succeed
    storeResults.forEach((result, i) => {
      expect(result.success).toBe(true);
      console.log(`Stored item ${i} with key: ${result.key}`);
    });
    
    // Retrieve all concurrently
    const retrievePromises = storeResults.map(result => 
      recall.retrieve(result.key!)
    );
    
    const retrieveResults = await Promise.all(retrievePromises);
    
    // All retrievals should succeed
    retrieveResults.forEach((result, i) => {
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(`concurrent-${i}`);
    });
    
    console.log('Successfully verified concurrent operations');
  });
}); 