#!/bin/bash

# This script deploys a Marlin CVM job using direct image reference
# instead of docker-compose to troubleshoot deployment issues

# Configuration
DURATION_MINUTES=30
IMAGE_NAME="cyama/auto-trader:latest"
LOG_FILE="direct-image-deploy-$(date +%Y%m%d-%H%M%S).log"

# Get the wallet private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# IMPORTANT: Use the confirmed wallet address from test-wallet-address.mjs
# This ensures consistent wallet address across all scripts
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Display banner
echo "=========================================================="
echo "  Direct Image Deployment to Marlin CVM"
echo "  Image: $IMAGE_NAME"
echo "  Duration: $DURATION_MINUTES minutes"
echo "  Wallet: $WALLET_ADDRESS"
echo "  Log File: $LOG_FILE"
echo "=========================================================="

# Confirm deployment
read -p "Proceed with deployment? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Deployment cancelled."
  exit 0
fi

# Start logging
echo "Starting deployment at $(date)" | tee -a "$LOG_FILE"
echo "Using wallet address: $WALLET_ADDRESS" | tee -a "$LOG_FILE"

# Run the deployment command
echo "Running deployment command..." | tee -a "$LOG_FILE"
oyster-cvm deploy \
  --wallet-private-key "$MARLIN" \
  --duration-in-minutes $DURATION_MINUTES \
  --image $IMAGE_NAME 2>&1 | tee -a "$LOG_FILE"

# Check if deployment was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "Deployment command completed successfully." | tee -a "$LOG_FILE"
  echo "Waiting for the job to appear in the job list..." | tee -a "$LOG_FILE"
  
  # Monitor job status for 5 minutes
  for i in {1..10}; do
    echo "Checking job status (attempt $i/10)..." | tee -a "$LOG_FILE"
    oyster-cvm list --address $WALLET_ADDRESS 2>&1 | tee -a "$LOG_FILE"
    
    # Sleep for 30 seconds between checks
    if [ $i -lt 10 ]; then
      echo "Waiting 30 seconds before next check..." | tee -a "$LOG_FILE"
      sleep 30
    fi
  done
else
  echo "Deployment command failed." | tee -a "$LOG_FILE"
fi

echo "Deployment process complete. Results saved to $LOG_FILE" 