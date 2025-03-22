// Test environment validation
import * as dotenv from 'dotenv';
import { validateEnvironment, initializeDefaultEnvironment } from './utils/env-validator.js';

// Load environment variables
dotenv.config();

// Initialize defaults
initializeDefaultEnvironment();

// Run validation
const result = validateEnvironment();

// Output validation results
console.log('Environment Validation Results:');
console.log('------------------------------');
console.log(`Valid: ${result.valid}`);

if (result.missingGroups.length > 0) {
  console.log('\nMissing Groups:');
  result.missingGroups.forEach(group => {
    console.log(`- ${group}`);
  });
}

if (result.warnings.length > 0) {
  console.log('\nWarnings:');
  result.warnings.forEach(warning => {
    console.log(`- ${warning}`);
  });
}

// Output critical environment variables (masked)
console.log('\nCritical Environment Variables:');
console.log('------------------------------');

const maskValue = (value: string | undefined): string => {
  if (!value) return 'unset';
  if (value.startsWith('your_')) return 'unset (placeholder)';
  return value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : '****';
};

// Display key environment variables
console.log(`USE_MOCK_SEARCH: ${process.env.USE_MOCK_SEARCH || 'unset'}`);
console.log(`PREFERRED_LLM_PROVIDER: ${process.env.PREFERRED_LLM_PROVIDER || 'unset'}`);
console.log(`RECALL_NETWORK: ${process.env.RECALL_NETWORK || 'unset'}`);
console.log(`RECALL_BUCKET_ALIAS: ${process.env.RECALL_BUCKET_ALIAS || 'unset'}`);
console.log(`RECALL_PRIVATE_KEY: ${maskValue(process.env.RECALL_PRIVATE_KEY)}`);
console.log(`ETHEREUM_PRIVATE_KEY: ${maskValue(process.env.ETHEREUM_PRIVATE_KEY)}`);
console.log(`AZURE_OPENAI_API_KEY: ${maskValue(process.env.AZURE_OPENAI_API_KEY)}`);
console.log(`GEMINI_API_KEY: ${maskValue(process.env.GEMINI_API_KEY)}`);
console.log(`COINBASE_CDP_KEY: ${maskValue(process.env.COINBASE_CDP_KEY)}`);
console.log(`COINBASE_CDP_SECRET: ${maskValue(process.env.COINBASE_CDP_SECRET)}`);
console.log(`MARLIN_ENCLAVE: ${process.env.MARLIN_ENCLAVE || 'unset'}`);
