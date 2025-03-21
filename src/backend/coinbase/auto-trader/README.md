# 4g3n7: Autonomous Trading Agent

4g3n7 is a secure, privacy-preserving autonomous trading agent that combines Trusted Execution Environments (TEEs), AI, and blockchain technologies.

## Features

### Core Features
- **Secure Execution**: Runs inside Marlin Oyster Confidential Virtual Machine (CVM) for TEE protection
- **On-chain Actions**: Uses Coinbase AgentKit for wallet management and transactions
- **AI-powered**: Integrates with Azure OpenAI for intelligent trading decisions
- **Transparent History**: Stores reasoning trails on Recall Network for transparency

### Technical Stack
- TypeScript/Node.js for application logic
- Marlin Oyster CVM for Trusted Execution Environment
- Coinbase AgentKit for on-chain wallet management
- Azure OpenAI with LangChain for AI decision making
- Recall Network for transparent reasoning storage

## Setup

### Prerequisites
- Node.js 16+ and npm
- Coinbase Developer Platform (CDP) API credentials
- Azure OpenAI API credentials
- Recall Network wallet (with testnet or mainnet ETH)
- Marlin Oyster CVM CLI (for deployment)

### Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd path/to/repository
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Copy the example environment file and edit with your credentials:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

### Development

**Build the Project**
```bash
npm run build
```

**Run Locally**
```bash
npm run dev
```

**Deploy to Marlin Oyster CVM**
```bash
# First build the project
npm run build

# Deploy with wallet key for 60 minutes
npm run deploy -- --wallet-key <your-wallet-key> --duration 60
```

## API Documentation

### Endpoints

- `GET /health`: Health check endpoint
- `GET /status`: Agent status including wallet information
- `POST /analyze`: Analyze portfolio and market data
- `POST /trade`: Execute a trade
- `GET /reasoning/:decisionId`: Retrieve reasoning history for a decision

### Example Usage

**Analyze a Portfolio**

```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "portfolio": {
      "assets": [
        {"symbol": "ETH", "amount": 2.5, "value": 6250},
        {"symbol": "USDC", "amount": 5000, "value": 5000}
      ],
      "total_value": 11250
    },
    "marketData": {
      "ETH": {"price": 2500, "24h_change": 3.2},
      "BTC": {"price": 45000, "24h_change": 1.5},
      "USDC": {"price": 1, "24h_change": 0}
    }
  }'
```

## Development

### Project Structure

```
/auto-trader/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── agent/                  # Agent implementation
│   │   ├── index.ts            # Agent exports
│   │   ├── agentkit.ts         # AgentKit integration
│   │   ├── langchain.ts        # Azure AI integration
│   │   └── trading.ts          # Trading logic
│   ├── action-providers/       # Custom action providers
│   │   ├── index.ts            # Provider exports
│   │   └── recall-provider.ts  # Recall action provider
│   ├── prompts/                # AI prompts
│   │   └── trading-prompts.ts  # Trading prompts
│   ├── services/               # Supporting services
│   │   ├── storage.ts          # Storage service
│   │   └── attestation.ts      # Attestation service
│   └── server.ts               # API server
├── docker/                     # Docker deployment
│   ├── Dockerfile              # Main Dockerfile
│   ├── supervisord.conf        # Process configuration
│   └── setup.sh                # Setup script
└── scripts/                    # Deployment scripts
    ├── build.sh                # Build script
    └── deploy.sh               # Deployment script
```

## Security Considerations

- **Private Keys**: Never log or expose private keys anywhere
- **TEE Integrity**: Always verify attestations before trusting TEE data
- **API Credentials**: Protect API keys with proper environment variable security
- **Azure OpenAI**: Ensure proper data handling and prompt engineering

## License

[MIT](LICENSE)
