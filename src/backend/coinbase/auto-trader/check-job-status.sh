#!/bin/bash

# Get the wallet address from private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# IMPORTANT: Use the confirmed wallet address from test-wallet-address.mjs
# This ensures consistent wallet address across all scripts
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

echo "Checking jobs for wallet address: $WALLET_ADDRESS"

# Check every 30 seconds for 10 minutes
for i in {1..20}; do
  echo "Attempt $i/20 - $(date)"
  oyster-cvm list --address $WALLET_ADDRESS
  if [ $? -eq 0 ]; then
    echo "Job check completed"
  else
    echo "Error checking jobs"
  fi
  
  # Sleep for 30 seconds between checks
  sleep 30
done 