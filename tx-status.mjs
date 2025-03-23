// Transaction checker (ESM)
import { ethers } from 'ethers';

// Base Sepolia RPC URL
const rpcUrl = 'https://sepolia.base.org';

// Transaction hash to check - should come from environment variables or arguments
const txHash = process.env.TX_HASH || '0x0000000000000000000000000000000000000000000000000000000000000000';

// Wallet address should never be hardcoded
const walletAddress = process.env.WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';

async function checkTransaction() {
  console.log('Starting transaction check...');
  
  try {
    if (txHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.error('ERROR: No transaction hash provided. Set TX_HASH environment variable');
      process.exit(1);
    }
    
    console.log('Creating provider for', rpcUrl);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('Provider created, fetching transaction...');
    const tx = await provider.getTransaction(txHash);
    
    console.log('Transaction fetch complete');
    if (!tx) {
      console.log('Transaction not found');
      process.exit(1);
    }
    
    console.log('Transaction found:');
    console.log('- From:', tx.from);
    console.log('- To:', tx.to);
    console.log('- Value:', ethers.formatEther(tx.value || 0), 'ETH');
    console.log('- Gas price:', tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : 'Unknown', 'Gwei');
    
    // Check receipt for status
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      console.log('Transaction is pending');
      return;
    }
    
    console.log('Transaction is mined:');
    console.log('- Block number:', receipt.blockNumber);
    console.log('- Status:', receipt.status ? 'Success' : 'Failed');
    console.log('- Gas used:', receipt.gasUsed?.toString() || 'Unknown');
    
    // Check events
    if (receipt.logs && receipt.logs.length > 0) {
      console.log(`Found ${receipt.logs.length} events`);
      
      // Check for JobOpen event - topic would be the hash of JobOpen(address,bytes32,uint256)
      receipt.logs.forEach((log, i) => {
        console.log(`Event ${i+1}:`, log.topics[0]);
        // If we knew the exact topic hash, we could check for specific events
      });
    }
    
    // Only compare addresses if wallet address is provided
    if (walletAddress !== '0x0000000000000000000000000000000000000000') {
      console.log('\nTransaction was sent from wallet:', walletAddress);
      console.log('Wallet matches transaction sender:', tx.from.toLowerCase() === walletAddress.toLowerCase());
    }
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR CHECKING TRANSACTION:', error);
    process.exit(1);
  }
}

// Run the check
console.log('Script started');
checkTransaction().catch(err => {
  console.error('Unhandled promise rejection:', err);
  process.exit(1);
}); 