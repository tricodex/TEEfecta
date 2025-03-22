# Auto Trader

An autonomous trading agent that analyzes market data and executes trades on behalf of users. This component is part of the TEEfecta Marlin CVM deployment.

## Features

- AI-powered trade analysis and execution
- Real-time market data integration
- WebSocket-based real-time client updates
- In-memory and persistent storage options
- Docker-based deployment

## Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Bun](https://bun.sh/docs/installation) (for local development)
- [Coinbase API credentials](https://docs.cloud.coinbase.com/exchange/docs/auth)
- [Google Gemini API key](https://ai.google.dev/docs/gemini-api/setup)

## Getting Started

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
# Server configuration
PORT=3222
NODE_ENV=production

# Feature flags
ENABLE_AGENTKIT=true
ENABLE_COLLABORATION=true
USE_MOCK_WALLET=false
USE_MOCK_SEARCH=false

# LLM configuration
PREFERRED_LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key

# Storage configuration
RECALL_MEMORY_MODE=in-memory
```

### Docker Setup

We provide several helper scripts to manage your Docker deployment:

#### 1. Build and Run Container

```bash
./run-docker.sh
```

This script will:
- Build the Docker image
- Create necessary data directories
- Start the container with appropriate port mappings

#### 2. Check Docker Health

```bash
./docker-health-check.sh
```

This script checks:
- If Docker is running
- If the container exists and is running
- Port mappings are correct
- Service health status
- Required environment variables

### Local Development

For local development without Docker:

1. Install dependencies:
```bash
bun install
```

2. Start the development server:
```bash
bun run src/index.ts
```

The server will be available at `http://localhost:3222`.

## WebSocket API

The Auto Trader exposes a WebSocket API for real-time updates. Connect to `ws://localhost:3222/ws` to receive the following events:

- `llm_prompt`: When an LLM prompt is sent
- `llm_response`: When an LLM response is received
- `autonomous_started`: When autonomous trading begins
- `autonomous_stopped`: When autonomous trading ends
- `cycle_started`: When a trading cycle begins
- `cycle_completed`: When a trading cycle completes
- `cycle_error`: When a trading cycle encounters an error
- `analysis_started`: When market analysis begins
- `analysis_completed`: When market analysis completes
- `trade_started`: When a trade is initiated
- `trade_completed`: When a trade is completed
- `no_trade_decision`: When analysis results in no trade
- Various task events (`task_queued`, `task_started`, etc.)

## Architecture

The Auto Trader consists of:

1. **Trading Agent**: Analyzes market data and makes trading decisions
2. **Memory Manager**: Stores agent state and historical data
3. **Execution Engine**: Interfaces with exchange APIs to execute trades
4. **WebSocket Server**: Provides real-time updates to clients

## Troubleshooting

### Common Issues

1. **Container fails to start**
   - Check logs with `docker logs auto-trader`
   - Verify port 3222 is not in use by another application
   - Ensure your `.env` file exists and contains required variables

2. **WebSocket connection issues**
   - Check if the container is running with `docker ps`
   - Verify port mappings with `docker port auto-trader`
   - Test the health endpoint at `http://localhost:3222/health`

3. **Memory issues**
   - By default, we use in-memory storage. For persistent storage, set `RECALL_MEMORY_MODE=persistent` in your `.env` file

## License

This project is part of the TEEfecta Marlin CVM deployment and is subject to its licensing terms.