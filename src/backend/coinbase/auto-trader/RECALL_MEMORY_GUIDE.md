# Recall Memory Integration Guide

This guide explains how to effectively use Recall Network for transparent and verifiable memory storage in the 4g3n7 trading agent system.

## Overview

Recall Network provides a decentralized, transparent storage layer for the 4g3n7 trading agent. All decisions, analyses, and operations are stored on Recall Network, creating an immutable audit trail that:

1. Enables verification of trading decisions
2. Creates transparency for users
3. Provides accountability for the agent's operations
4. Ensures all data persists beyond the agent's lifecycle

## Implementation Architecture

The Recall memory integration uses the following architecture:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  Trading Agent  │────▶│  Memory Manager  │────▶│  Recall Network │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        ▲                        │
        │                        │                        │
        │                        │                        │
        ▼                        │                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│  AgentKit Agent │────▶│   Query Engine   │◀────│  Bucket Storage │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Key Components

### 1. RecallMemoryManager

The `RecallMemoryManager` class provides the core implementation for interacting with Recall Network:

```typescript
export class RecallMemoryManager implements MemoryManager {
  constructor(
    private privateKey: string,
    private bucketAlias: string,
    private network: string
  ) {
    // Initialize Recall Network connection
  }

  async store(type: string, content: any, metadata?: Record<string, any>): Promise<MemoryEntry>;
  async storeMemory(entry: MemoryEntry): Promise<MemoryEntry>;
  async retrieve(id: string): Promise<MemoryEntry | null>;
  async query(type: string, filter?: (entry: MemoryEntry) => boolean): Promise<MemoryEntry[]>;
  async delete(id: string): Promise<boolean>;
}
```

### 2. Memory Entry Structure

Each memory entry follows this structure:

```typescript
export interface MemoryEntry {
  id: string;        // Unique identifier
  type: string;      // Type of memory (analysis, trade, error, etc.)
  content?: any;     // Main content
  data?: any;        // Alternative data field
  timestamp: string; // ISO timestamp
  metadata?: Record<string, any>; // Additional metadata
}
```

## Setup and Configuration

### 1. Environment Configuration

Configure the Recall Network integration with these environment variables:

```bash
# Recall Network Configuration
RECALL_PRIVATE_KEY=your_recall_private_key
RECALL_BUCKET_ALIAS=4g3n7-memory
RECALL_NETWORK=testnet  # or mainnet
```

### 2. Dependencies

Ensure you have the required dependencies:

```bash
npm install @recallnet/sdk @recallnet/chains viem
```

### 3. Initialize Memory Manager

Initialize the memory manager in your application:

```typescript
// Example initialization
const memoryManager = new RecallMemoryManager(
  process.env.RECALL_PRIVATE_KEY || 'mock_key',
  process.env.RECALL_BUCKET_ALIAS || 'auto-trader-memory',
  process.env.RECALL_NETWORK || 'testnet'
);
```

## Using the Memory System

### 1. Storing Analysis Results

When the agent analyzes a portfolio, store the results:

```typescript
// Example usage in analyzePortfolio method
const decisionId = uuidv4().substring(0, 8);
const analysis = await llmService.generateAnalysis(portfolio, marketData);

// Store in Recall memory
await this.memoryManager.store('analysis', analysis, {
  portfolioId: decisionId,
  timestamp: new Date().toISOString(),
  portfolioAssets: Object.keys(portfolio.assets || {}),
  marketData: JSON.stringify(marketData)
});

return {
  decisionId,
  timestamp: new Date().toISOString(),
  analysis,
  provider: 'traditional'
};
```

### 2. Storing Trade Executions

When executing trades, record the details:

```typescript
// Example usage in executeTrade method
const tradeId = uuidv4().substring(0, 8);
const executionResult = await executeTradeOnChain(tradeType, fromAsset, toAsset, amount);

// Store execution result in memory
await this.memoryManager.store('trade_execution', executionResult, {
  tradeId,
  tradeType,
  fromAsset,
  toAsset,
  amount,
  timestamp: new Date().toISOString()
});
```

### 3. Querying Memory

To retrieve past decisions or trades:

```typescript
// Example usage in getReasoningHistory method
const analysisEntries = await this.memoryManager.query('analysis', 
  (entry: any) => entry.metadata?.portfolioId === decisionId);

if (analysisEntries.length > 0) {
  return {
    decisionId,
    timestamp: analysisEntries[0].timestamp,
    type: 'analysis',
    reasoning: analysisEntries[0].content
  };
}
```

## Advanced Usage

### 1. Structured Memory Types

Use consistent memory types for better organization:

| Type | Purpose | Example Content |
|------|---------|----------------|
| `analysis` | Portfolio analysis | LLM-generated insights |
| `trade_execution` | Trade execution details | Transaction hash, amounts, success status |
| `trade_analysis` | Pre-trade analysis | Risk assessment, expected outcomes |
| `error` | Error records | Error messages, stack traces |
| `attestation` | Attestation verification | PCR values, verification status |
| `state` | Agent state snapshots | Configuration, status |

### 2. Memory Retrieval Patterns

Implement these retrieval patterns for efficient access:

#### By Decision ID

```typescript
const getByDecisionId = async (decisionId: string): Promise<MemoryEntry[]> => {
  // Try multiple memory types
  const types = ['analysis', 'trade_execution', 'trade_analysis', 'error'];
  
  const results = await Promise.all(
    types.map(type => 
      memoryManager.query(type, entry => 
        entry.metadata?.decisionId === decisionId || 
        entry.metadata?.tradeId === decisionId
      )
    )
  );
  
  // Flatten results
  return results.flat();
};
```

#### By Asset

```typescript
const getByAsset = async (assetSymbol: string): Promise<MemoryEntry[]> => {
  const analysisEntries = await memoryManager.query('analysis', 
    entry => entry.metadata?.portfolioAssets?.includes(assetSymbol));
    
  const tradeEntries = await memoryManager.query('trade_execution',
    entry => entry.metadata?.fromAsset === assetSymbol || 
             entry.metadata?.toAsset === assetSymbol);
  
  return [...analysisEntries, ...tradeEntries];
};
```

### 3. Transaction History

Create a comprehensive transaction history using the memory system:

```typescript
const getTransactionHistory = async (limit = 20): Promise<any[]> => {
  // Get all trade executions
  const trades = await memoryManager.query('trade_execution');
  
  // Sort by timestamp (newest first)
  const sortedTrades = trades.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Format and limit results
  return sortedTrades.slice(0, limit).map(trade => ({
    id: trade.metadata?.tradeId,
    timestamp: trade.timestamp,
    type: trade.metadata?.tradeType,
    fromAsset: trade.metadata?.fromAsset,
    toAsset: trade.metadata?.toAsset,
    amount: trade.metadata?.amount,
    status: trade.content?.status || 'unknown',
    txHash: trade.content?.transactionHash
  }));
};
```

## Verification and Transparency

### 1. Verify Memory Integrity

To verify the integrity of stored memories:

```typescript
// Example memory integrity verification
const verifyMemoryIntegrity = async (decisionId: string): Promise<boolean> => {
  try {
    // Get all entries for this decision
    const allEntries = await getByDecisionId(decisionId);
    
    if (allEntries.length === 0) {
      console.warn(`No entries found for decision ID: ${decisionId}`);
      return false;
    }
    
    // Verify timestamps are in logical order
    const timestamps = allEntries.map(entry => new Date(entry.timestamp).getTime());
    const isSorted = timestamps.every((val, i, arr) => !i || val >= arr[i - 1]);
    
    if (!isSorted) {
      console.warn(`Timestamp inconsistency detected for decision ID: ${decisionId}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying memory integrity:', error);
    return false;
  }
};
```

### 2. Public Memory Verification

Enable public verification of the agent's decisions:

```typescript
// Example API endpoint for public verification
app.get('/api/verify/:decisionId', async (req, res) => {
  try {
    const decisionId = req.params.decisionId;
    const memories = await getByDecisionId(decisionId);
    
    // Filter sensitive information
    const publicMemories = memories.map(memory => ({
      id: memory.id,
      type: memory.type,
      timestamp: memory.timestamp,
      metadata: {
        ...memory.metadata,
        // Remove any sensitive data
        privateKey: undefined,
        credentials: undefined
      }
    }));
    
    res.json({
      verified: memories.length > 0,
      decisionId,
      memories: publicMemories
    });
  } catch (error) {
    res.status(500).json({
      verified: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
```

## Memory Backup and Recovery

### 1. Backup Memory Index

Maintain a local index of memory entries for faster recovery:

```typescript
// Example memory index backup
const backupMemoryIndex = async (): Promise<void> => {
  try {
    const allTypes = ['analysis', 'trade_execution', 'trade_analysis', 'error', 'attestation', 'state'];
    const index: Record<string, string[]> = {};
    
    // Build index by type
    for (const type of allTypes) {
      const entries = await memoryManager.query(type);
      index[type] = entries.map(entry => entry.id);
    }
    
    // Save index to local storage
    const indexPath = path.join(process.cwd(), 'data', 'memory-index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    
    console.log(`Memory index backed up with ${Object.values(index).flat().length} total entries`);
  } catch (error) {
    console.error('Failed to backup memory index:', error);
  }
};
```

### 2. Restore from Recall Network

Restore memory from Recall Network if needed:

```typescript
// Example memory restoration
const restoreMemory = async (): Promise<boolean> => {
  try {
    // Load index from backup
    const indexPath = path.join(process.cwd(), 'data', 'memory-index.json');
    if (!fs.existsSync(indexPath)) {
      console.warn('Memory index backup not found, skipping restoration');
      return false;
    }
    
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    // Restore entries
    for (const [type, ids] of Object.entries(index)) {
      console.log(`Restoring ${ids.length} entries of type ${type}`);
      
      for (const id of ids) {
        const entry = await memoryManager.retrieve(id);
        if (entry) {
          console.log(`Successfully restored entry ${id}`);
        } else {
          console.warn(`Failed to restore entry ${id}`);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to restore memory:', error);
    return false;
  }
};
```

## Conclusion

By properly integrating the Recall Network memory system, you ensure that the 4g3n7 trading agent operates with:

1. **Transparency**: All decisions and actions are recorded immutably
2. **Accountability**: Users can verify the reasoning behind trades
3. **Integrity**: The history cannot be altered or tampered with
4. **Persistence**: Data survives beyond the agent's operational lifecycle

This creates a foundation of trust for autonomous trading, allowing users to verify the agent's decision-making process and ensuring regulatory compliance through complete audit trails.
