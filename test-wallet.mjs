// Simple wallet test - ES module version
import { ethers } from 'ethers';

// NEVER store private keys in code - use environment variables or secure key management
const privateKey = process.env.WALLET_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

try {
  if (privateKey === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    console.error("ERROR: No private key provided. Set WALLET_KEY environment variable");
    process.exit(1);
  }
  console.log("Creating wallet...");
  const wallet = new ethers.Wallet(privateKey);
  console.log("Wallet created. Address:", wallet.address);
} catch (err) {
  console.error("Error:", err);
} 