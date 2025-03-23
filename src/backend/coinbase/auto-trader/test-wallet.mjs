// Simple wallet test - ES module version
import { ethers } from 'ethers';
// Private key for wallet testing - safe for local use only
const privateKey = '';
try {
  console.log("Creating wallet...");
  const wallet = new ethers.Wallet(privateKey);
  console.log("Wallet created. Address:", wallet.address);
} catch (err) {
  console.error("Error:", err);
}
