#!/bin/bash

# This script tests deployment with a simplified docker-compose file

# Get the wallet private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# Use the confirmed wallet address
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Run the deployment command
echo "Running deployment with simplified docker-compose..."
oyster-cvm deploy \
  --wallet-private-key "$MARLIN" \
  --duration-in-minutes 15 \
  --docker-compose marlin-docker-compose.yml

# Check job status
echo "Checking job status..."
oyster-cvm list --address $WALLET_ADDRESS

echo "Deployment test complete."
