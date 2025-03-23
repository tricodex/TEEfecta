#!/bin/bash

# This script deploys a Marlin CVM job in debug mode
# Debug mode allows us to see console logs of the enclave

# Configuration
DURATION_MINUTES=20
IMAGE_NAME="cyama/auto-trader:latest"
LOG_FILE="debug-deployment-$(date +%Y%m%d-%H%M%S).log"

# Get the wallet private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# Use the confirmed wallet address
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Display banner
echo "=========================================================="
echo "  Debug Mode Deployment to Marlin CVM"
echo "  Image: $IMAGE_NAME"
echo "  Duration: $DURATION_MINUTES minutes"
echo "  Wallet: $WALLET_ADDRESS"
echo "  Log File: $LOG_FILE"
echo "=========================================================="

# Confirm deployment
read -p "Proceed with debug deployment? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Deployment cancelled."
  exit 0
fi

# Start logging
echo "Starting debug deployment at $(date)" | tee -a "$LOG_FILE"
echo "Using wallet address: $WALLET_ADDRESS" | tee -a "$LOG_FILE"

# Get available PCR presets
echo "Getting supported PCR presets..." | tee -a "$LOG_FILE"
oyster-cvm verify --help | grep -A 2 "pcr-preset" | tee -a "$LOG_FILE"

# Show available instance types
echo "Checking instance types..." | tee -a "$LOG_FILE"
oyster-cvm deploy --help | grep -A 5 "instance-type" | tee -a "$LOG_FILE"

# Try to detect architecture
ARCH=$(uname -m)
PCR_PRESET=""
INSTANCE_TYPE=""

if [ "$ARCH" == "x86_64" ] || [ "$ARCH" == "amd64" ]; then
  PCR_PRESET="base/blue/v1.0.0/amd64"
  INSTANCE_TYPE="c6a.xlarge"
  echo "Detected AMD64 architecture, using $PCR_PRESET preset" | tee -a "$LOG_FILE"
elif [ "$ARCH" == "arm64" ] || [ "$ARCH" == "aarch64" ]; then
  PCR_PRESET="base/blue/v1.0.0/arm64"
  INSTANCE_TYPE="c7g.xlarge"
  echo "Detected ARM64 architecture, using $PCR_PRESET preset" | tee -a "$LOG_FILE"
else
  echo "Unknown architecture: $ARCH, defaulting to AMD64" | tee -a "$LOG_FILE"
  PCR_PRESET="base/blue/v1.0.0/amd64"
  INSTANCE_TYPE="c6a.xlarge"
fi

# Run the deployment command with debug flag
echo "Running debug deployment command..." | tee -a "$LOG_FILE"
oyster-cvm deploy \
  --wallet-private-key "$MARLIN" \
  --duration-in-minutes $DURATION_MINUTES \
  --docker-compose marlin-docker-compose.yml \
  --debug \
  --instance-type "$INSTANCE_TYPE" \
  --region ap-south-1 \
  --pcr-preset "$PCR_PRESET" 2>&1 | tee -a "$LOG_FILE"

# Check if deployment was successful
if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo "Debug deployment command completed successfully." | tee -a "$LOG_FILE"
  echo "Waiting for the job to appear in the job list..." | tee -a "$LOG_FILE"
  
  # Monitor job status for 5 minutes
  for i in {1..10}; do
    echo "Checking job status (attempt $i/10)..." | tee -a "$LOG_FILE"
    oyster-cvm list --address $WALLET_ADDRESS 2>&1 | tee -a "$LOG_FILE"
    
    # Check for job ID in the output
    job_id=$(oyster-cvm list --address $WALLET_ADDRESS 2>&1 | grep -o "ID: 0x[0-9a-f]*" | cut -d' ' -f2 | head -1)
    
    if [ ! -z "$job_id" ]; then
      echo "Found job with ID: $job_id" | tee -a "$LOG_FILE"
      
      # Check for IP address
      ip_address=$(oyster-cvm list --address $WALLET_ADDRESS 2>&1 | grep -o "IP: [0-9.]*" | cut -d' ' -f2 | head -1)
      
      if [ ! -z "$ip_address" ]; then
        echo "Job has IP address: $ip_address" | tee -a "$LOG_FILE"
        echo "To check logs: oyster-cvm logs --ip $ip_address" | tee -a "$LOG_FILE"
        echo "To access server: curl http://$ip_address:3222/" | tee -a "$LOG_FILE"
        
        # Try to connect to the server
        echo "Testing connection to server..." | tee -a "$LOG_FILE"
        curl -v "http://$ip_address:3222/" 2>&1 | tee -a "$LOG_FILE"
        
        # Check logs
        echo "Fetching console logs..." | tee -a "$LOG_FILE"
        oyster-cvm logs --ip $ip_address 2>&1 | tee -a "$LOG_FILE"
        
        break
      else
        echo "Job found but no IP address yet. Waiting..." | tee -a "$LOG_FILE"
      fi
    fi
    
    # Sleep for 30 seconds between checks
    if [ $i -lt 10 ]; then
      echo "Waiting 30 seconds before next check..." | tee -a "$LOG_FILE"
      sleep 30
    fi
  done
else
  echo "Debug deployment command failed." | tee -a "$LOG_FILE"
fi

echo "Debug deployment process complete. Results saved to $LOG_FILE" 