# 4g3n7: Secure Autonomous Trading Agent

4g3n7 is an advanced autonomous trading agent system that implements a dual-agent architecture in a Trusted Execution Environment (TEE) using Marlin Oyster CVM, with transparent memory storage via Recall Network.

## Features

- **Dual-Agent Architecture**: Combines a traditional agent and an AgentKit-based agent for enhanced trading decisions
- **Marlin Oyster CVM Integration**: Secure computation in a Trusted Execution Environment
- **Recall Network Integration**: Transparent memory storage for all decisions and reasoning
- **Configurable Agents**: Use traditional agent, AgentKit agent, or a coordinated approach
- **Multiple LLM Support**: Works with Azure OpenAI, Google Gemini, or a fallback mock implementation
- **Secure Attestation**: Cryptographic verification of the execution environment
- **Autonomous Trading**: Optional autonomous trading with configurable risk levels

## Setup

### Prerequisites

- Node.js 18+
- Bun 1.0+
- Marlin oyster-cvm CLI
- Recall CLI (optional, for direct interaction with Recall Network)
- CDP API key (for production deployment)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd /path/to/repo
   bun install
   ```
3. Create a `.env` file based on `.env.example`
4. Build the application:
   ```bash
   bash scripts/build-ncheck.sh
   ```

### Development

Run the application in development mode:

```bash
bun run dev
```

### Testing

Test the application components:

```bash
# Test basic functionality
bun run src/test-agent.ts

# Run all tests
bun test
```

## Deployment

### Local Deployment

```bash
# Build the application
bash scripts/build.sh

# Run the application
bun start
```

### Marlin CVM Deployment

```bash
# Deploy to Marlin (requires wallet private key)
bash scripts/deploy.sh --wallet-key your_wallet_private_key --duration 60
```

### Verification

After deployment, verify the attestation:

```bash
bash scripts/verify-attestation.sh --ip <enclave-ip> --test
```

## Configuration

The application can be configured through environment variables:

- `ENABLE_AGENTKIT`: Enable AgentKit integration (true/false)
- `ENABLE_COLLABORATION`: Enable collaboration between agents (true/false)
- `PREFERRED_LLM_PROVIDER`: LLM provider (azure/gemini/mock)
- `RECALL_PRIVATE_KEY`: Private key for Recall Network
- `RECALL_BUCKET_ALIAS`: Bucket alias for Recall Network
- `MARLIN_ENCLAVE`: Set to true when running inside Marlin enclave
- `ENABLE_AUTONOMOUS_MODE`: Enable autonomous trading
- `RISK_LEVEL`: Trading risk level (low/medium/high)

## Architecture

### Core Components

- **Traditional Agent**: Implements direct LLM integration
- **AgentKit Agent**: Implements Coinbase's AgentKit for enhanced DeFi capabilities
- **Coordinated Agent**: Combines insights from both agents
- **Recall Memory Manager**: Transparent storage of decisions
- **Attestation Service**: Verification of the TEE environment

### Key Files

- `src/index.ts`: Main application entry point
- `src/agent/index.ts`: Agent interface definition
- `src/agent/coordination-agent.ts`: Coordination between agents
- `src/services/recall-memory.ts`: Recall Network memory manager
- `src/services/attestation.ts`: Marlin attestation verification
- `docker/Dockerfile`: Docker container definition
- `scripts/deploy.sh`: Marlin deployment script

## Troubleshooting

### Common Issues

- **Recall Network Connection**: Ensure the private key is valid and has sufficient credits
- **AgentKit Initialization**: Check CDP API key and network settings
- **LLM Services**: Verify API keys for Azure or Google Gemini
- **Marlin Deployment**: Check for valid wallet key with sufficient funds

### Logs

Access logs at:

- `autotrader.log`: Main application log
- `autotrader_coordinated.log`: Coordinated agent log

## License

This project is licensed under the ISC License.