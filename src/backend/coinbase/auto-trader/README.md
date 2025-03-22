# 4g3n7 Verified Auto Trader

An AI-powered autonomous cryptocurrency trading agent that uses real-time market data and web search to make informed trading decisions.

## Features

- 🤖 **AI-Powered Trading**: Uses Gemini 2.0 Flash for intelligent trading decisions
- 🌐 **Web Search Integration**: Utilizes Tavily API for real-time market data and news
- 💰 **Multi-Chain Support**: Works with Ethereum Sepolia and Base Sepolia testnets
- 📊 **Portfolio Analysis**: Provides detailed portfolio analysis with real-time market data
- 🔄 **Real-Time Updates**: WebSocket communication for live trade updates and notifications
- 📝 **Decision Transparency**: All trading decisions are logged with detailed reasoning
- 🔐 **Secure Wallet Integration**: Uses CDP (Coinbase Developer Platform) for secure wallet management
- 🧠 **Memory System**: Recall Network integration for permanent storage of trading decisions

## Architecture

The application consists of several key components:

1. **Trading Agent**: Core logic for trade execution and portfolio analysis
2. **LLM Services**: Integration with Gemini 2.0 Flash for decision making
3. **Web Search**: Tavily API integration for real-time market data
4. **Memory Manager**: Recall Network for storing trading decisions
5. **WebSocket Server**: Real-time communication for frontend clients
6. **API Layer**: RESTful API for agent interactions

## Prerequisites

- Node.js (v16+)
- Bun package manager
- API Keys:
  - Google AI (Gemini API)
  - Tavily API
  - Infura (for blockchain access)
  - Recall Network (optional, for memory persistence)

## Installation

1. Clone the repository
2. Install dependencies:

```bash
cd auto-trader
bun install
```

3. Copy the example environment file:

```bash
cp .env.example .env
```

4. Update the `.env` file with your API keys and configuration

## Environment Variables

```
# LLM API Keys
GOOGLE_API_KEY=your_google_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key

# Blockchain Configuration
ETHEREUM_PRIVATE_KEY=your_wallet_private_key
INFURA_API_KEY=your_infura_api_key

# Service Configuration
PORT=3200
ENABLE_WEBSOCKETS=true
ENABLE_AUTONOMOUS_MODE=false
AUTONOMOUS_INTERVAL_MINUTES=60

# Memory Configuration
RECALL_PRIVATE_KEY=your_recall_private_key
RECALL_BUCKET_ALIAS=auto-trader-memory
```

## Running the Application

### Development Mode

```bash
bun --watch src/index.ts
```

### Production Mode

```bash
bun run build
bun run start
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/wallet` | GET | Get agent wallet details |
| `/api/trade` | POST | Execute a trade |
| `/api/token-price/:symbol` | GET | Get current price for a token |
| `/api/portfolio/analyze` | POST | Analyze a portfolio |

### Trade Execution Example

```bash
curl -X POST "http://localhost:3200/api/trade" \
  -H "Content-Type: application/json" \
  -d '{
    "tradeType": "transfer",
    "fromAsset": "eth",
    "toAsset": "0x8070591331daa4b7f1e783a12b52890a6917d98d",
    "amount": 0.001
  }'
```

## WebSocket Events

Connect to the WebSocket server at `ws://localhost:3200` to receive real-time updates.

| Event | Description |
|-------|-------------|
| `trade_started` | A new trade has been initiated |
| `trade_completed` | A trade has been completed |
| `trade_failed` | A trade has failed |
| `analysis_started` | Portfolio analysis has started |
| `analysis_completed` | Portfolio analysis is complete |
| `market_update` | Market data has been updated |
| `agent_thinking` | Agent is making a decision |

## Autonomous Trading

The agent can be configured to run in autonomous mode, making trading decisions at regular intervals based on market conditions and portfolio performance.

To enable autonomous mode, set `ENABLE_AUTONOMOUS_MODE=true` in your `.env` file.

## Web Search Integration

The agent utilizes Tavily API for real-time market data and news analysis. This enhances the agent's decision-making by incorporating up-to-date information about market trends, asset performance, and relevant news.

## Project Structure

```
src/
├── index.ts                # Application entry point
├── create-agent.ts         # Agent factory
├── server.ts               # Express server setup
├── agent/                  # Trading agent implementation
│   ├── index.ts            # Agent interface
│   └── trading-agent.ts    # Main agent implementation
├── api/                    # API routes
│   ├── routes.ts           # API endpoint definitions
│   └── wallet-mock.ts      # Mock wallet for testing
├── services/               # Service implementations
│   ├── llm-service.ts      # LLM service interface
│   ├── gemini-llm.ts       # Gemini LLM implementation
│   ├── recall-memory.ts    # Recall memory manager
│   └── websocket.ts        # WebSocket service
├── prompts/                # LLM prompt templates
└── action-providers/       # Custom action providers
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

# 4G3N7 Auto Trader Test Suite

This repository contains a comprehensive test suite for the 4G3N7 Auto Trader application, which integrates with Azure OpenAI for trading analysis and Recall Network for decentralized storage.

## Overview

The test suite validates the following components:

1. **Azure OpenAI Integration** - Tests connection, error handling, and fallback mechanisms
2. **Recall Network Integration** - Tests storage, retrieval, and querying of data
3. **Integration Tests** - Tests the interaction between Azure OpenAI and Recall Network
4. **End-to-End Tests** - Full system tests with fallback handling

## Prerequisites

Before running the tests, ensure you have:

1. Bun installed (minimum version 1.2.0)
2. Environment files configured:
   - `.env` - Application environment variables
   - `.env.export` - Recall Network environment exports
   - `.env.azure` - Azure OpenAI configuration

## Installation

```bash
# Clone the repository if you haven't already
git clone <repository-url>
cd path/to/repo/src/backend/coinbase/auto-trader

# Install dependencies using Bun
bun install
```

## Environment Configuration

Create the necessary environment files:

### .env.azure

```
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com
AZURE_OPENAI_API_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2023-12-01-preview
```

### .env.export

This file should contain the Recall Network environment exports, typically generated by the Recall CLI.

## Running Tests

The test suite includes several commands for different testing scenarios:

```bash
# Run all tests
bun test-all

# Run specific test files
bun test-azure     # Azure OpenAI integration tests
bun test-recall    # Recall Network integration tests
bun test-integration   # Combined integration tests
bun test-e2e       # End-to-end tests
```

## Test Categories

### Azure OpenAI Tests

Located in `tests/azure.test.ts`, these tests verify:

- Connection to Azure OpenAI API
- Graceful handling of API errors
- Fallback mechanisms when the API is unavailable

### Recall Network Tests 

Located in `tests/recall.test.ts`, these tests verify:

- Storage of data in the Recall Network
- Retrieval of stored data
- Handling of missing data
- Listing bucket contents

### Integration Tests

Located in `tests/integration.test.ts`, these tests verify:

- Interaction between Azure OpenAI and Recall Network
- Handling of service failures
- Recovery mechanisms
- Idempotent operations

### End-to-End Tests

Located in `tests/e2e.test.ts`, these tests verify:

- Complete workflow from analysis to storage
- Fallback to mock analysis when Azure OpenAI is unavailable
- Memory storage and retrieval

## Test Design

The tests are designed to be resilient to service failures:

1. **Graceful degradation** - Tests pass even if services are unavailable, testing fallback mechanisms
2. **Idempotency** - Operations can be repeated without side effects
3. **Isolation** - Tests don't depend on the state from other tests

## Troubleshooting

### Azure OpenAI 404 Errors

If you see a "404 Resource not found" error, check:

1. That the deployment name in your `.env.azure` file matches the actual deployment in your Azure account
2. The API version is correct (recommend using `2023-12-01-preview`)
3. Your API key has access to the specified deployment

### Recall Network Errors

If you encounter Recall Network errors, check:

1. The `.env.export` file is correctly sourced
2. The bucket address is valid
3. Your environment has proper network connectivity

## Adding New Tests

To add new tests:

1. Create a new test file in the `tests` directory with the `.test.ts` extension
2. Import the necessary testing utilities from `bun:test`
3. Structure tests using `describe()` and `test()` functions
4. Add the new test to the appropriate npm script in `package.json`

## Building the Project

```bash
# Clean and build the TypeScript code
bun run clean:build

# Just build without cleaning
bun run build
```
