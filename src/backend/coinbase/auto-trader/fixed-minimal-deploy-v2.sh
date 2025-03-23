#!/bin/bash

# Fixed Minimal Deployment Script for Marlin CVM
# Based on current oyster-cvm command syntax

# Set up logging
LOG_FILE="minimal-deployment-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "Starting minimal deployment at $(date)"

# Get private key from environment or parameter
if [ -z "$MARLIN" ]; then
  echo "MARLIN environment variable not set. Please set it or pass a wallet key as a parameter."
  echo "Export it with: export MARLIN=your_private_key"
  exit 1
else
  echo "Using MARLIN environment variable for wallet key"
  WALLET_KEY="$MARLIN"
fi

# Verify docker-compose file exists
if [ ! -f "minimal-docker-compose.yml" ]; then
  echo "Error: minimal-docker-compose.yml not found"
  exit 1
fi

# Compute digest for the docker-compose file
echo "Computing docker-compose digest..."
DIGEST=$(sha256sum minimal-docker-compose.yml | awk '{print $1}')
echo "Digest: $DIGEST"

# Determine architecture
ARCH="arm64"  # Default to ARM64
if [ "$(uname -m)" == "x86_64" ]; then
  ARCH="amd64"
fi
echo "Using architecture: $ARCH ($ARCH is passed to --instance-type)"

# Deploy to Marlin on arbitrum network
echo "Deploying to Marlin on arbitrum network..."
echo "Running: NETWORK=arbitrum oyster-cvm deploy --wallet-private-key \"REDACTED\" --docker-compose minimal-docker-compose.yml --duration-in-minutes 60 --instance-type $ARCH"

# Execute the deployment command
DEPLOY_OUTPUT=$(NETWORK=arbitrum oyster-cvm deploy --wallet-private-key "$WALLET_KEY" --docker-compose minimal-docker-compose.yml --duration-in-minutes 60 --instance-type $ARCH)

echo "Deployment command output:"
echo "$DEPLOY_OUTPUT"

# Extract the job ID
JOB_ID=$(echo "$DEPLOY_OUTPUT" | grep -o "Job ID: [a-zA-Z0-9-]*" | cut -d' ' -f3)
echo "Deployment initiated successfully!"
echo "Job ID: $JOB_ID"

# Update the attestation script with the new job ID
echo "Updating arbitrum-attestation.sh with new Job ID..."
if [ -f "arbitrum-attestation.sh" ]; then
  sed -i.bak "s/JOB_ID=\"[^\"]*\"/JOB_ID=\"$JOB_ID\"/" arbitrum-attestation.sh
fi
echo "arbitrum-attestation.sh updated with Job ID: $JOB_ID"

# Start monitoring for the job to become active
echo "Starting job monitoring..."
echo "This may take up to 5 minutes for the job to become active."

MAX_ATTEMPTS=30
ATTEMPT=1
IP_ADDRESS=""

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "Monitoring attempt $ATTEMPT/$MAX_ATTEMPTS..."
  
  # Get the job status
  JOB_STATUS=$(NETWORK=arbitrum oyster-cvm list --address $(NETWORK=arbitrum oyster-cvm wallet-address --private-key "$WALLET_KEY"))
  
  # Print job status for debugging
  echo "Job status:"
  echo "$JOB_STATUS"
  
  # Extract IP address if available
  IP_ADDRESS=$(echo "$JOB_STATUS" | grep -o "IP: [0-9.]*" | cut -d' ' -f2)
  
  if [ -n "$IP_ADDRESS" ]; then
    echo "Job is active! IP Address: $IP_ADDRESS"
    break
  else
    echo "IP Address not found yet. Waiting 30 seconds..."
    sleep 30
    ATTEMPT=$((ATTEMPT+1))
  fi
done

if [ -z "$IP_ADDRESS" ]; then
  echo "Failed to get IP address after $MAX_ATTEMPTS attempts."
  exit 1
fi

# Update arbitrum-attestation.sh with the IP address
if [ -f "arbitrum-attestation.sh" ]; then
  sed -i.bak "s/ENCLAVE_IP=\"[^\"]*\"/ENCLAVE_IP=\"$IP_ADDRESS\"/" arbitrum-attestation.sh
  echo "Updated arbitrum-attestation.sh with IP address: $IP_ADDRESS"
fi

echo "Deployment completed successfully!"
echo "Job ID: $JOB_ID"
echo "IP Address: $IP_ADDRESS"
echo "Verify attestation by running: ./arbitrum-attestation.sh"

# Test connectivity
echo "Testing connectivity to the deployed service..."
nc -z -v -w 5 $IP_ADDRESS 3222
if [ $? -eq 0 ]; then
  echo "Successfully connected to service on port 3222"
else
  echo "Warning: Could not connect to service on port 3222. The job may still be initializing."
fi

exit 0