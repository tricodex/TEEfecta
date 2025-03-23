// Simple test script to verify wallet address from private key
// Run with: node test-wallet-address.js
const { Wallet } = require('ethers');

try {
  // Get private key from environment
  const privateKey = process.env.MARLIN;
  
  if (!privateKey) {
    console.error("Error: MARLIN environment variable not set");
    console.error("Please run: export MARLIN=<your-private-key>");
    process.exit(1);
  }
  
  // Create wallet and get address
  console.log("Creating wallet from private key...");
  const wallet = new Wallet(privateKey);
  console.log("Wallet address: " + wallet.address);
  
  // Show key length (without revealing the key)
  console.log("Private key length: " + privateKey.length + " characters");
  console.log("This is the wallet address to use for all Marlin CVM commands");
} catch (error) {
  console.error("Error creating wallet:", error.message);
  process.exit(1);
} 