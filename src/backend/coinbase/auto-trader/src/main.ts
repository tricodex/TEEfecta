// Main application entry point
import * as dotenv from 'dotenv';
import { createServer } from './server.js';
import { initAgent } from './agent/index.js';
import { validateEnvironment, initializeDefaultEnvironment } from './utils/env-validator.js';

// Load environment variables
dotenv.config();

// Detect if running inside Marlin CVM
const isMarlinEnclave = process.env.MARLIN_ENCLAVE === 'true';
console.log(`Running in Marlin CVM: ${isMarlinEnclave ? 'Yes' : 'No'}`);

async function main() {
  try {
    // Initialize environment defaults
    initializeDefaultEnvironment();
    
    // Validate environment variables
    const envValidation = validateEnvironment();
    
    // Log validation warnings
    if (envValidation.warnings.length > 0) {
      console.warn('Environment validation warnings:');
      envValidation.warnings.forEach(warning => console.warn(`- ${warning}`));
    }
    
    // Check if environment is valid for agent initialization
    if (!envValidation.valid) {
      console.error('Invalid environment configuration:');
      envValidation.missingGroups.forEach(group => {
        console.error(`- Missing required variables for ${group}`);
      });
      console.warn('Continuing with fallback/mock functionality where possible...');
    }
    
    // Initialize agent
    console.log('Initializing 4g3n7 agent...');
    const agent = await initAgent();
    
    // Create and start server
    const port = parseInt(process.env.PORT || '3000');
    const server = createServer(agent);
    
    server.listen(port, () => {
      console.log(`4g3n7 server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize 4g3n7 agent:', error);
    process.exit(1);
  }
}

// Start the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});