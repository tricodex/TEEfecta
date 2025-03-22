# Wallet Database Implementation

This module provides secure, encrypted storage for CDP wallet data with a simple API for persistence.

## Features

- **Encrypted Storage**: All wallet data is encrypted at rest using AES-256-CBC encryption
- **Agent-based Organization**: Each agent (user) gets their own storage space
- **File-based Storage**: Simple file system storage for easy deployment
- **Error Handling**: Comprehensive error handling for robustness

## Usage

```typescript
import { getWalletDB } from './db/wallet-db';

// Get the singleton instance
const walletDB = getWalletDB();

// Save wallet data
await walletDB.saveWalletData('agent-123', walletData);

// Load wallet data
const wallet = await walletDB.loadWalletData('agent-123');

// Check if wallet data exists
const exists = await walletDB.hasWalletData('agent-123');

// Delete wallet data
await walletDB.deleteWalletData('agent-123');

// List all agents with saved wallet data
const agents = await walletDB.listAgents();
```

## Configuration

The database can be configured using environment variables:

- `WALLET_DB_DIR`: Directory to store wallet data (default: 'data/wallets')
- `WALLET_ENCRYPTION_KEY`: Key used for encryption (default: a placeholder key - change in production)

## Security Considerations

- The encryption key should be set via environment variable in production
- Access to the data directory should be restricted 
- For production, consider using a dedicated secure storage solution

## Integration with AgentKit

The wallet database is integrated with the AgentKit trading agent to provide persistent storage for CDP wallets. This enables:

1. Reusing the same wallet across server restarts
2. Recovering wallets using mnemonic phrases
3. Supporting multiple agents with individual wallets 