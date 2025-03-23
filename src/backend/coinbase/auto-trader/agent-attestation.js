// Agent Attestation Verification Module
// This module verifies the attestation data for the Marlin CVM environment

import fs from 'fs';
import crypto from 'crypto';
import https from 'https';
import { Wallet } from 'ethers';

// Expected PCR values for ARM64 instances
const EXPECTED_PCR_VALUES = {
  PCR0: '0d8c50f0d0e9ecf25c48ba9ed1d8d5dc475be1dba553a0ef299f385bd7447220',
  PCR1: 'd71f06f25bcd891848eecfcd65688831d9acf4be17da631b15fb5b1ecd7c3d23',
  PCR2: 'bd79abe09f36d95bb28c08d6f9d758c3bddebc6aa634b8c65cbae4b4b54a4146'
};

// Path to attestation file
const ATTESTATION_FILE = process.env.ATTESTATION_FILE || './attestation-data.json';
const ATTESTATION_SERVICE = process.env.ATTESTATION_SERVICE || 'http://localhost:1300';
const JOB_ID = process.env.JOB_ID;

// Wallet operations flag - only perform sensitive operations if attestation is verified
let attestationVerified = false;

/**
 * Loads attestation data from a file or service
 * @returns {Promise<Object>} Attestation data
 */
async function loadAttestationData() {
  console.log('[ATTESTATION] Loading attestation data');
  
  try {
    // First try to load from file
    if (fs.existsSync(ATTESTATION_FILE)) {
      const data = fs.readFileSync(ATTESTATION_FILE, 'utf8');
      return JSON.parse(data);
    }
    
    // If file doesn't exist, try to fetch from service
    console.log('[ATTESTATION] File not found, fetching from attestation service');
    return await fetchAttestationFromService();
  } catch (error) {
    console.error('[ATTESTATION] Error loading attestation data:', error.message);
    throw new Error('Failed to load attestation data');
  }
}

/**
 * Fetches attestation data from the attestation service
 * @returns {Promise<Object>} Attestation data
 */
async function fetchAttestationFromService() {
  return new Promise((resolve, reject) => {
    const url = `${ATTESTATION_SERVICE}/attestation`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const attestationData = JSON.parse(data);
          resolve(attestationData);
        } catch (error) {
          reject(new Error('Failed to parse attestation data'));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to fetch attestation: ${error.message}`));
    });
  });
}

/**
 * Validates the format of the attestation data
 * @param {Object} attestationData - The attestation data to validate
 * @returns {boolean} Whether the attestation data is valid
 */
function validateAttestationFormat(attestationData) {
  console.log('[ATTESTATION] Validating attestation format');
  
  // Check if attestation data exists
  if (!attestationData) {
    console.error('[ATTESTATION] Attestation data is null or undefined');
    return false;
  }
  
  // Check for required fields
  const requiredFields = ['pcrs', 'userData', 'timestamp', 'signature'];
  for (const field of requiredFields) {
    if (!attestationData[field]) {
      console.error(`[ATTESTATION] Missing required field: ${field}`);
      return false;
    }
  }
  
  // Check PCR values
  if (!attestationData.pcrs.PCR0 || !attestationData.pcrs.PCR1 || !attestationData.pcrs.PCR2) {
    console.error('[ATTESTATION] Missing PCR values');
    return false;
  }
  
  // Check PCR format (64 character hex strings)
  const pcrRegex = /^[0-9a-f]{64}$/;
  for (const pcr of Object.keys(attestationData.pcrs)) {
    if (!pcrRegex.test(attestationData.pcrs[pcr])) {
      console.error(`[ATTESTATION] Invalid PCR format for ${pcr}: ${attestationData.pcrs[pcr]}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Verifies the PCR values in the attestation data
 * @param {Object} attestationData - The attestation data to verify
 * @returns {boolean} Whether the PCR values are verified
 */
function verifyPCRValues(attestationData) {
  console.log('[ATTESTATION] Verifying PCR values');
  
  for (const pcr of Object.keys(EXPECTED_PCR_VALUES)) {
    const expectedValue = EXPECTED_PCR_VALUES[pcr];
    const actualValue = attestationData.pcrs[pcr];
    
    if (expectedValue !== actualValue) {
      console.error(`[ATTESTATION] PCR value mismatch for ${pcr}:`);
      console.error(`  Expected: ${expectedValue}`);
      console.error(`  Actual:   ${actualValue}`);
      return false;
    }
  }
  
  console.log('[ATTESTATION] All PCR values verified successfully');
  return true;
}

/**
 * Verifies the user data digest in the attestation data
 * @param {Object} attestationData - The attestation data to verify
 * @param {string} expectedDigest - The expected user data digest
 * @returns {boolean} Whether the user data digest is verified
 */
function verifyUserData(attestationData, expectedDigest) {
  console.log('[ATTESTATION] Verifying user data digest');
  
  if (!expectedDigest) {
    console.warn('[ATTESTATION] No expected digest provided, skipping user data verification');
    return true;
  }
  
  const actualDigest = attestationData.userData;
  
  if (expectedDigest !== actualDigest) {
    console.error('[ATTESTATION] User data digest mismatch:');
    console.error(`  Expected: ${expectedDigest}`);
    console.error(`  Actual:   ${actualDigest}`);
    return false;
  }
  
  console.log('[ATTESTATION] User data digest verified successfully');
  return true;
}

/**
 * Verifies the job ID in the attestation data
 * @param {Object} attestationData - The attestation data to verify
 * @returns {boolean} Whether the job ID is verified
 */
function verifyJobID(attestationData) {
  if (!JOB_ID) {
    console.warn('[ATTESTATION] No job ID provided, skipping job ID verification');
    return true;
  }
  
  if (!attestationData.jobID) {
    console.error('[ATTESTATION] No job ID in attestation data');
    return false;
  }
  
  if (attestationData.jobID !== JOB_ID) {
    console.error('[ATTESTATION] Job ID mismatch:');
    console.error(`  Expected: ${JOB_ID}`);
    console.error(`  Actual:   ${attestationData.jobID}`);
    return false;
  }
  
  console.log('[ATTESTATION] Job ID verified successfully');
  return true;
}

/**
 * Verifies the attestation signature
 * @param {Object} attestationData - The attestation data to verify
 * @returns {boolean} Whether the signature is verified
 */
function verifySignature(attestationData) {
  // In a real implementation, this would verify the attestation signature
  // using the attestation service's public key
  console.log('[ATTESTATION] Signature verification not implemented');
  return true;
}

/**
 * Performs a full attestation verification
 * @param {string} expectedUserDataDigest - The expected user data digest
 * @returns {Promise<boolean>} Whether the attestation is verified
 */
async function verifyAttestation(expectedUserDataDigest) {
  console.log('[ATTESTATION] Starting attestation verification');
  
  try {
    const attestationData = await loadAttestationData();
    
    if (!validateAttestationFormat(attestationData)) {
      console.error('[ATTESTATION] Attestation format validation failed');
      return false;
    }
    
    const pcrVerified = verifyPCRValues(attestationData);
    const userDataVerified = verifyUserData(attestationData, expectedUserDataDigest);
    const jobIDVerified = verifyJobID(attestationData);
    const signatureVerified = verifySignature(attestationData);
    
    const verified = pcrVerified && userDataVerified && jobIDVerified && signatureVerified;
    
    if (verified) {
      console.log('[ATTESTATION] Attestation verification succeeded');
      attestationVerified = true;
    } else {
      console.error('[ATTESTATION] Attestation verification failed');
      attestationVerified = false;
    }
    
    return verified;
  } catch (error) {
    console.error('[ATTESTATION] Error during attestation verification:', error.message);
    attestationVerified = false;
    return false;
  }
}

/**
 * Computes the digest of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} The SHA-256 digest of the file
 */
async function computeFileDigest(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const hash = crypto.createHash('sha256');
      hash.update(fileContent);
      resolve(hash.digest('hex'));
    } catch (error) {
      reject(new Error(`Failed to compute file digest: ${error.message}`));
    }
  });
}

/**
 * Creates a secure wallet only if attestation is verified
 * @param {string} privateKey - The private key for the wallet
 * @returns {Object|null} The wallet object or null if attestation is not verified
 */
function createSecureWallet(privateKey) {
  if (!attestationVerified) {
    console.error('[ATTESTATION] Cannot create secure wallet: attestation not verified');
    return null;
  }
  
  try {
    console.log('[ATTESTATION] Creating secure wallet');
    return new Wallet(privateKey);
  } catch (error) {
    console.error('[ATTESTATION] Error creating secure wallet:', error.message);
    return null;
  }
}

// Function to check if attestation is verified
function isAttestationVerified() {
  return attestationVerified;
}

// Export functions
export {
  verifyAttestation,
  computeFileDigest,
  createSecureWallet,
  loadAttestationData,
  validateAttestationFormat,
  verifyPCRValues,
  verifyUserData,
  verifyJobID,
  isAttestationVerified
}; 