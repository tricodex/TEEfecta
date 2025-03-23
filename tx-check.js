// Check transaction and get wallet address
const { ethers } = require("ethers");

async function main() {
  // Get wallet from env
  const privateKey = process.env.MARLIN;
  if (!privateKey) {
    console.error("MARLIN env var not set");
    process.exit(1);
  }

  try {
    const wallet = new ethers.Wallet(privateKey);
    console.log("Wallet address:", wallet.address);
    console.log("This is the correct wallet to check for jobs");
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main(); 