#!/bin/bash

# This script checks for Marlin CVM jobs across multiple networks
# Created to help troubleshoot job visibility issues

# Get the wallet address from private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# IMPORTANT: Use the confirmed wallet address from test-wallet-address.mjs
# This ensures consistent wallet address across all scripts
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

echo "Testing job visibility for wallet address: $WALLET_ADDRESS"
echo "Checking default network..."

# Create a log file for this session
LOG_FILE="marlin-network-test-$(date +%Y%m%d-%H%M%S).log"
echo "Logging to: $LOG_FILE"

# Check default network first (no network flag)
echo "-----------------------------------" | tee -a "$LOG_FILE"
echo "Checking default network:" | tee -a "$LOG_FILE"
oyster-cvm list --address $WALLET_ADDRESS 2>&1 | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Use 'oyster-cvm --help' to check for proper network specification
echo "Checking oyster-cvm help output for network options:" | tee -a "$LOG_FILE"
oyster-cvm --help | grep -i network | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "-----------------------------------" | tee -a "$LOG_FILE"
echo "Network testing complete. Results saved to $LOG_FILE"
echo "If no jobs were found, try:"
echo "1. Verifying transaction confirmation on the blockchain"
echo "2. Checking USDC balance on all relevant networks"
echo "3. Contacting Marlin support with transaction hashes" 