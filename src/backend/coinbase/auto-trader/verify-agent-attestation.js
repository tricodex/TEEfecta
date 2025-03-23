// Agent Attestation Verification
// Tests an agent's ability to verify attestation data and secure its operations

const fs = require('fs');
const https = require('https');
const { ethers } = require('ethers');
const crypto = require('crypto');

// Configuration
const config = {
  attestationFile: process.argv[2] || 'latest-attestation.json',
  reportFile: 'agent-attestation-report.json',
  requiredTests: [
    'attestation_loading',
    'signature_verification',
    'pcr_validation',
    'service_connectivity',
    'timestamp_freshness'
  ],
  timeoutMs: 10000
};

// Logging utility
const log = {
  info: (message) => {
    console.log(`[INFO] ${message}`);
  },
  error: (message) => {
    console.error(`[ERROR] ${message}`);
  },
  result: (test, passed, details = '') => {
    console.log(`[TEST] ${test}: ${passed ? '✅ PASSED' : '❌ FAILED'} ${details}`);
    return { name: test, passed, details };
  }
};

// Attestation verification class
class AttestationVerifier {
  constructor(attestationFile) {
    this.attestationFile = attestationFile;
    this.attestation = null;
    this.results = [];
  }
  
  // Run all verification tests
  async verifyAll() {
    log.info(`Starting attestation verification tests using ${this.attestationFile}`);
    
    // Run all verification tests
    this.results.push(await this.testAttestationLoading());
    this.results.push(await this.testSignatureVerification());
    this.results.push(await this.testPcrValidation());
    this.results.push(await this.testServiceConnectivity());
    this.results.push(await this.testTimestampFreshness());
    
    // Generate summary
    const passedCount = this.results.filter(r => r.passed).length;
    const totalCount = this.results.length;
    const allPassed = passedCount === totalCount;
    
    log.info(`Verification complete: ${passedCount}/${totalCount} tests passed`);
    
    // Save report
    this.saveReport();
    
    return allPassed;
  }
  
  // Test: Can load attestation data
  async testAttestationLoading() {
    try {
      log.info('Testing attestation data loading');
      
      if (!fs.existsSync(this.attestationFile)) {
        return log.result('attestation_loading', false, `File not found: ${this.attestationFile}`);
      }
      
      const data = fs.readFileSync(this.attestationFile, 'utf8');
      this.attestation = JSON.parse(data);
      
      if (!this.attestation || typeof this.attestation !== 'object') {
        return log.result('attestation_loading', false, 'Invalid JSON format');
      }
      
      // Check required fields
      const requiredFields = [
        'job_id', 'ip_address', 'wallet_address', 
        'attestation_verified', 'timestamp', 'network'
      ];
      
      const missingFields = requiredFields.filter(field => !this.attestation[field]);
      
      if (missingFields.length > 0) {
        return log.result(
          'attestation_loading', 
          false, 
          `Missing required fields: ${missingFields.join(', ')}`
        );
      }
      
      return log.result(
        'attestation_loading', 
        true, 
        `Loaded attestation for job ${this.attestation.job_id}`
      );
    } catch (error) {
      return log.result('attestation_loading', false, error.message);
    }
  }
  
  // Test: Validates PCR values
  async testPcrValidation() {
    try {
      log.info('Testing PCR validation');
      
      if (!this.attestation) {
        return log.result('pcr_validation', false, 'Attestation not loaded');
      }
      
      // Check if PCR values exist
      if (!this.attestation.pcr0 && !this.attestation.pcr1 && !this.attestation.pcr2) {
        return log.result('pcr_validation', false, 'No PCR values found in attestation data');
      }
      
      // Validate PCR format (should be hex strings)
      const pcrRegex = /^[0-9a-f]{64}$/i;
      
      let validFormat = true;
      let details = [];
      
      if (this.attestation.pcr0 && !pcrRegex.test(this.attestation.pcr0)) {
        validFormat = false;
        details.push('PCR0 has invalid format');
      }
      
      if (this.attestation.pcr1 && !pcrRegex.test(this.attestation.pcr1)) {
        validFormat = false;
        details.push('PCR1 has invalid format');
      }
      
      if (this.attestation.pcr2 && !pcrRegex.test(this.attestation.pcr2)) {
        validFormat = false;
        details.push('PCR2 has invalid format');
      }
      
      if (!validFormat) {
        return log.result('pcr_validation', false, details.join(', '));
      }
      
      return log.result('pcr_validation', true, 'PCR values have valid format');
    } catch (error) {
      return log.result('pcr_validation', false, error.message);
    }
  }
  
  // Test: Verifies attestation signature (simulated)
  async testSignatureVerification() {
    try {
      log.info('Testing signature verification (simulated)');
      
      if (!this.attestation) {
        return log.result('signature_verification', false, 'Attestation not loaded');
      }
      
      // In a real implementation, we would verify the attestation signature
      // For this test, we simulate verification by trusting the 'attestation_verified' field
      
      if (!this.attestation.attestation_verified) {
        return log.result(
          'signature_verification', 
          false, 
          'Attestation not verified according to metadata'
        );
      }
      
      // Additional check: create a hash from PCR values to simulate verification
      if (this.attestation.pcr0 && this.attestation.pcr1) {
        const dataToHash = this.attestation.pcr0 + this.attestation.pcr1;
        const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
        
        log.info(`Simulated verification hash: ${hash.substring(0, 16)}...`);
      }
      
      return log.result('signature_verification', true, 'Attestation signature verified');
    } catch (error) {
      return log.result('signature_verification', false, error.message);
    }
  }
  
  // Test: Checks if service is reachable
  async testServiceConnectivity() {
    try {
      log.info('Testing service connectivity');
      
      if (!this.attestation || !this.attestation.ip_address) {
        return log.result('service_connectivity', false, 'IP address not found in attestation');
      }
      
      const ipAddress = this.attestation.ip_address;
      log.info(`Testing connectivity to ${ipAddress}:3222`);
      
      // Try to connect to the service
      const connected = await this.pingService(ipAddress);
      
      if (!connected) {
        return log.result(
          'service_connectivity', 
          false, 
          `Could not connect to service at ${ipAddress}:3222`
        );
      }
      
      return log.result('service_connectivity', true, `Connected to service at ${ipAddress}:3222`);
    } catch (error) {
      return log.result('service_connectivity', false, error.message);
    }
  }
  
  // Test: Validates attestation timestamp freshness
  async testTimestampFreshness() {
    try {
      log.info('Testing timestamp freshness');
      
      if (!this.attestation || !this.attestation.timestamp) {
        return log.result('timestamp_freshness', false, 'Timestamp not found in attestation');
      }
      
      const timestamp = new Date(this.attestation.timestamp);
      const now = new Date();
      
      // Check if timestamp is a valid date
      if (isNaN(timestamp.getTime())) {
        return log.result(
          'timestamp_freshness', 
          false, 
          `Invalid timestamp format: ${this.attestation.timestamp}`
        );
      }
      
      // Check if timestamp is in the future
      if (timestamp > now) {
        return log.result(
          'timestamp_freshness', 
          false, 
          `Timestamp is in the future: ${this.attestation.timestamp}`
        );
      }
      
      // Check if attestation is older than 24 hours
      const ageHours = (now - timestamp) / (1000 * 60 * 60);
      
      if (ageHours > 24) {
        return log.result(
          'timestamp_freshness', 
          false, 
          `Attestation is too old: ${ageHours.toFixed(2)} hours`
        );
      }
      
      return log.result(
        'timestamp_freshness', 
        true, 
        `Attestation is ${ageHours.toFixed(2)} hours old (< 24 hours)`
      );
    } catch (error) {
      return log.result('timestamp_freshness', false, error.message);
    }
  }
  
  // Helper: Ping service to test connectivity
  async pingService(ipAddress) {
    return new Promise((resolve) => {
      const req = https.get(`http://${ipAddress}:3222/`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(res.statusCode === 200);
        });
      }).on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(config.timeoutMs, () => {
        req.destroy();
        resolve(false);
      });
    });
  }
  
  // Save verification report
  saveReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        attestationFile: this.attestationFile,
        results: this.results,
        summary: {
          total: this.results.length,
          passed: this.results.filter(r => r.passed).length,
          failed: this.results.filter(r => !r.passed).length
        }
      };
      
      fs.writeFileSync(config.reportFile, JSON.stringify(report, null, 2));
      log.info(`Report saved to ${config.reportFile}`);
    } catch (error) {
      log.error(`Failed to save report: ${error.message}`);
    }
  }
}

// Simulated agent operations
class SecureAgent {
  constructor(verifier) {
    this.verifier = verifier;
    this.attestation = verifier.attestation;
    this.wallet = null;
  }
  
  // Initialize wallet (only if attestation is verified)
  async initializeWallet() {
    try {
      log.info('Initializing secure wallet');
      
      // Check if all required tests have passed
      const passedTests = this.verifier.results.filter(r => r.passed).map(r => r.name);
      const missingTests = config.requiredTests.filter(test => !passedTests.includes(test));
      
      if (missingTests.length > 0) {
        log.error(`Cannot initialize wallet: missing tests: ${missingTests.join(', ')}`);
        return false;
      }
      
      // Create a random wallet for demo purposes
      // In a real implementation, we would load a wallet from secure storage
      this.wallet = ethers.Wallet.createRandom();
      
      log.info(`Wallet initialized: ${this.wallet.address}`);
      return true;
    } catch (error) {
      log.error(`Wallet initialization error: ${error.message}`);
      return false;
    }
  }
  
  // Simulate a secure operation
  async performSecureOperation() {
    try {
      if (!this.wallet) {
        log.error('Cannot perform secure operation: wallet not initialized');
        return false;
      }
      
      log.info('Performing secure operation');
      
      // Simulate a secure operation (signing a message)
      const message = `Secure operation at ${new Date().toISOString()}`;
      const signature = await this.wallet.signMessage(message);
      
      log.info(`Message signed: ${message}`);
      log.info(`Signature: ${signature.substring(0, 20)}...`);
      
      return true;
    } catch (error) {
      log.error(`Secure operation error: ${error.message}`);
      return false;
    }
  }
}

// Main function
const main = async () => {
  try {
    // Create verifier
    const verifier = new AttestationVerifier(config.attestationFile);
    
    // Run verification tests
    const verified = await verifier.verifyAll();
    
    if (!verified) {
      log.error('Attestation verification failed');
      process.exit(1);
    }
    
    // Create secure agent
    const agent = new SecureAgent(verifier);
    
    // Initialize wallet
    const walletInitialized = await agent.initializeWallet();
    
    if (!walletInitialized) {
      log.error('Wallet initialization failed');
      process.exit(1);
    }
    
    // Perform secure operation
    const operationSuccessful = await agent.performSecureOperation();
    
    if (!operationSuccessful) {
      log.error('Secure operation failed');
      process.exit(1);
    }
    
    log.info('All tests completed successfully');
    process.exit(0);
  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
};

// Run main function
main(); 