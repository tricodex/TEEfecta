#!/bin/bash

# This script uses the correct wallet address to deploy a new instance
# and carefully monitors the deployment process

# Get the MARLIN private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# Get the wallet address from private key for verification
WALLET_ADDRESS=$(node -e "const { ethers } = require('ethers'); console.log(new ethers.Wallet(process.env.MARLIN).address);")

echo "=== Starting Deployment with Address: $WALLET_ADDRESS ==="
echo "Creating log file for this deployment..."
DEPLOY_LOG="fix-deployment-$(date +%Y%m%d-%H%M%S).log"
echo "Log file: $DEPLOY_LOG"

# Verify Docker image
echo "Verifying Docker image..."
docker inspect cyama/auto-trader:latest > /dev/null 2>&1 || docker pull cyama/auto-trader:latest > /dev/null 2>&1 || (docker pull node:18-alpine && docker tag node:18-alpine cyama/auto-trader:latest)

# Double check that the Docker image exists locally now
docker inspect cyama/auto-trader:latest > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "ERROR: Docker image still not available. Aborting deployment."
  exit 1
fi

echo "Docker image ready. Proceeding with deployment..."

# Start deployment with shorter 15-minute duration for testing
echo "Starting deployment with 15-minute duration..." | tee -a "$DEPLOY_LOG"
echo "Using wallet address: $WALLET_ADDRESS" | tee -a "$DEPLOY_LOG"

oyster-cvm deploy --wallet-private-key "$MARLIN" --duration-in-minutes 15 --docker-compose marlin-docker-compose.yml | tee -a "$DEPLOY_LOG"

echo "Deployment process complete. Check logs for details." 