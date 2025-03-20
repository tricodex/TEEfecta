/**
 * Marlin Oyster CVM Deployment Module
 * 
 * Provides utilities for deploying and managing Confidential Virtual Machines (CVMs)
 * on the Marlin Oyster network.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const os = require('os');

const execPromise = util.promisify(exec);

/**
 * Installs the oyster-cvm CLI tool
 * @param {Object} options Installation options
 * @returns {Promise<string>} Installation result
 */
async function installOysterCli(options = {}) {
  const platform = options.platform || os.platform();
  const arch = options.arch || os.arch();
  
  let archStr;
  if (arch === 'x64') {
    archStr = 'amd64';
  } else if (arch === 'arm64') {
    archStr = 'arm64';
  } else {
    throw new Error(`Unsupported architecture: ${arch}`);
  }
  
  let platformStr;
  if (platform === 'linux') {
    platformStr = 'linux';
  } else if (platform === 'darwin') {
    platformStr = 'darwin';
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  const installCommand = `sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_${platformStr}_${archStr} -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm`;
  
  try {
    const { stdout, stderr } = await execPromise(installCommand);
    if (stderr) {
      console.warn('Installation warning:', stderr);
    }
    return `Successfully installed oyster-cvm CLI tool: ${stdout}`;
  } catch (error) {
    throw new Error(`Failed to install oyster-cvm CLI tool: ${error.message}`);
  }
}

/**
 * Verifies that the oyster-cvm CLI is installed and working
 * @returns {Promise<boolean>} True if CLI is working
 */
async function verifyOysterCli() {
  try {
    await execPromise('oyster-cvm');
    return true;
  } catch (error) {
    if (error.message.includes('help') || error.message.includes('usage')) {
      // Command exists but returned help text
      return true;
    }
    return false;
  }
}

/**
 * Generate a docker-compose.yml file for deployment
 * @param {Object} config Configuration for docker-compose
 * @param {string} outputPath Path to save the docker-compose.yml file
 * @returns {Promise<string>} Path to the generated file
 */
async function generateDockerCompose(config, outputPath) {
  if (!config || !config.services) {
    throw new Error('Invalid configuration: must include services');
  }
  
  // Basic docker-compose template for 4g3n7
  const composeContent = `services:
  ${Object.entries(config.services).map(([name, service]) => `
  ${name}:
    image: ${service.image}
    ${service.network_mode ? `network_mode: ${service.network_mode}` : ''}
    restart: ${service.restart || 'unless-stopped'}
    ${service.init ? 'init: true' : ''}
    ${service.environment ? `environment:
      ${Object.entries(service.environment).map(([key, value]) => `
      - ${key}=${value}`).join('')}` : ''}
    ${service.volumes ? `volumes:
      ${service.volumes.map(volume => `
      - ${volume}`).join('')}` : ''}
  `).join('')}`;
  
  fs.writeFileSync(outputPath, composeContent);
  return outputPath;
}

/**
 * Deploy a CVM on the Marlin Oyster network
 * @param {Object} options Deployment options
 * @returns {Promise<Object>} Deployment result
 */
async function deployCvm(options) {
  const {
    walletPrivateKey,
    durationInMinutes = 60,
    dockerComposePath,
    arch = 'arm64'
  } = options;
  
  if (!walletPrivateKey) {
    throw new Error('Wallet private key is required');
  }
  
  if (!dockerComposePath) {
    throw new Error('Docker compose file path is required');
  }
  
  const deployCommand = `oyster-cvm deploy --wallet-private-key ${walletPrivateKey} --duration-in-minutes ${durationInMinutes} --docker-compose ${dockerComposePath} ${arch === 'amd64' ? '--arch amd64' : ''}`;
  
  try {
    const { stdout, stderr } = await execPromise(deployCommand);
    
    // Parse important information from the deployment output
    const digestMatch = stdout.match(/Computed digest: ([a-f0-9]+)/);
    const ipMatch = stdout.match(/IP: (\d+\.\d+\.\d+\.\d+)/);
    
    return {
      success: true,
      digest: digestMatch ? digestMatch[1] : null,
      ip: ipMatch ? ipMatch[1] : null,
      output: stdout,
      error: stderr
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

/**
 * List running CVMs for a specific wallet address
 * @param {string} address Wallet address
 * @returns {Promise<Array>} List of running jobs
 */
async function listRunningCvms(address) {
  if (!address) {
    throw new Error('Wallet address is required');
  }
  
  try {
    const { stdout } = await execPromise(`oyster-cvm list --address ${address}`);
    
    // Parse job list from output
    const jobs = [];
    const lines = stdout.split('\n');
    let capturingJobs = false;
    
    for (const line of lines) {
      if (line.includes('Job ID')) {
        capturingJobs = true;
        continue;
      }
      
      if (capturingJobs && line.trim() && !line.includes('---')) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          jobs.push({
            jobId: parts[0],
            status: parts[1],
            remainingTime: parts[2],
            ip: parts[3]
          });
        }
      }
    }
    
    return jobs;
  } catch (error) {
    throw new Error(`Failed to list jobs: ${error.message}`);
  }
}

module.exports = {
  installOysterCli,
  verifyOysterCli,
  generateDockerCompose,
  deployCvm,
  listRunningCvms
};
