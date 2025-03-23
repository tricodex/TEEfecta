// Get correct wallet address from private key
const { ethers } = require('ethers');

// Load the private key from environment
const privateKey = process.env.MARLIN;
if (!privateKey) {
  console.error('MARLIN environment variable not set');
  process.exit(1);
}

try {
  // Create a wallet instance with the private key
  const wallet = new ethers.Wallet(privateKey);
  console.log('Wallet address:', wallet.address);
} catch (error) {
  console.error('Error creating wallet:', error.message);
  process.exit(1);
} 