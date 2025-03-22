# 4g3n7 Getting Started Guide

This guide provides step-by-step instructions for deploying and using the 4g3n7 dual-agent trading system with Marlin Oyster CVM and Recall Network integration.

## Overview

4g3n7 is an autonomous crypto trading agent that:

1. Uses a dual-agent architecture with traditional and AgentKit implementations
2. Runs in a Trusted Execution Environment (TEE) via Marlin Oyster CVM
3. Stores all decisions transparently using Recall Network
4. Provides verifiable attestation for trustworthy operation

## Quick Start

Follow these steps to get the system up and running:

### 1. Prerequisites

Install the required dependencies:

```bash
# Install Node.js dependencies
npm install

# Install Marlin Oyster CVM CLI
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_linux_amd64 -O /usr/local/bin/oyster-cvm
sudo chmod +x /usr/local/bin/oyster-cvm

# Verify installation
oyster-cvm --version
```

### 2. Configure Environment

Create a `.env` file with your credentials:

```bash
# Copy example environment file
cp .env.example .env

# Edit the file with your credentials
nano .env
```

Configure these critical environment variables:

```bash
# Agent Configuration
ENABLE_AGENTKIT=true
ENABLE_COLLABORATION=true
PREFERRED_LLM_PROVIDER=azure  # or gemini

# Recall Network
RECALL_PRIVATE_KEY=your_recall_private_key
RECALL_BUCKET_ALIAS=4g3n7-agent
RECALL_NETWORK=testnet

# CDP Configuration
CDP_API_KEY_NAME=your_cdp_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_api_private_key
CDP_NETWORK_ID=base-sepolia

# LLM Provider (either Azure or Gemini)
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_API_DEPLOYMENT_NAME=gpt-4o
# Or
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Test Locally

Build and run the agent locally:

```bash
# Build the application
npm run build

# Run with the traditional agent only
ENABLE_AGENTKIT=false npm start

# Run with AgentKit only
ENABLE_AGENTKIT=true ENABLE_COLLABORATION=false npm start

# Run with coordinated dual-agent
ENABLE_AGENTKIT=true ENABLE_COLLABORATION=true npm start
```

### 4. Deploy to Marlin Oyster CVM

Deploy to a secure TEE:

```bash
# Build the application
npm run build

# Deploy to Marlin CVM (replace with your private key)
oyster-cvm deploy \
  --wallet-private-key your_wallet_private_key \
  --duration-in-minutes 60 \
  --docker-compose docker-compose.yml
```

### 5. Verify Attestation

Verify the enclave is running properly:

```bash
# Verify attestation (replace with values from deployment)
oyster-cvm verify \
  --enclave-ip <ip> \
  --user-data <digest> \
  --pcr-preset base/blue/v1.0.0/arm64
```

## Using the Agent

### Analyzing a Portfolio

Send a POST request to analyze a portfolio:

```bash
curl -X POST http://<enclave-ip>:3300/api/analyze -H 'Content-Type: application/json' -d '{
  "portfolio": {
    "assets": {
      "ETH": { "amount": 1.5, "value": 4500 },
      "USDC": { "amount": 2000, "value": 2000 }
    }
  },
  "marketData": {
    "ETH": { "price": 3000, "change24h": 1.5 },
    "USDC": { "price": 1, "change24h": 0 }
  }
}'
```

### Executing a Trade

Send a POST request to execute a trade:

```bash
curl -X POST http://<enclave-ip>:3300/api/trade -H 'Content-Type: application/json' -d '{
  "tradeType": "swap",
  "fromAsset": "ETH",
  "toAsset": "USDC",
  "amount": 0.1
}'
```

### Retrieving Trade History

Get the history of a specific decision:

```bash
curl http://<enclave-ip>:3300/api/history/<decision-id>
```

## Agent Configuration Options

### Agent Selection

The system supports three operation modes:

1. **Traditional Agent Only**: Uses direct LLM integration
   ```
   ENABLE_AGENTKIT=false
   ```

2. **AgentKit Agent Only**: Uses Coinbase AgentKit for enhanced DeFi capabilities
   ```
   ENABLE_AGENTKIT=true
   ENABLE_COLLABORATION=false
   ```

3. **Coordinated Dual-Agent**: Combines insights from both agents
   ```
   ENABLE_AGENTKIT=true
   ENABLE_COLLABORATION=true
   ```

### LLM Provider Selection

Choose your preferred LLM provider:

1. **Azure OpenAI**:
   ```
   PREFERRED_LLM_PROVIDER=azure
   AZURE_OPENAI_API_KEY=your_api_key
   AZURE_OPENAI_ENDPOINT=your_endpoint
   AZURE_OPENAI_API_DEPLOYMENT_NAME=gpt-4o
   ```

2. **Google Gemini**:
   ```
   PREFERRED_LLM_PROVIDER=gemini
   GEMINI_API_KEY=your_api_key
   ```

3. **Mock LLM** (for testing):
   ```
   PREFERRED_LLM_PROVIDER=mock
   ```

### Autonomous Mode

Enable autonomous trading:

```
ENABLE_AUTONOMOUS_MODE=true
AUTONOMOUS_INTERVAL_MINUTES=60
RISK_LEVEL=medium  # low, medium, high
```

## Advanced Features

### Recall Network Memory Verification

Verify the agent's memory transparency:

```bash
# Using the Recall CLI
recall bucket query --address <bucket-address> --prefix reasoning/

# Using the agent's API
curl http://<enclave-ip>:3300/api/memory/verify/<decision-id>
```

### Attestation Monitoring

Monitor the attestation status:

```bash
# Check attestation status
curl http://<enclave-ip>:3300/api/attestation/status
```

### Log Streaming

Stream logs from the running enclave:

```bash
oyster-cvm logs --job-id <job-id>
```

## Troubleshooting

### Common Issues

1. **Missing Dependencies**:
   ```bash
   npm install @recallnet/sdk @recallnet/chains viem
   ```

2. **Attestation Verification Failure**:
   - Check PCR values match expected values
   - Verify the enclave IP is correct
   - Ensure digest matches the deployed image

3. **Memory Management Errors**:
   - Verify Recall Network private key is correct
   - Check network connection to Recall Network
   - Verify bucket permissions

4. **Agent Initialization Issues**:
   - Check CDP API credentials
   - Verify LLM provider configuration
   - Check memory manager initialization

## Architecture Reference

The 4g3n7 system uses this architecture:

```
┌──────────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│                      │     │                   │     │                  │
│    Trusted          │────▶│    Dual-Agent     │────▶│   Recall Network  │
│    Execution         │     │    Framework      │     │   Memory Storage  │
│    Environment       │     │                   │     │                  │
│    (Marlin CVM)      │     │                   │     │                  │
└──────────────────────┘     └───────────────────┘     └──────────────────┘
         │                      │           │                   │
         │                      │           │                   │
         ▼                      ▼           ▼                   ▼
┌──────────────────────┐  ┌────────────┐ ┌────────────┐  ┌──────────────────┐
│                      │  │            │ │            │  │                  │
│    Attestation       │  │ Traditional│ │  AgentKit  │  │    Transparent   │
│    Verification      │  │   Agent    │ │   Agent    │  │   Decision Trail │
│                      │  │            │ │            │  │                  │
└──────────────────────┘  └────────────┘ └────────────┘  └──────────────────┘
```

## Additional Resources

For more detailed information, see these guides:

- [Marlin Deployment Guide](MARLIN_DEPLOYMENT.md): Detailed Marlin CVM deployment instructions
- [Attestation Verification Guide](ATTESTATION_VERIFICATION.md): In-depth attestation verification documentation
- [Recall Memory Guide](RECALL_MEMORY_GUIDE.md): Guide to Recall Network memory integration
- [Dual Agent Framework](DUAL_AGENT_INTEGRATION.md): Documentation of the dual-agent architecture

## Security Considerations

Always follow these security best practices:

1. **Private Key Protection**: Never expose private keys in code or logs
2. **Regular Attestation Verification**: Periodically verify the enclave's integrity
3. **Memory Backup**: Maintain backups of memory indexes
4. **Access Control**: Implement proper authentication for API endpoints
5. **Update Dependencies**: Keep dependencies updated for security patches

## Support and Feedback

For questions, issues, or feedback:

- Create an issue in the GitHub repository
- Contact the development team at dev@example.com
- Join our Discord community at https://discord.gg/example

---

Happy trading! 🚀

*The 4g3n7 Team*
