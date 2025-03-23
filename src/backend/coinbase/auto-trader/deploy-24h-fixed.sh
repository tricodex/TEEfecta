#!/bin/bash
# 24-Hour Deployment Script for Marlin CVM
# This script deploys the minimal Docker Compose to Marlin CVM for 24 hours

# Set up logging
LOG_FILE="marlin-24h-deployment-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "Starting 24-hour deployment at $(date)"

# Get private key from environment
if [ -z "$MARLIN" ]; then
  echo "MARLIN environment variable not set. Please set it or pass a wallet key as a parameter."
  echo "Export it with: export MARLIN=your_private_key"
  exit 1
else
  echo "Using MARLIN environment variable for wallet key"
  WALLET_KEY="$MARLIN"
  
  # Extract wallet address
  echo "Extracting wallet address..."
  WALLET_ADDRESS=$(echo "$WALLET_KEY" | NETWORK=arbitrum oyster-cvm deploy --wallet-private-key "$WALLET_KEY" --dry-run | grep -o "Wallet address: 0x[a-fA-F0-9]*" | cut -d' ' -f3)
  
  if [ -z "$WALLET_ADDRESS" ]; then
    echo "Failed to extract wallet address. Using default address..."
    WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"
  fi
  
  echo "Using wallet address: $WALLET_ADDRESS"
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

# Determine regions to try
REGIONS=("us-east-1" "eu-west-1" "us-west-2" "eu-central-1")
echo "Will try deploying to regions: ${REGIONS[*]}"

# Try deploying to different regions
for REGION in "${REGIONS[@]}"; do
  echo "Trying deployment to region: $REGION"
  
  # Deploy to Marlin on arbitrum network for 24 hours (1440 minutes)
  echo "Deploying to Marlin on arbitrum network in $REGION for 24 hours..."
  echo "Running: NETWORK=arbitrum oyster-cvm deploy --wallet-private-key \"REDACTED\" --docker-compose minimal-docker-compose.yml --duration-in-minutes 1440 --region $REGION"

  # Execute the deployment command
  DEPLOY_OUTPUT=$(NETWORK=arbitrum oyster-cvm deploy --wallet-private-key "$WALLET_KEY" --docker-compose minimal-docker-compose.yml --duration-in-minutes 1440 --region $REGION)
  DEPLOY_STATUS=$?
  
  echo "Deployment command output:"
  echo "$DEPLOY_OUTPUT"
  
  # Check if deployment was successful
  if [ $DEPLOY_STATUS -eq 0 ] && [[ "$DEPLOY_OUTPUT" == *"Job ID"* ]]; then
    echo "Deployment successful in region $REGION!"
    break
  else
    echo "Deployment failed in region $REGION. Trying next region..."
  fi
done

# Extract the job ID
JOB_ID=$(echo "$DEPLOY_OUTPUT" | grep -o "Job ID: [a-zA-Z0-9-]*" | cut -d' ' -f3)

if [ -z "$JOB_ID" ]; then
  echo "Failed to extract Job ID. Deployment may have failed."
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

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "Monitoring attempt $ATTEMPT/$MAX_ATTEMPTS..."
  
  # Get the job status
  JOB_STATUS=$(NETWORK=arbitrum oyster-cvm list --address $WALLET_ADDRESS)
  
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
  echo "Please check job status manually with:"
  echo "  NETWORK=arbitrum oyster-cvm list --address $WALLET_ADDRESS"
  exit 1
fi

# Update arbitrum-attestation.sh with the IP address
if [ -f "arbitrum-attestation.sh" ]; then
  sed -i.bak "s/ENCLAVE_IP=\"[^\"]*\"/ENCLAVE_IP=\"$IP_ADDRESS\"/" arbitrum-attestation.sh
  echo "Updated arbitrum-attestation.sh with IP address: $IP_ADDRESS"
fi

# Save deployment details
cat > "24h-deployment-details.md" << EOL
# 24-Hour Marlin CVM Deployment Details

## Deployment Information
- Deployment Time: $(date)
- Network: Arbitrum
- Duration: 24 hours (1440 minutes)
- Job ID: $JOB_ID
- IP Address: $IP_ADDRESS
- Wallet Address: $WALLET_ADDRESS

## Verification Commands
- Check job status:
  \`\`\`
  NETWORK=arbitrum oyster-cvm list --address $WALLET_ADDRESS
  \`\`\`

- Verify attestation:
  \`\`\`
  ./arbitrum-attestation.sh
  \`\`\`

- Check service:
  \`\`\`
  curl http://$IP_ADDRESS:3222/health
  \`\`\`

## Connection Information
To connect your frontend to this deployment:
1. Update the WebSocket endpoint URL to: \`http://$IP_ADDRESS:3222\`
2. Test the connection with:
   \`\`\`
   curl http://$IP_ADDRESS:3222/health
   \`\`\`

## Additional Resources
- Log file: $LOG_FILE
- Attestation script: arbitrum-attestation.sh
EOL

echo "Deployment completed successfully!"
echo "Job ID: $JOB_ID"
echo "IP Address: $IP_ADDRESS"
echo "Deployment will run for 24 hours"
echo "Deployment details saved to 24h-deployment-details.md"
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