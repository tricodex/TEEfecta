#!/bin/bash

# Enhanced direct image deployment script with architecture detection and debugging
# This script bypasses docker-compose and uses direct image deployment

# Colors for better readability
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Configuration
DURATION_MINUTES=15
IMAGE_NAME="cyama/auto-trader:latest"
LOG_FILE="direct-image-deploy-$(date +%Y%m%d-%H%M%S).log"

# Detect CPU architecture and set appropriate instance type
ARCH=$(uname -m)
if [[ "$ARCH" == "x86_64" ]]; then
  INSTANCE_TYPE="c6a.xlarge"
  PCR_PRESET="base/blue/v1.0.0/amd64"
  echo -e "${YELLOW}Detected x86_64 architecture, using $INSTANCE_TYPE instance${NC}"
elif [[ "$ARCH" == "arm64" ]] || [[ "$ARCH" == "aarch64" ]]; then
  INSTANCE_TYPE="c7g.xlarge"
  PCR_PRESET="base/blue/v1.0.0/arm64"
  echo -e "${YELLOW}Detected ARM architecture, using $INSTANCE_TYPE instance${NC}"
else
  INSTANCE_TYPE="c6a.xlarge" # Default to x86_64
  PCR_PRESET="base/blue/v1.0.0/amd64"
  echo -e "${YELLOW}Unknown architecture $ARCH, defaulting to $INSTANCE_TYPE instance${NC}"
fi

# Get the wallet private key
export MARLIN=$(grep "export MARLIN=" ~/.zshrc | grep -o '"[^"]*"' | sed 's/"//g')

# Get wallet address using direct method - not createRandom
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Display banner
echo "=========================================================="
echo "  Direct Image Deployment to Marlin CVM"
echo "  Image: $IMAGE_NAME"
echo "  Duration: $DURATION_MINUTES minutes"
echo "  Instance Type: $INSTANCE_TYPE"
echo "  PCR Preset: $PCR_PRESET"
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
echo "Instance type: $INSTANCE_TYPE" | tee -a "$LOG_FILE"

# Run the deployment command with debug mode and instance type
echo "Running deployment command with debug mode..." | tee -a "$LOG_FILE"
DEPLOYMENT_CMD="NETWORK=arbitrum oyster-cvm deploy --wallet-private-key \"$MARLIN\" --duration-in-minutes $DURATION_MINUTES --image-url $IMAGE_NAME --debug --instance-type $INSTANCE_TYPE --region ap-south-1"
echo "Command: ${DEPLOYMENT_CMD/--wallet-private-key \"$MARLIN\"/--wallet-private-key \"REDACTED\"}" | tee -a "$LOG_FILE"

eval "$DEPLOYMENT_CMD" 2>&1 | tee -a "$LOG_FILE"
DEPLOY_STATUS=${PIPESTATUS[0]}

# Check if deployment was successful
if [ $DEPLOY_STATUS -eq 0 ]; then
  echo "Deployment command completed successfully." | tee -a "$LOG_FILE"
  
  # Extract job ID from logs
  JOB_ID=$(grep -o "0x[0-9a-f]\{64\}" "$LOG_FILE" | tail -1)
  if [ -n "$JOB_ID" ]; then
    echo "Extracted Job ID: $JOB_ID" | tee -a "$LOG_FILE"
  else
    echo "Could not extract Job ID from logs." | tee -a "$LOG_FILE"
    JOB_ID="UNKNOWN"
  fi
  
  echo "Waiting for job to initialize (may take 5-10 minutes)..." | tee -a "$LOG_FILE"
  echo "You can monitor job status in another terminal with:" | tee -a "$LOG_FILE"
  echo "NETWORK=arbitrum oyster-cvm list --address $WALLET_ADDRESS" | tee -a "$LOG_FILE"
  
  # Monitor job status for 10 minutes
  for i in {1..20}; do
    echo "Checking job status (attempt $i/20)..." | tee -a "$LOG_FILE"
    
    # Try both with and without network setting
    echo "Checking with NETWORK=arbitrum..." | tee -a "$LOG_FILE"
    NETWORK=arbitrum oyster-cvm list --address $WALLET_ADDRESS 2>&1 | tee -a "$LOG_FILE"
    
    # Try direct control plane query
    echo "Querying control plane directly..." | tee -a "$LOG_FILE"
    curl -s "http://13.202.229.168:8080/jobs?wallet=$WALLET_ADDRESS&network=arbitrum" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
    
    if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "UNKNOWN" ]; then
      echo "Querying specific job: $JOB_ID" | tee -a "$LOG_FILE"
      curl -s "http://13.202.229.168:8080/job/$JOB_ID" | tee -a "$LOG_FILE"
      echo "" | tee -a "$LOG_FILE"
    fi
    
    # Sleep for 30 seconds between checks
    if [ $i -lt 20 ]; then
      echo "Waiting 30 seconds before next check..." | tee -a "$LOG_FILE"
      sleep 30
    fi
  done
else
  echo "Deployment command failed." | tee -a "$LOG_FILE"
fi

echo "Deployment process complete. Results saved to $LOG_FILE"
