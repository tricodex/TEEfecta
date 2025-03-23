// Check transaction status and job status
const { ethers } = require('ethers');

// Set the RPC URL to Sepolia testnet
const rpcUrl = "https://sepolia.base.org"; // Base Sepolia testnet

// The transaction hash to check
const txHash = "0xb21eae37d865b5eaffbdcc4811047e2148edb5eb3633bca9fd31b7f0dc05c4ab";
const jobId = "0x0000000000000000000000000000000000000000000000000000000000000b50";

// Get the wallet address from the private key
function getWalletAddress() {
  const privateKey = process.env.MARLIN;
  if (!privateKey) {
    console.error("MARLIN environment variable not set");
    process.exit(1);
  }
  
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch (err) {
    console.error("Error getting wallet address:", err.message);
    process.exit(1);
  }
}

async function checkTransaction() {
  try {
    // Connect to the network
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log(`\nChecking transaction ${txHash} on ${rpcUrl}...`);
    
    // Get transaction
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      console.log(`Transaction ${txHash} not found on ${rpcUrl}.`);
      console.log("This could mean:");
      console.log("1. The transaction is on a different network");
      console.log("2. The transaction hash is incorrect");
      console.log("3. The RPC provider doesn't have the transaction in its database");
      return;
    }
    
    console.log("Transaction details:");
    console.log("- From:", tx.from);
    console.log("- To:", tx.to);
    console.log("- Value:", ethers.formatEther(tx.value || 0), "ETH");
    console.log("- Gas price:", tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") : "Unknown", "Gwei");
    
    // Check if transaction is mined
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      console.log("Transaction is pending.");
      return;
    }
    
    console.log("Transaction is mined.");
    console.log("- Block number:", receipt.blockNumber);
    console.log("- Gas used:", receipt.gasUsed ? receipt.gasUsed.toString() : "Unknown");
    console.log("- Status:", receipt.status ? "Success" : "Failed");
    
    // Check logs/events
    if (receipt.logs && receipt.logs.length > 0) {
      console.log("Events emitted:", receipt.logs.length);
      
      receipt.logs.forEach((log, index) => {
        console.log(`- Event ${index + 1}:`, log.topics ? log.topics[0] : "Unknown");
      });
    } else {
      console.log("No events emitted.");
    }
    
    console.log("\nJob ID: ", jobId);
    
    // Log the wallet address
    const walletAddress = getWalletAddress();
    console.log("Wallet address:", walletAddress);
    console.log("\nPossible issues:");
    console.log("1. The transaction was successful but the job wasn't created properly");
    console.log("2. The job was created but isn't visible in the active jobs list");
    console.log("3. The wallet address used for deployment is different from the one used for checking");
    console.log("4. The job duration has already expired");
    
    console.log("\nRecommended actions:");
    console.log("1. Try deploying again with a longer duration (e.g., 60 minutes)");
    console.log("2. Verify the wallet address is consistent across deployment and monitoring");
    console.log("3. Check if there are any USDC approval issues");
    
  } catch (error) {
    console.error("Error checking transaction:", error.message);
  }
}

// Execute the check
checkTransaction(); 