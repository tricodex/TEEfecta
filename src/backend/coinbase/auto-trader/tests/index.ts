/**
 * Test Runner for 4G3N7
 * 
 * This file serves as the entry point for all tests in the application.
 * Run individual test files or the entire test suite with bun test.
 */

import { beforeAll } from 'bun:test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from various .env files in order of precedence
beforeAll(() => {
  // Project-wide environment files
  const envFiles = [
    '/Users/pc/apps/MPC/hackathons/TEEfecta/mono/.env',
    '/Users/pc/apps/MPC/hackathons/TEEfecta/mono/.env.export',
    '/Users/pc/apps/MPC/hackathons/TEEfecta/mono/.env.azure'
  ];
  
  // Local test environment (if exists)
  const localTestEnv = path.join(__dirname, '../.env.test');
  if (fs.existsSync(localTestEnv)) {
    envFiles.push(localTestEnv);
  }
  
  // Load all environment files
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
      console.log(`Loaded environment from: ${envFile}`);
    } else {
      console.warn(`Warning: Environment file not found: ${envFile}`);
    }
  }
  
  console.log('\n=== Test Environment ===');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('Azure API Version:', process.env.AZURE_OPENAI_API_VERSION || 'using default');
  console.log('Bucket Address:', process.env.BUCKET_ADDRESS || '0xff00...');
  console.log('======================\n');
});

// Export individual test files for selective running
export * from './azure.test';
export * from './recall.test';
export * from './integration.test';
export * from './e2e.test';

// Console message when this file is run directly
if (import.meta.main) {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║              4G3N7 TEST RUNNER                ║
║                                               ║
║  Usage:                                       ║
║    bun test               Run all tests       ║
║    bun test azure.test.ts Run a specific test ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `);
} 