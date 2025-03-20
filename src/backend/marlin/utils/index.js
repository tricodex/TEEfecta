/**
 * Marlin Oyster CVM Utilities
 * 
 * Helper functions for working with Marlin Oyster CVMs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

/**
 * Generate a temporary directory for CVM deployment
 * @param {string} prefix Prefix for the directory name
 * @returns {Promise<string>} Path to the created directory
 */
async function createTempDirectory(prefix = '4g3n7-cvm-') {
  const tempDir = path.join(os.tmpdir(), `${prefix}${Date.now()}`);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  return tempDir;
}

/**
 * Calculate the SHA-256 hash of a file
 * @param {string} filePath Path to the file
 * @returns {Promise<string>} SHA-256 hash of the file
 */
async function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Copy a directory recursively
 * @param {string} source Source directory
 * @param {string} destination Destination directory
 * @returns {Promise<void>}
 */
async function copyDirectory(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const entries = fs.readdirSync(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Check if a port is in use
 * @param {number} port The port to check
 * @returns {Promise<boolean>} True if the port is in use
 */
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
}

/**
 * Generate a random wallet private key for testing
 * @returns {string} Random private key
 */
function generateRandomPrivateKey() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

/**
 * Validate PCR values
 * @param {string} pcr PCR hash value
 * @returns {boolean} True if the PCR is valid
 */
function isValidPcr(pcr) {
  // PCR values are typically 96 character hex strings (SHA-384)
  return /^[a-f0-9]{96}$/i.test(pcr);
}

/**
 * Format duration in minutes to a human-readable string
 * @param {number} minutes Duration in minutes
 * @returns {string} Formatted duration
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return `${hours} hours${remainingMinutes ? ` ${remainingMinutes} minutes` : ''}`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return `${days} days${remainingHours ? ` ${remainingHours} hours` : ''}${
    remainingMinutes ? ` ${remainingMinutes} minutes` : ''
  }`;
}

module.exports = {
  createTempDirectory,
  calculateFileHash,
  copyDirectory,
  isPortInUse,
  generateRandomPrivateKey,
  isValidPcr,
  formatDuration
};
