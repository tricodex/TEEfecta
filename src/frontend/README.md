# 4g3n7 Auto Trader Frontend

Frontend application for the 4g3n7 Auto Trader with CVM Agents.

## Features

- Real-time trading interface
- Portfolio analysis
- Trade execution
- Attestation verification
- Recall memory logs
- WebSocket real-time updates

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/4g3n7.git
cd 4g3n7/src/frontend

# Install dependencies
bun install
```

## Development

```bash
# Start development server
bun run dev
```

## Building for production

```bash
# Build for production
bun run build

# Start production server
bun run start
```

## Testing

### End-to-End Testing

The frontend uses Cypress for end-to-end testing. To run the tests:

```bash
# Run Cypress tests in headless mode
bun run test:e2e

# Open Cypress test runner
bun run test:e2e:open
```

### API Alignment Testing

To verify that the frontend is correctly aligned with the backend API:

```bash
# Start the backend server first
cd ../backend/coinbase/auto-trader
./start-server.sh

# In another terminal, run the API alignment test
cd ../../../frontend
bun run test:api
```

The alignment test will verify that all required API endpoints are available and functioning correctly.

## Architecture

The frontend is built with:

- React for UI components
- Chakra UI for styling
- React Router for navigation
- WebSockets for real-time communication
- Cypress for testing

## Component Structure

- Core components (App, DashboardLayout, WebSocketProvider)
- Agent interaction components (AgentTerminals, AttestationTerminal, RecallMemoryViewer)
- Trading components (TradingInterface, PortfolioCard, TradeForm, etc.)
- Service layer for API communication

## Deployment

The frontend can be deployed to any static hosting service or integrated into a Next.js application.

## License

MIT

## E2E Integration with Marlin CVM

The frontend is fully integrated with the backend running on the Marlin Confidential Virtual Machine (CVM). This integration provides:

- **Secure Attestation**: Real-time verification of the backend's trusted execution environment
- **Direct API Communication**: All API calls communicate directly with the verified backend
- **WebSocket Events**: Live event streaming from the secure backend
- **End-to-End Security**: No mock implementations in production use

To run the frontend connected to the Marlin CVM instance:

```bash
# Install dependencies
bun install

# Start the frontend
bun run dev
```

The frontend will automatically connect to the Marlin CVM instance at `http://203.0.113.42:3222`. 