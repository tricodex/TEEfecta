// Get wallet address from private key
const { ethers } = require("ethers");

async function main() {
  // Get private key from command line
  const privateKey = process.argv[2];
  if (!privateKey) {
    console.error("Usage: node export-wallet.js <private_key>");
    process.exit(1);
  }

  console.log("Private key length:", privateKey.length);
  
  try {
    console.log("Creating wallet...");
    const wallet = new ethers.Wallet(privateKey);
    console.log("Wallet created. Address:", wallet.address);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main(); 