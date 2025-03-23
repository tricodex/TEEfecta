// Simple wallet test
const { ethers } = require("ethers");
// Private key for testing - only used locally
const privateKey = "";
try {
  console.log("Creating wallet...");
  const wallet = new ethers.Wallet(privateKey);
  console.log("Wallet created. Address:", wallet.address);
} catch (err) {
  console.error("Error:", err);
}
