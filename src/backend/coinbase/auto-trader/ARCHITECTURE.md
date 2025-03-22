# Auto Trader Architecture

## System Overview

The Auto Trader is a dual-agent crypto trading system that combines a traditional trading agent with an AgentKit-based agent for enhanced trading capabilities. The system provides portfolio analysis, trade execution, and memory management for tracking decisions and trades.

## Core Components

### 1. Server Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Server                         │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  API Routes │    │ Middleware  │    │ WebSockets  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Coordinated Agent                       │
│                                                             │
│  ┌─────────────┐                    ┌─────────────┐        │
│  │   Primary   │                    │  AgentKit   │        │
│  │  Trading    │◄───Coordination───►│  Trading    │        │
│  │   Agent     │                    │   Agent     │        │
│  └─────────────┘                    └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supporting Services                        │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ LLM Service │    │ CDP Wallet  │    │   Recall    │     │
│  │ (Gemini)    │    │  Provider   │    │   Memory    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Agent Implementation

#### Coordinated Agent
- Acts as a facade combining the primary agent and AgentKit agent
- Delegates operations to both agents and combines their results
- Provides a unified interface for all agent operations

#### Primary Trading Agent
- Traditional implementation with direct LLM integration
- Handles wallet management and basic trading operations
- Uses Recall Network for memory persistence

#### AgentKit Trading Agent
- Uses Coinbase's AgentKit framework
- Provides enhanced on-chain capabilities
- Integrates with CDP wallet and various action providers

### 3. Wallet Management

```
┌─────────────────────────────────────────────────────────────┐
│                    Wallet Management                        │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ CDP Wallet  │    │  Encrypted  │    │  Fallback   │     │
│  │  Provider   │    │ Local Store │    │   Wallet    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **CDP Wallet Provider**: Primary wallet implementation using Coinbase Developer Platform
- **Encrypted Local Store**: Secure database for persisting wallet information
- **Fallback Wallet**: Ethers.js-based wallet used when CDP is unavailable

### 4. Memory Management

- Uses Recall Network for persistent memory
- Stores portfolio analysis, trade executions, and agent reasoning
- Enables collaborative agent communication

## Data Flow

### 1. Portfolio Analysis Flow

```
┌─────────┐     ┌───────────┐     ┌────────────┐     ┌────────┐
│ User/API │────►   Agent   │────►  LLM Query  │────►  Recall │
│ Request  │     │ Processor │     │            │     │ Memory │
└─────────┘     └───────────┘     └────────────┘     └────────┘
                      │                  ▲
                      │                  │
                      ▼                  │
                ┌──────────┐      ┌─────────────┐
                │ AgentKit │─────►│  Combined   │
                │ Analysis │      │  Analysis   │
                └──────────┘      └─────────────┘
```

1. User sends portfolio data via API
2. Agent processor receives request
3. Primary agent performs LLM-based analysis
4. AgentKit agent performs parallel analysis
5. Results are combined and stored in Recall
6. Combined analysis returned to user

### 2. Trade Execution Flow

```
┌─────────┐     ┌───────────┐     ┌────────────┐     ┌────────┐
│ User/API │────►   Agent   │────►  Trade      │────►  Recall │
│ Request  │     │ Processor │     │ Execution  │     │ Memory │
└─────────┘     └───────────┘     └────────────┘     └────────┘
                                        │
                                        │
                                        ▼
                                  ┌──────────┐
                                  │  Wallet  │
                                  │ Provider │
                                  └──────────┘
```

1. User sends trade request via API
2. Agent processor validates trade parameters
3. Agent performs trade execution (real or simulated)
4. Results stored in Recall memory
5. Trade confirmation returned to user

## Deployment Architecture

### Docker Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                         │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Auto Trader │    │  Bun.js     │    │  Node.js    │     │
│  │    App      │    │  Runtime    │    │  Modules    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Persistent Volumes                  │   │
│  │                                                      │   │
│  │   ┌────────────┐            ┌────────────────┐      │   │
│  │   │   Wallet   │            │  Config Files  │      │   │
│  │   │ Storage    │            │                │      │   │
│  │   └────────────┘            └────────────────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Container**: Based on Bun.js runtime
- **Persistent Volumes**: 
  - Wallet storage data persisted across restarts
  - Configuration files mounted from host
- **Environment Variables**: 
  - API keys and configuration passed via environment variables
  - Sensitive values managed securely

### Marlin CVM Deployment (Future)

```
┌─────────────────────────────────────────────────────────────┐
│                      Marlin CVM                             │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Auto Trader │    │   Secure    │    │ Attestation │     │
│  │    App      │    │  Enclave    │    │  Service    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Confidential Compute                 │   │
│  │                                                      │   │
│  │   ┌────────────┐            ┌────────────────┐      │   │
│  │   │  Encrypted │            │  Secure Key    │      │   │
│  │   │  Memory    │            │  Management    │      │   │
│  │   └────────────┘            └────────────────┘      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

### Critical Environment Variables

- `PORT`: Server port (default: 3222)
- `PREFERRED_LLM_PROVIDER`: LLM service to use (gemini, azure, mock)
- `GOOGLE_API_KEY`/`GEMINI_API_KEY`: API key for Gemini AI
- `ENABLE_AGENTKIT`: Whether to use AgentKit (default: true)
- `ENABLE_COLLABORATION`: Whether to use coordinated agents (default: true)
- `USE_MOCK_WALLET`: Whether to use mock wallet (default: false)
- `MNEMONIC_PHRASE`: Recovery phrase for wallet

### Wallet Configuration

- `COINBASE_CDP_KEY`: Coinbase CDP API key
- `COINBASE_CDP_SECRET`: Coinbase CDP API secret
- `CDP_NETWORK_ID`: CDP network ID (default: base-sepolia)
- `WALLET_DB_DIR`: Directory for wallet storage
- `WALLET_ENCRYPTION_KEY`: Encryption key for wallet database

### Recall Network Configuration

- `RECALL_PRIVATE_KEY`: Private key for Recall Network
- `RECALL_BUCKET_ALIAS`: Bucket alias for memory storage
- `RECALL_NETWORK`: Network for Recall (testnet or mainnet)

## Technology Stack

- **Runtime**: Bun.js
- **Framework**: Express.js
- **AI Services**: Google Gemini AI (2.0-flash model)
- **Blockchain**: Ethereum (Sepolia and Base Sepolia testnets)
- **Memory**: Recall Network
- **Wallet**: Coinbase CDP and ethers.js
- **Container**: Docker
- **TEE**: Marlin CVM (future)

## Security Considerations

- Wallet private keys never exposed in logs or API responses
- Encrypted local storage for wallet data
- Environment variables for sensitive configuration
- API key rotation recommended
- No hardcoded secrets

## Future Enhancements

- Full Marlin CVM integration for secure execution
- Enhanced swap functionality with real on-chain transactions
- Additional action providers for expanded capabilities
- WebSocket support for real-time updates
- Autonomous trading mode improvements

## Failure Modes and Recovery

- **CDP Wallet Failure**: Falls back to ethers.js wallet
- **LLM Service Error**: Falls back to mock responses
- **Memory Service Error**: Uses local memory with warning
- **Transaction Error**: Provides verbose error details and simulates transactions 