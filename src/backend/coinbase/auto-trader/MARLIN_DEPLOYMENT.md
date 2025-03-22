# Marlin Oyster CVM Deployment Guide

This guide provides step-by-step instructions for deploying the 4g3n7 dual-agent trading system to Marlin Oyster CVM with proper attestation verification and transparent memory storage via Recall Network.

## Prerequisites

- Marlin Oyster CVM CLI tool installed (`oyster-cvm`)
- Wallet with USDC and ETH on Arbitrum One network
- Recall Network private key for memory storage
- Coinbase CDP API credentials

## 1. Environment Configuration

Create a secure `.env` file for production deployment:

```bash
# Agent configuration
ENABLE_AGENTKIT=true
ENABLE_COLLABORATION=true
PREFERRED_LLM_PROVIDER=azure  # or gemini
AUTONOMOUS_INTERVAL_MINUTES=60
RISK_LEVEL=medium

# Marlin CVM
MARLIN_ENCLAVE=true

# CDP credentials
CDP_API_KEY_NAME=your_cdp_api_key_name
CDP_API_KEY_PRIVATE_KEY=your_cdp_api_private_key
CDP_NETWORK_ID=base-sepolia  # or base-mainnet

# Recall Network
RECALL_PRIVATE_KEY=your_recall_private_key
RECALL_BUCKET_ALIAS=4g3n7-production
RECALL_NETWORK=testnet  # or mainnet

# Other credentials as needed
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_API_DEPLOYMENT_NAME=your_deployment_name
```

## 2. Building the Docker Image

### 2.1 Prepare Docker Compose File

Create `docker-compose.yml` in the project root:

```yaml
services:
  4g3n7-agent:
    build: .
    image: 4g3n7-agent:latest
    init: true
    network_mode: host
    restart: unless-stopped
    environment:
      - MARLIN_ENCLAVE=true
      - PORT=3300
      - NODE_ENV=production
      # Other env vars are loaded from the .env file inside the Docker image
```

### 2.2 Verify Docker Configuration

Review the `docker/Dockerfile` to ensure it:

1. Copies the `.env` file
2. Installs all necessary dependencies
3. Sets up Node.js runtime
4. Configures proper supervisord.conf

Ensure supervisord.conf has proper configuration for:
- Attestation server proxy
- Agent API proxy
- Proper port exposures

## 3. Deployment Steps

### 3.1 Build and Test Locally

```bash
# Build app
npm run build

# Test locally with Marlin enclave flag
MARLIN_ENCLAVE=true npm start
```

### 3.2 Deploy to Marlin CVM

```bash
# Deploy with oyster-cvm (replace with your private key)
oyster-cvm deploy --wallet-private-key <your_wallet_private_key> --duration-in-minutes 60 --docker-compose docker-compose.yml
```

The deployment will output:
- IP address of the enclave
- PCR values for verification
- Computed digest value

**Save these values for verification!**

## 4. Verify Attestation

### 4.1 Use Oyster CVM Verify Command

```bash
oyster-cvm verify --enclave-ip <ip> --user-data <digest> --pcr-preset base/blue/v1.0.0/arm64
```

For custom PCR verification:

```bash
oyster-cvm verify --enclave-ip <ip> --user-data <digest> --pcr0 <pcr0> --pcr1 <pcr1> --pcr2 <pcr2>
```

### 4.2 Integrate with Frontend

If you have a frontend application, integrate the attestation verification by:

1. Requesting attestation data from the enclave
2. Verifying PCR values match expected values
3. Confirming the running code hash matches expected digest

## 5. Verify Recall Network Integration

### 5.1 Test Memory Storage

Send a test analysis request to the API:

```bash
curl -X POST http://<enclave-ip>:3300/api/analyze -H 'Content-Type: application/json' -d '{
  "portfolio": {
    "assets": {
      "ETH": { "amount": 2.5, "value": 7500 },
      "USDC": { "amount": 5000, "value": 5000 }
    }
  },
  "marketData": {
    "ETH": { "price": 3000, "change24h": 2.5 },
    "USDC": { "price": 1, "change24h": 0 }
  }
}'
```

### 5.2 Verify Memory Entry

Use the Recall CLI to verify the entry was stored:

```bash
recall bucket query --address <bucket-address> --prefix reasoning/
```

## 6. Monitoring and Management

### 6.1 Verify Running Status

```bash
# List active jobs
oyster-cvm list --address <your-wallet-address>
```

### 6.2 View Logs

```bash
# Stream logs from the enclave
oyster-cvm logs --job-id <job-id>
```

### 6.3 Extend Running Time

To add more funds and extend the duration:

```bash
oyster-cvm deposit --wallet-private-key <key> --job-id <job-id> --amount 20000
```

### 6.4 Stop the Instance

```bash
oyster-cvm stop --wallet-private-key <key> --job-id <job-id>
```

## 7. Security Considerations

- **API Access Control**: Implement proper authentication for API endpoints
- **Private Key Protection**: Never expose private keys in logs or API responses
- **Regular Verification**: Periodically verify attestation to ensure integrity
- **Recall Network Access**: Restrict access to the Recall bucket

## 8. Troubleshooting

### Common Issues:

1. **Attestation Failure**: 
   - Verify the PCR values match the expected values
   - Check if the enclave is running properly
   - Ensure the correct digest was used

2. **Recall Network Issues**:
   - Verify the private key is correct
   - Check bucket permissions
   - Ensure network connectivity to Recall Network

3. **Agent Initialization Error**:
   - Check CDP API credentials
   - Verify LLM provider configuration
   - Check for any missing environment variables

By following this guide, you'll be able to deploy the 4g3n7 dual-agent system to Marlin Oyster CVM with proper attestation verification and transparent memory storage via Recall Network.
