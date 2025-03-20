/**
 * Marlin Oyster CVM Attestation Module
 * 
 * Provides utilities for verifying the authenticity and integrity
 * of Confidential Virtual Machines (CVMs) through remote attestation.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const os = require('os');
const https = require('https');

const execPromise = util.promisify(exec);

// AWS Nitro certificate for verification
const AWS_NITRO_CERT = `-----BEGIN CERTIFICATE-----
MIICETCCAZagAwIBAgIRAPkxdWgbkK/hHUbMtOTn+FYwCgYIKoZIzj0EAwMwSTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoMBkFtYXpvbjEMMAoGA1UECwwDQVdTMRswGQYD
VQQDDBJhd3Mubml0cm8tZW5jbGF2ZXMwHhcNMTkxMDI4MTMyODA1WhcNNDkxMDI4
MTQyODA1WjBJMQswCQYDVQQGEwJVUzEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQL
DANBV1MxGzAZBgNVBAMMEmF3cy5uaXRyby1lbmNsYXZlczB2MBAGByqGSM49AgEG
BSuBBAAiA2IABPwCVOumCMHzaHDimtqQvkY4MpJzbolL//Zy2YlES1BR5TSksfbb
48C8WBoyt7F2Bw7eEtaaP+ohG2bnUs990d0JX28TcPQXCEPZ3BABIeTPYwEoCWZE
h8l5YoQwTcU/9KNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUkCW1DdkF
R+eWw5b6cp3PmanfS5YwDgYDVR0PAQH/BAQDAgGGMAoGCCqGSM49BAMDA2kAMGYC
MQCjfy+Rocm9Xue4YnwWmNJVA44fA0P5W2OpYow9OYCVRaEevL8uO1XYru5xtMPW
rfMCMQCi85sWBbJwKKXdS6BptQFuZbT73o/gBh1qUxl/nNr12UO8Yfwr6wPLb+6N
IwLz3/Y=
-----END CERTIFICATE-----`;

/**
 * Get the attestation document from a running CVM
 * @param {string} ip IP address of the CVM
 * @param {number} port Port of the attestation server (default: 1300)
 * @returns {Promise<Buffer>} The attestation document as a buffer
 */
async function getAttestationDocument(ip, port = 1300) {
  return new Promise((resolve, reject) => {
    const url = `http://${ip}:${port}/attestation/raw`;
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch attestation document: HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', (err) => reject(err));
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Verify a CVM attestation
 * @param {Object} options Verification options
 * @returns {Promise<Object>} Verification result
 */
async function verifyAttestation(options) {
  const {
    enclaveIp,
    userData,
    pcrPreset = 'base/blue/v1.0.0/arm64'
  } = options;
  
  if (!enclaveIp) {
    throw new Error('Enclave IP is required');
  }
  
  if (!userData) {
    throw new Error('User data (digest) is required');
  }
  
  const verifyCommand = `oyster-cvm verify --enclave-ip ${enclaveIp} --user-data ${userData} --pcr-preset ${pcrPreset}`;
  
  try {
    const { stdout, stderr } = await execPromise(verifyCommand);
    
    // Check if verification was successful
    const isVerified = stdout.includes('Verification successful');
    
    return {
      success: isVerified,
      output: stdout,
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stderr: error.stderr
    };
  }
}

/**
 * Set up the AWS Nitro certificate for verification
 * @param {string} certPath Path to save the certificate
 * @returns {Promise<string>} Path to the saved certificate
 */
async function setupCertificate(certPath = path.join(os.tmpdir(), 'aws-nitro.cert')) {
  try {
    fs.writeFileSync(certPath, AWS_NITRO_CERT);
    return certPath;
  } catch (error) {
    throw new Error(`Failed to set up certificate: ${error.message}`);
  }
}

/**
 * Download and set up the verifier binary
 * @param {string} outputPath Path to save the verifier
 * @returns {Promise<string>} Path to the verifier
 */
async function setupVerifier(outputPath = path.join(os.tmpdir(), 'marlin-verifier')) {
  const downloadCommand = `wget http://public.artifacts.marlin.pro/projects/enclaves/verifier -O ${outputPath} && chmod +x ${outputPath}`;
  
  try {
    await execPromise(downloadCommand);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to download verifier: ${error.message}`);
  }
}

/**
 * Verify a CVM using the verifier binary
 * @param {Object} options Verification options
 * @returns {Promise<Object>} Verification result with public key
 */
async function verifyWithBinary(options) {
  const {
    enclaveIp,
    pcr0,
    pcr1,
    pcr2,
    verifierPath,
    outputKeyPath = path.join(os.tmpdir(), 'enclave-key.pub'),
    maxAge = 300
  } = options;
  
  if (!enclaveIp || !pcr0 || !pcr1 || !pcr2 || !verifierPath) {
    throw new Error('Missing required verification parameters');
  }
  
  const verifyCommand = `${verifierPath} --endpoint http://${enclaveIp}:1300/attestation/raw --public ${outputKeyPath} --pcr0 "${pcr0}" --pcr1 "${pcr1}" --pcr2 "${pcr2}" --max-age ${maxAge}`;
  
  try {
    const { stdout, stderr } = await execPromise(verifyCommand);
    
    let publicKey = null;
    if (fs.existsSync(outputKeyPath)) {
      publicKey = fs.readFileSync(outputKeyPath);
    }
    
    return {
      success: true,
      publicKey,
      output: stdout,
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stderr: error.stderr
    };
  }
}

module.exports = {
  getAttestationDocument,
  verifyAttestation,
  setupCertificate,
  setupVerifier,
  verifyWithBinary,
  AWS_NITRO_CERT
};
