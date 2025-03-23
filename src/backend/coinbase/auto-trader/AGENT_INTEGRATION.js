// Secure Agent Integration with Attestation
// This example demonstrates how to build a secure agent that uses attestation

const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const { ethers } = require('ethers');

// Configuration
const config = {
  attestationFile: process.argv[2] || 'latest-attestation.json',
  logFile: `agent-log-${new Date().toISOString().replace(/:/g, '-')}.log`,
  requiredConfidence: 0.95, // Minimum confidence score for attestation
  requestInterval: 60 * 1000, // 1 minute
  geminiModel: "gemini-2.0-flash", // Model to use for analysis
};

// Logging utility
const logger = {
  info: (message) => {
    const logEntry = `[INFO][${new Date().toISOString()}] ${message}`;
    console.log(logEntry);
    fs.appendFileSync(config.logFile, logEntry + '\n');
  },
  error: (message) => {
    const logEntry = `[ERROR][${new Date().toISOString()}] ${message}`;
    console.error(logEntry);
    fs.appendFileSync(config.logFile, logEntry + '\n');
  },
  debug: (message) => {
    const logEntry = `[DEBUG][${new Date().toISOString()}] ${message}`;
    if (process.env.DEBUG) console.log(logEntry);
    fs.appendFileSync(config.logFile, logEntry + '\n');
  }
};

// Attestation verification
class AttestationVerifier {
  constructor(attestationFile) {
    this.attestationFile = attestationFile;
    this.attestation = null;
    this.verified = false;
    this.verificationTime = null;
  }

  // Load and verify attestation data
  async loadAndVerify() {
    try {
      logger.info('Loading attestation data from ' + this.attestationFile);
      
      if (!fs.existsSync(this.attestationFile)) {
        logger.error(`Attestation file not found: ${this.attestationFile}`);
        return false;
      }
      
      // Read and parse attestation data
      const data = fs.readFileSync(this.attestationFile, 'utf8');
      this.attestation = JSON.parse(data);
      
      // Verify basic structure
      if (!this.attestation || !this.attestation.job_id || !this.attestation.ip_address) {
        logger.error('Invalid attestation data format');
        return false;
      }
      
      // Verify attestation status
      if (!this.attestation.attestation_verified) {
        logger.error('Attestation verification failed according to attestation data');
        return false;
      }
      
      // Check timestamp freshness (not older than 24 hours)
      const timestamp = new Date(this.attestation.timestamp);
      const now = new Date();
      const ageHours = (now - timestamp) / (1000 * 60 * 60);
      
      if (ageHours > 24) {
        logger.error(`Attestation is too old (${ageHours.toFixed(2)} hours)`);
        return false;
      }
      
      // Ping service to verify it's still alive
      const alive = await this.pingService();
      if (!alive) {
        logger.error('Service health check failed');
        return false;
      }
      
      // All checks passed
      this.verified = true;
      this.verificationTime = new Date();
      logger.info('Attestation verified successfully');
      logger.debug(`Job ID: ${this.attestation.job_id}`);
      logger.debug(`IP Address: ${this.attestation.ip_address}`);
      logger.debug(`Network: ${this.attestation.network}`);
      
      return true;
    } catch (error) {
      logger.error(`Attestation verification error: ${error.message}`);
      return false;
    }
  }
  
  // Ping the service to make sure it's still running
  async pingService() {
    if (!this.attestation || !this.attestation.ip_address) {
      return false;
    }
    
    return new Promise((resolve) => {
      logger.debug(`Pinging service at ${this.attestation.ip_address}:3222`);
      
      const req = https.get(`http://${this.attestation.ip_address}:3222/`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          logger.debug(`Service responded with status code ${res.statusCode}`);
          resolve(res.statusCode === 200);
        });
      }).on('error', (err) => {
        logger.error(`Service ping error: ${err.message}`);
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        logger.error('Service ping timed out');
        resolve(false);
      });
    });
  }
  
  // Get attestation data
  getAttestation() {
    return this.attestation;
  }
  
  // Check if attestation is verified
  isVerified() {
    return this.verified;
  }
}

// Secure API client that requires attestation
class SecureAPIClient {
  constructor(attestationVerifier) {
    this.verifier = attestationVerifier;
    this.baseUrl = this.verifier.attestation ? 
      `http://${this.verifier.attestation.ip_address}:3222` : 
      null;
  }
  
  // Make a secure API request
  async request(endpoint, method = 'GET', data = null) {
    // Verify attestation first
    if (!this.verifier.isVerified()) {
      await this.verifier.loadAndVerify();
      if (!this.verifier.isVerified()) {
        throw new Error('Cannot make secure request: attestation not verified');
      }
      
      // Update base URL after verification
      this.baseUrl = `http://${this.verifier.attestation.ip_address}:3222`;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    logger.debug(`Making ${method} request to ${url}`);
    
    return new Promise((resolve, reject) => {
      const options = {
        method: method,
        timeout: 10000,
      };
      
      const req = https.request(url, options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsedData = JSON.parse(responseData);
              resolve(parsedData);
            } catch (e) {
              resolve(responseData);
            }
          } else {
            reject(new Error(`Request failed with status code ${res.statusCode}: ${responseData}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }
  
  // Get health status
  async getHealth() {
    return this.request('/health');
  }
  
  // Get market data 
  async getMarketData(symbol) {
    return this.request(`/market/${symbol}`);
  }
  
  // Submit a signed transaction
  async submitTransaction(signedTx) {
    return this.request('/transaction', 'POST', { transaction: signedTx });
  }
}

// LLM integration for market analysis
class MarketAnalyzer {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (!this.apiKey) {
      logger.error('GEMINI_API_KEY environment variable not set');
    }
  }
  
  async initialize() {
    try {
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: config.geminiModel });
      logger.info(`Initialized Gemini ${config.geminiModel} for market analysis`);
      return true;
    } catch (error) {
      logger.error(`Failed to initialize Gemini: ${error.message}`);
      return false;
    }
  }
  
  async analyzeMarketData(marketData) {
    if (!this.model) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { confidence: 0, recommendation: 'HOLD', reason: 'Analysis model not available' };
      }
    }
    
    try {
      const prompt = `
        Analyze this cryptocurrency market data and provide a trading recommendation:
        ${JSON.stringify(marketData, null, 2)}
        
        Provide your analysis in the following JSON format:
        {
          "confidence": <number between 0 and 1>,
          "recommendation": <"BUY", "SELL", or "HOLD">,
          "reason": <brief explanation>
        }
      `;
      
      const result = await this.model.generateContent(prompt);
      const resultText = result.response.text();
      
      // Extract JSON from the response
      const jsonMatch = resultText.match(/```json\n([\s\S]*?)\n```/) || 
                        resultText.match(/{[\s\S]*?}/);
                        
      if (jsonMatch) {
        try {
          const analysisJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          logger.info(`Market analysis complete: ${analysisJson.recommendation} (confidence: ${analysisJson.confidence})`);
          return analysisJson;
        } catch (e) {
          logger.error(`Failed to parse analysis JSON: ${e.message}`);
        }
      }
      
      logger.error('Failed to extract valid JSON from analysis result');
      return { confidence: 0, recommendation: 'HOLD', reason: 'Analysis format error' };
    } catch (error) {
      logger.error(`Market analysis error: ${error.message}`);
      return { confidence: 0, recommendation: 'HOLD', reason: 'Analysis error' };
    }
  }
}

// Secure wallet operation that requires attestation
class SecureWallet {
  constructor(verifier) {
    this.verifier = verifier;
    this.wallet = null;
  }
  
  // Initialize wallet from environment variable only if attestation is verified
  async initialize() {
    if (!this.verifier.isVerified()) {
      const verified = await this.verifier.loadAndVerify();
      if (!verified) {
        logger.error('Cannot initialize wallet: attestation not verified');
        return false;
      }
    }
    
    try {
      const privateKey = process.env.WALLET_PRIVATE_KEY;
      if (!privateKey) {
        logger.error('WALLET_PRIVATE_KEY environment variable not set');
        return false;
      }
      
      // Create wallet instance
      this.wallet = new ethers.Wallet(privateKey);
      logger.info(`Wallet initialized: ${this.wallet.address}`);
      return true;
    } catch (error) {
      logger.error(`Wallet initialization error: ${error.message}`);
      return false;
    }
  }
  
  // Sign a transaction
  async signTransaction(transaction) {
    if (!this.wallet) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Wallet not initialized');
      }
    }
    
    try {
      // Sign the transaction
      const signedTx = await this.wallet.signTransaction(transaction);
      
      // Log a hash of the signed transaction for audit purposes
      const txHash = crypto.createHash('sha256').update(signedTx).digest('hex');
      logger.info(`Signed transaction with hash: ${txHash}`);
      
      return signedTx;
    } catch (error) {
      logger.error(`Transaction signing error: ${error.message}`);
      throw error;
    }
  }
  
  // Get wallet address
  getAddress() {
    return this.wallet ? this.wallet.address : null;
  }
}

// Main agent class
class SecureAgent {
  constructor() {
    this.verifier = new AttestationVerifier(config.attestationFile);
    this.apiClient = null;
    this.wallet = null;
    this.analyzer = new MarketAnalyzer();
    this.running = false;
  }
  
  // Initialize the agent
  async initialize() {
    logger.info('Initializing secure agent');
    
    // Verify attestation
    const verified = await this.verifier.loadAndVerify();
    if (!verified) {
      logger.error('Failed to verify attestation, agent cannot start');
      return false;
    }
    
    // Initialize components
    this.apiClient = new SecureAPIClient(this.verifier);
    this.wallet = new SecureWallet(this.verifier);
    
    const walletInitialized = await this.wallet.initialize();
    if (!walletInitialized) {
      logger.error('Failed to initialize wallet');
      return false;
    }
    
    const analyzerInitialized = await this.analyzer.initialize();
    if (!analyzerInitialized) {
      logger.warn('Market analyzer not initialized, continuing with limited functionality');
    }
    
    logger.info('Agent initialized successfully');
    return true;
  }
  
  // Start the agent's main loop
  async start() {
    if (this.running) {
      logger.info('Agent is already running');
      return;
    }
    
    const initialized = await this.initialize();
    if (!initialized) {
      logger.error('Agent initialization failed, cannot start');
      return;
    }
    
    this.running = true;
    logger.info('Agent started');
    
    // Schedule regular checks
    this.scheduleNextCheck();
  }
  
  // Schedule the next market check
  scheduleNextCheck() {
    if (!this.running) return;
    
    setTimeout(async () => {
      try {
        await this.performMarketCheck();
      } catch (error) {
        logger.error(`Market check error: ${error.message}`);
      }
      
      // Re-verify attestation periodically
      if (Math.random() < 0.2) { // 20% chance on each cycle
        try {
          await this.verifier.loadAndVerify();
        } catch (error) {
          logger.error(`Attestation re-verification error: ${error.message}`);
        }
      }
      
      this.scheduleNextCheck();
    }, config.requestInterval);
  }
  
  // Perform a market check and take action if needed
  async performMarketCheck() {
    logger.info('Performing market check');
    
    try {
      // Get market data for a cryptocurrency pair
      const marketData = await this.apiClient.getMarketData('ETH-USD');
      logger.debug(`Received market data: ${JSON.stringify(marketData)}`);
      
      // Analyze data
      const analysis = await this.analyzer.analyzeMarketData(marketData);
      
      // Take action based on analysis with sufficient confidence
      if (analysis.confidence >= config.requiredConfidence) {
        logger.info(`Taking action: ${analysis.recommendation} based on analysis (confidence: ${analysis.confidence})`);
        
        if (analysis.recommendation === 'BUY' || analysis.recommendation === 'SELL') {
          await this.executeTradeRecommendation(analysis.recommendation, marketData);
        }
      } else {
        logger.info(`No action taken: confidence (${analysis.confidence}) below threshold (${config.requiredConfidence})`);
      }
    } catch (error) {
      logger.error(`Market check failed: ${error.message}`);
    }
  }
  
  // Execute a trade based on recommendation
  async executeTradeRecommendation(recommendation, marketData) {
    try {
      // Create a mock transaction for demonstration
      const transaction = {
        to: "0xTargetAddress",
        value: ethers.parseEther("0.1"),
        gasLimit: 21000,
        maxFeePerGas: ethers.parseUnits("20", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        nonce: 1, // This should be retrieved dynamically in a real implementation
        type: 2,
        chainId: 1, // Ethereum mainnet
        action: recommendation,
        price: marketData.price,
      };
      
      // Sign the transaction
      const signedTx = await this.wallet.signTransaction(transaction);
      
      // Submit the transaction
      const result = await this.apiClient.submitTransaction(signedTx);
      logger.info(`Transaction submitted: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.error(`Trade execution error: ${error.message}`);
    }
  }
  
  // Stop the agent
  stop() {
    logger.info('Stopping agent');
    this.running = false;
  }
}

// Run the agent
const runAgent = async () => {
  logger.info('Starting secure agent with attestation');
  
  try {
    const agent = new SecureAgent();
    await agent.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down');
      agent.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down');
      agent.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error(`Agent error: ${error.message}`);
    process.exit(1);
  }
};

// Run the agent if this file is executed directly
if (require.main === module) {
  runAgent();
}

// Export classes for testing/importing
module.exports = {
  AttestationVerifier,
  SecureAPIClient,
  MarketAnalyzer,
  SecureWallet,
  SecureAgent,
  config,
  logger
}; 