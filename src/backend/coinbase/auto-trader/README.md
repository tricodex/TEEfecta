# 4g3n7 Auto Trader: Marlin Oyster CVM Deployment

This folder contains tools and scripts for deploying the 4g3n7 Auto Trader application in a Trusted Execution Environment (TEE) using Marlin Oyster Confidential Virtual Machines (CVMs).

## Overview

4g3n7 Auto Trader is a secure trading application that leverages TEEs to ensure user data remains secure while executing trading algorithms. The core system combines:

- **Two-Tier Architecture**: A minimal attestation service runs in Marlin CVM while the full trading engine operates on a traditional server
- **Dual Agent Framework**: Traditional trading agent works alongside an AgentKit-enhanced agent for complementary capabilities
- **Transparent Memory System**: All trading decisions and analyses are recorded using RecallMemoryManager for audit trails
- **Verifiable Code Execution**: Marlin's CVM enables users to verify that the exact intended code is running securely
- **Cryptographic Trust Chain**: PCR verification ensures integrity from hardware to application layer

## Architecture

Our deployment uses a two-tier architecture:
1. **Attestation Service (Marlin CVM)**: 
   - Minimal service that provides cryptographic proof of integrity
   - PCR verification to ensure platform security
   - Runs in the Trusted Execution Environment
   - Defined in `minimal-docker-compose.yml`:
     ```yaml
     services:
       auto-trader:
         image: cyama/auto-trader:latest
         network_mode: host
         restart: unless-stopped
         command: sh -c "echo 'Server starting on port 3222' && node -e \"const http=require('http');const server=http.createServer((req,res)=>{res.writeHead(200);res.end('4g3n7 AutoTrader Running on CVM!');});server.listen(3222,'0.0.0.0',()=>console.log('Server running at http://0.0.0.0:3222/'));\""
         environment:
           - NODE_ENV=production
           - ENABLE_ATTESTATION=true
     ```

2. **Backend Server (Traditional VPS)**:
   - Verifies attestation from Marlin CVM before performing sensitive operations
   - Implements full trading engine with LLM integration
   - Provides WebSocket server for real-time client updates
   - Serves as bridge between frontend and attestation service

## Successful Deployment

We've successfully deployed our attestation service on the Arbitrum network using ARM64 instances (c7g.xlarge). The deployment process is documented in:
- `FINAL_VERIFICATION_REPORT.md`: Confirmation of successful attestation verification
- `MARLIN_DEPLOYMENT_REPORT.md`: Details of the deployment process
- `E2E_TEST_REPORT.md`: End-to-end testing results

The deployment includes:
1. A minimal Docker Compose configuration focused on attestation testing
2. ARM64-specific PCR value verification
3. User data digest verification to ensure the integrity of the deployed code

## Core Files for Deployment

### Deployment Scripts

- `minimal-deploy.sh`: Deploys the minimal attestation service to Arbitrum
  - Checks for required environment variables
  - Computes and verifies Docker Compose digest
  - Handles deployment to Marlin network

- `arbitrum-attestation.sh`: Verifies attestation on the deployed CVM
  - PCR verification with ARM64 presets
  - Validation of Docker digest values
  - Generation of attestation data for agent consumption

- `deploy-24h-attestation.sh`: Deploys a service that runs for 24 hours with attestation

### Attestation Files

- `agent-attestation.js`: Verifies attestation data for Marlin CVM
  - Uses expected PCR values for ARM64 instances
  - Implements functions to load and validate attestation data
  - Security checks for attestation freshness

- `verify-agent-attestation.js`: Handles verification of agent attestation
  - Validation of PCR values against known good values
  - Signature verification
  - Timestamp validation for attestation freshness

- `offline-attestation-verification.js`: Provides offline verification of attestation data
  - Verifies PCR values without requiring connection to enclave
  - Validates attestation signatures
  - Generates verification reports for audit purposes

## WebSocket Implementation

Our WebSocket implementation provides real-time trading updates with attestation verification:

### Backend WebSocket Server

```javascript
// Server configuration
this.io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});
```

The WebSocket server:
- Broadcasts trading events (start, complete, error)
- Shares analysis events (market data, decision points)
- Reports system events (attestation status, health checks)
- Verifies all data comes from attested environments

## Verification Process

The attestation verification ensures:
1. PCR values match expected values for ARM64 instances
2. Docker Compose digest verification to prevent tampering
3. Continuous verification to maintain security over time
4. Attestation freshness (rejects attestations older than 24 hours)

### PCR Measurements (ARM64)

The expected PCR measurements for ARM64 instances have been verified:

| PCR | Value | Status |
|-----|-------|--------|
| PCR0 | 0d8c50f0d0e9ecf25c48ba9ed1d8d5dc475be1dba553a0ef299f385bd7447220 | ✅ Verified |
| PCR1 | d71f06f25bcd891848eecfcd65688831d9acf4be17da631b15fb5b1ecd7c3d23 | ✅ Verified |
| PCR2 | bd79abe09f36d95bb28c08d6f9d758c3bddebc6aa634b8c65cbae4b4b54a4146 | ✅ Verified |

## Integration Components

### LLM Integration

- Google Gemini 2.0 Flash model for market analysis and trading decisions
- Optional Azure OpenAI integration as fallback
- LangChain framework for structured agent reasoning
- Service interface abstraction to switch between providers

### AgentKit Integration

Our implementation leverages AgentKit's capabilities with multiple action providers:
- walletActionProvider for wallet management
- erc20ActionProvider for token operations
- cdpApiActionProvider and cdpWalletActionProvider for Coinbase integration
- wethActionProvider, defillamaActionProvider for market data

### Memory Management

- RecallMemoryManager as common memory layer for both agent types
- Transparent record-keeping of agent actions and analyses
- Shared memory context between agent implementations

## Getting Started

### Prerequisites

- [Marlin Oyster CVM CLI](https://docs.marlin.org/oyster/) installed
- Node.js (v16 or higher)
- Bun package manager
- Wallet with sufficient funds on Arbitrum network

### Quick Start

1. Set up your environment:
   ```bash
   export MARLIN=your_private_key
   ```

2. Deploy the attestation service:
   ```bash
   ./minimal-deploy.sh
   ```

3. Verify attestation:
   ```bash
   ./arbitrum-attestation.sh
   ```

4. Run backend with attestation integration:
   ```bash
   # Set environment variables
   export ATTESTATION_FILE=./attestation-data.json
   export ENABLE_ATTESTATION=true
   
   # Start server
   bun run start
   ```

## Integration with Backend

Our auto-trader backend integrates with this attestation service to ensure security:

1. The backend verifies attestation before performing any sensitive operations
2. WebSocket connections are established only with verified enclave instances
3. Trading decisions are only executed after verification
4. Wallet private keys are secured within the TEE

## Frontend

> **Note**: The frontend for this project is maintained in a separate repository at [https://github.com/tricodex/4g3n7-frontend](https://github.com/tricodex/4g3n7-frontend) and is not part of this codebase.

## Documentation

For more details, refer to:

- `ATTESTATION_GUIDE.md`: Complete guide to attestation
- `FINAL_VERIFICATION_REPORT.md`: Detailed report on attestation verification
- `README-attestation.md`: Documentation on the attestation module
- `ATTESTATION_SUMMARY.md`: Summary of attestation process
- `MARLIN_DEPLOYMENT_REPORT.md`: Details of deployment procedures

## Security Considerations

- Hardware-level memory encryption in TEE protects user credentials
- Transaction signing can only be performed in verified environments
- Never expose private keys in scripts or logs
- Always verify attestation before performing sensitive operations
- Use ARM64 instances for consistent PCR values
- Implement periodic re-attestation every ~5 minutes with 20% probability
- Ensure service health verification before operations