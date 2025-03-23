#!/usr/bin/env node

/**
 * Secure Deployment Script
 * 
 * This script demonstrates secure deployment using attestation verification
 * to ensure the environment is trusted before exposing sensitive information.
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { 
  verifyAttestation, 
  computeFileDigest, 
  createSecureWallet, 
  isAttestationVerified 
} from './agent-attestation.js';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Configuration
const MARLIN_PRIVATE_KEY = process.env.MARLIN || '';
const DOCKER_COMPOSE_FILE = process.env.DOCKER_COMPOSE_FILE || './marlin-docker-compose.yml';
const NETWORK = process.env.NETWORK || 'default';
const JOB_ID = process.env.JOB_ID || '';

// Set JOB_ID for attestation verification
process.env.JOB_ID = JOB_ID;

// Banner
console.log('=================================================');
console.log('   SECURE MARLIN CVM DEPLOYMENT WITH ATTESTATION  ');
console.log('=================================================\n');

/**
 * Execute a shell command
 * @param {string} command - Command to execute
 * @returns {Promise<string>} - Command output
 */
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.warn(`Warning: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {boolean} - Whether file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error checking if file exists: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Check if the private key is available
    if (!MARLIN_PRIVATE_KEY) {
      console.error('Error: MARLIN private key not found in environment variables');
      console.error('Please set the MARLIN environment variable with your private key');
      process.exit(1);
    }

    // Check if Docker Compose file exists
    if (!fileExists(DOCKER_COMPOSE_FILE)) {
      console.error(`Error: Docker Compose file not found at ${DOCKER_COMPOSE_FILE}`);
      process.exit(1);
    }

    // Compute Docker Compose file digest for attestation
    console.log(`Computing digest of Docker Compose file: ${DOCKER_COMPOSE_FILE}`);
    const composeDigest = await computeFileDigest(DOCKER_COMPOSE_FILE);
    console.log(`Docker Compose file digest: ${composeDigest}`);

    // Verify attestation
    console.log('\nVerifying attestation with computed digest...');
    const attestationVerified = await verifyAttestation(composeDigest);

    if (!attestationVerified) {
      console.error('Attestation verification failed!');
      console.error('Deployment aborted for security reasons.');
      process.exit(1);
    }

    console.log('Attestation verification successful!');
    console.log('Environment integrity confirmed.');

    // Create secure wallet now that attestation is verified
    console.log('\nCreating secure wallet...');
    const wallet = createSecureWallet(MARLIN_PRIVATE_KEY);

    if (!wallet) {
      console.error('Error: Failed to create wallet after attestation verification');
      process.exit(1);
    }

    console.log(`Wallet address: ${wallet.address}`);

    // Deploy to Marlin CVM
    console.log('\nDeploying to Marlin CVM...');
    
    // Note: We only perform a simulated deployment since the actual command syntax seems to differ
    // from what we expected. The current oyster-cvm CLI doesn't seem to support the -f flag for deploy
    // and requires a duration-in-minutes parameter.
    
    // Update the command to match the actual CLI syntax
    const durationMinutes = process.env.DURATION_MINUTES || 60; // Default to 60 minutes if not specified
    let deployCommand = `MARLIN=${MARLIN_PRIVATE_KEY} oyster-cvm deploy --duration-in-minutes ${durationMinutes}`;
    
    // Add network if specified
    if (NETWORK && NETWORK !== 'default') {
      deployCommand += ` --network ${NETWORK}`;
    }
    
    // Add debug mode
    deployCommand += ' --debug';

    // Check for dry-run mode
    const isDryRun = process.argv.includes('--dry-run');
    
    if (isDryRun) {
      console.log('DRY RUN: Would execute the following command:');
      console.log(deployCommand);
      console.log('\nSimulated deployment completed successfully (dry run)');
      process.exit(0);
    }
    
    try {
      const deployOutput = await executeCommand(deployCommand);
      console.log('Deployment output:');
      console.log(deployOutput);
      
      // Extract job ID from output using regex
      const jobIdMatch = deployOutput.match(/job_id:\s*([a-zA-Z0-9_-]+)/);
      const jobId = jobIdMatch ? jobIdMatch[1] : null;
      
      if (jobId) {
        console.log(`\nJob ID: ${jobId}`);
        console.log('Checking job status...');
        
        // Wait a moment for job to initialize
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check job status
        const statusOutput = await executeCommand(`MARLIN=${MARLIN_PRIVATE_KEY} oyster-cvm list`);
        console.log('Job status:');
        console.log(statusOutput);
      } else {
        console.warn('Could not extract job ID from deployment output');
      }
    } catch (error) {
      console.error('Deployment failed:', error);
      process.exit(1);
    }
    
    console.log('\nDeployment and verification completed successfully');
    
  } catch (error) {
    console.error('Error during secure deployment:', error);
    process.exit(1);
  }
}

// Run main function
main(); 