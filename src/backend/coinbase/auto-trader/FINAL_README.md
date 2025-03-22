# 4g3n7 - Secure, Transparent Trading Agent

4g3n7 is an autonomous trading agent that uses dual-agent architecture, Trusted Execution Environments (TEEs), and transparent memory storage for secure and verifiable crypto trading.

## Key Features

- **Dual-Agent Architecture**: Combines traditional and AgentKit-based agents
- **Trusted Execution**: Runs in Marlin Oyster CVM for secure computation
- **Transparent Memory**: Stores all decisions on Recall Network
- **Attestation Verification**: Enables trust through cryptographic verification

## Requirements

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Docker](https://www.docker.com/) - For containerization
- [Marlin Oyster CVM](https://docs.marlin.org/docs/oyster/) - For deploying to TEEs

## Project Setup

### 1. Install Dependencies

```bash
# Clone repository if needed
git clone <repository-url>
cd /path/to/repo

# Install dependencies
bun install

# Install Recall Network SDK if needed
bun add @recallnet/sdk @recallnet/chains viem
```

### 2. Configure Environment

Copy the example environment file and update it with your credentials:

```bash
cp .env.example .env
```

Configure the following key environment variables:

```bash
# Agent Configuration
ENABLE_AGENTKIT=true
ENABLE_COLLABORATION=true
PREFERRED_LLM_PROVIDER=azure  # or gemini

# Recall Network
RECALL_PRIVATE_KEY=your_recall_private_key_here
RECALL_BUCKET_ALIAS=4g3n7-agent
RECALL_NETWORK=testnet

# CDP Configuration
COINBASE_CDP_KEY=your_cdp_key_here
COINBASE_CDP_SECRET=your_cdp_secret_here
CDP_NETWORK_ID=base-sepolia

# LLM Provider (either Azure or Gemini)
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
# Or
GEMINI_API_KEY=your_gemini_api_key_here
```

## Building and Running

### Local Development

```bash
# Build the project
bun run build

# Run the development server
bun run dev

# Run in production mode
bun run start
```

### Testing Different Agent Configurations

Test various agent configurations using our test script:

```bash
# Make test script executable
chmod +x scripts/test.sh

# Test all configurations
scripts/test.sh --mode all --agent all

# Test specific configuration
scripts/test.sh --mode local --agent traditional
scripts/test.sh --mode local --agent agentkit
scripts/test.sh --mode local --agent coordinated
```

### Docker Deployment

Build and run with Docker:

```bash
# Build Docker image
scripts/build.sh

# Run locally with Docker
docker run -p 3000:3000 4g3n7-auto-trader:latest
```

### Marlin Oyster CVM Deployment

Deploy to Marlin Oyster CVM for secure execution:

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Deploy to Marlin CVM (replace with your wallet key)
scripts/deploy.sh --wallet-key your_wallet_private_key --duration 60
```

## Architecture

The 4g3n7 system consists of these key components:

1. **Dual-Agent Framework**: Coordinates between traditional and AgentKit agents
2. **Recall Memory System**: Transparently stores all decisions and reasoning
3. **Trusted Execution Environment**: Ensures secure, tamper-proof execution
4. **Attestation Verification**: Cryptographically verifies the execution environment

## Documentation

For more detailed information, see these guides:

- [Getting Started Guide](GETTING_STARTED.md): Quick start guide
- [Marlin Deployment Guide](MARLIN_DEPLOYMENT.md): Detailed Marlin CVM deployment
- [Attestation Verification Guide](ATTESTATION_VERIFICATION.md): In-depth attestation verification 
- [Recall Memory Guide](RECALL_MEMORY_GUIDE.md): Recall Network integration
- [Dual Agent Framework](DUAL_AGENT_INTEGRATION.md): Dual-agent architecture details

## API Endpoints

- `GET /health`: Health check endpoint
- `POST /api/analyze`: Analyze a portfolio
- `POST /api/trade`: Execute a trade
- `GET /api/history/:decisionId`: Get decision reasoning history
- `GET /api/attestation`: Get attestation verification

## Security Considerations

- **Private Keys**: Never commit private keys to version control
- **Regular Attestation**: Periodically verify the enclave's integrity
- **Access Control**: Implement authentication for production APIs
- **Memory Backup**: Maintain backups of memory indexes

## Troubleshooting

Common issues and solutions:

1. **Missing Dependencies**:
   ```bash
   bun add @recallnet/sdk @recallnet/chains viem
   ```

2. **Build Errors**:
   ```bash
   # Clean the build directory
   bun run clean
   # Build again
   bun run build
   ```

3. **Docker Issues**:
   - Ensure Docker is running
   - Check Docker logs: `docker logs <container-id>`

4. **Marlin CVM Issues**:
   - Verify you have sufficient funds for deployment
   - Check attestation with: `oyster-cvm verify --enclave-ip <ip>`

## License

[Insert your license information here]
