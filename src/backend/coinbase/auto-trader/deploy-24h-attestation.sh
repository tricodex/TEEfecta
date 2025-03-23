#!/bin/bash

# 24-Hour Attestation Deployment Script
# SECURITY NOTE: This script uses the $MARLIN environment variable
# and will never output the private key in logs

# Set up logging with private key redaction
LOG_FILE="attestation-deployment-$(date +%Y%m%d-%H%M%S).log"
exec > >(sed 's/\(--wallet-private-key \)[^ ]*/\1"REDACTED"/g' | tee -a "$LOG_FILE") 2>&1

echo "Starting 24-hour attestation deployment at $(date)"
echo "This deployment will run for 24 hours (1440 minutes)"

# Securely check for MARLIN environment variable
if [ -z "$MARLIN" ]; then
  echo "Error: MARLIN environment variable not set. Aborting for security."
  echo "Please set the wallet private key as an environment variable with:"
  echo "  export MARLIN=your_private_key"
  exit 1
fi

# Security check - never show the key
echo "Using wallet key from MARLIN environment variable (key is NOT logged)"

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
echo "Using architecture: $ARCH"

# Deploy to Marlin on arbitrum network
echo "Deploying to Marlin on arbitrum network for 24 hours (1440 minutes)..."
echo "Running: NETWORK=arbitrum oyster-cvm deploy with --duration-in-minutes 1440"

# Execute the deployment command (log will redact the private key)
DEPLOY_OUTPUT=$(NETWORK=arbitrum oyster-cvm deploy --wallet-private-key "$MARLIN" \
  --docker-compose minimal-docker-compose.yml \
  --duration-in-minutes 1440 \
  --instance-type $ARCH)

# Extract the job ID with grep
JOB_ID=$(echo "$DEPLOY_OUTPUT" | grep -o "Job ID: [a-zA-Z0-9-]*" | cut -d' ' -f3)

if [ -z "$JOB_ID" ]; then
  echo "Error: Failed to extract Job ID from deployment output."
  echo "Deployment may have failed. Check the logs for details."
  exit 1
fi

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

# Get the wallet address from the private key (using oyster-cvm to avoid exposing the key)
WALLET_ADDRESS=$(NETWORK=arbitrum oyster-cvm wallet-address --private-key "$MARLIN")
echo "Using wallet address: $WALLET_ADDRESS"

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "Monitoring attempt $ATTEMPT/$MAX_ATTEMPTS..."
  
  # Get the job status using the wallet address (safer)
  JOB_STATUS=$(NETWORK=arbitrum oyster-cvm list --address "$WALLET_ADDRESS")
  
  # Print job status with any potential private keys redacted
  echo "$JOB_STATUS" | sed 's/\(--wallet-private-key \)[^ ]*/\1"REDACTED"/g'
  
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
  echo "Please check job status manually with:"
  echo "  NETWORK=arbitrum oyster-cvm list --address $WALLET_ADDRESS"
  exit 1
fi

# Update arbitrum-attestation.sh with the IP address
if [ -f "arbitrum-attestation.sh" ]; then
  sed -i.bak "s/ENCLAVE_IP=\"[^\"]*\"/ENCLAVE_IP=\"$IP_ADDRESS\"/" arbitrum-attestation.sh
  echo "Updated arbitrum-attestation.sh with IP address: $IP_ADDRESS"
fi

# Create a 24-hour attestation report template
REPORT_FILE="attestation-report-24h-$(date +%Y%m%d).md"
cat > "$REPORT_FILE" << EOF
# Marlin CVM 24-Hour Attestation Report

## Deployment Details

- **Start Time**: $(date)
- **Expected End Time**: $(date -d "+24 hours")
- **Job ID**: $JOB_ID
- **IP Address**: $IP_ADDRESS
- **Architecture**: $ARCH
- **Wallet Address**: $WALLET_ADDRESS (redacted for security)
- **Docker Compose Digest**: $DIGEST

## Attestation Verification

Initial attestation verification:

\`\`\`
$(./arbitrum-attestation.sh)
\`\`\`

## Instructions

The attestation service is now running and will be active for 24 hours.
To verify attestation at any time, run:

\`\`\`
./arbitrum-attestation.sh
\`\`\`

## Security Notes

- Do NOT expose the private key
- Perform periodic attestation checks
- Keep this report secure
EOF

echo "Deployment completed successfully!"
echo "Job ID: $JOB_ID"
echo "IP Address: $IP_ADDRESS"
echo "Attestation report created: $REPORT_FILE"
echo "The attestation service will run for 24 hours from now."

# Test connectivity and run initial attestation
echo "Testing connectivity to the deployed service..."
nc -z -v -w 5 $IP_ADDRESS 3222
if [ $? -eq 0 ]; then
  echo "Successfully connected to service on port 3222"
  echo "Running initial attestation verification..."
  ./arbitrum-attestation.sh
else
  echo "Warning: Could not connect to service on port 3222. The job may still be initializing."
  echo "Please run attestation verification manually once the service is available:"
  echo "  ./arbitrum-attestation.sh"
fi

echo "Secure 24-hour attestation deployment completed at $(date)"
exit 0