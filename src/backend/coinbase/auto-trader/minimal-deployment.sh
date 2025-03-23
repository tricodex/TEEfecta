#!/bin/bash

# Minimal deployment script with a different region
# This script attempts a minimal deployment to test connectivity

# Colors for better readability
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Configuration - using a different region (us-east-1)
DURATION_MINUTES=15
IMAGE_NAME="alpine:latest"  # Minimal image for testing
REGION="us-east-1"          # Different region
INSTANCE_TYPE="c7g.xlarge"  # ARM instance
PCR_PRESET="base/blue/v1.0.0/arm64"
LOG_FILE="minimal-deployment-$(date +%Y%m%d-%H%M%S).log"

# Get the wallet private key from zshrc
export MARLIN=$(grep "export MARLIN=" ~/.zshrc | grep -o '"[^"]*"' | sed 's/"//g')

# Use the confirmed wallet address
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Display banner
echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Minimal Marlin CVM Deployment - ARBITRUM NETWORK${NC}"
echo -e "${BLUE}  Image: $IMAGE_NAME${NC}"
echo -e "${BLUE}  Duration: $DURATION_MINUTES minutes${NC}"
echo -e "${BLUE}  Region: $REGION${NC}"
echo -e "${BLUE}  Instance Type: $INSTANCE_TYPE${NC}"
echo -e "${BLUE}  PCR Preset: $PCR_PRESET${NC}"
echo -e "${BLUE}  Wallet: $WALLET_ADDRESS${NC}"
echo -e "${BLUE}  Log File: $LOG_FILE${NC}"
echo -e "${BLUE}==========================================================${NC}"

# Confirm deployment
read -p "Proceed with minimal deployment? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Deployment cancelled."
  exit 0
fi

# Start logging
echo "Starting minimal deployment at $(date)" | tee -a "$LOG_FILE"
echo "Using wallet address: $WALLET_ADDRESS" | tee -a "$LOG_FILE"
echo "Region: $REGION" | tee -a "$LOG_FILE"
echo "Instance type: $INSTANCE_TYPE" | tee -a "$LOG_FILE"

# Create a minimal docker-compose file
echo "Creating minimal docker-compose.yml..." | tee -a "$LOG_FILE"
cat > minimal-docker-compose.yml << EOF
services:
  minimal:
    image: alpine:latest
    network_mode: host
    restart: unless-stopped
    command: sh -c "echo 'Starting minimal service' && apk add --no-cache socat && socat -v tcp-listen:3222,fork,reuseaddr exec:'/bin/echo HTTP/1.1 200 OK\\n\\nMinimal Test Service Running'"
EOF

echo "Created minimal-docker-compose.yml" | tee -a "$LOG_FILE"

# Run the deployment command with explicit network and region
echo "Running deployment command..." | tee -a "$LOG_FILE"
DEPLOYMENT_CMD="NETWORK=arbitrum oyster-cvm deploy --wallet-private-key \"$MARLIN\" --duration-in-minutes $DURATION_MINUTES --docker-compose minimal-docker-compose.yml --region $REGION --instance-type $INSTANCE_TYPE --debug"
echo "Command: ${DEPLOYMENT_CMD/--wallet-private-key \"$MARLIN\"/--wallet-private-key \"REDACTED\"}" | tee -a "$LOG_FILE"

eval "$DEPLOYMENT_CMD" 2>&1 | tee -a "$LOG_FILE"
DEPLOY_STATUS=${PIPESTATUS[0]}

# Check if deployment was successful
if [ $DEPLOY_STATUS -eq 0 ]; then
  echo -e "${GREEN}Deployment command completed successfully.${NC}" | tee -a "$LOG_FILE"
  
  # Extract job ID from logs if possible
  JOB_ID=$(grep -o "0x[0-9a-f]\{64\}" "$LOG_FILE" | tail -1)
  if [ -n "$JOB_ID" ]; then
    echo -e "${GREEN}Extracted Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
  else
    echo -e "${YELLOW}Could not extract Job ID from logs.${NC}" | tee -a "$LOG_FILE"
    JOB_ID="UNKNOWN"
  fi
  
  echo "Waiting for job to initialize (may take 5-10 minutes)..." | tee -a "$LOG_FILE"
  echo "You can monitor job status with:" | tee -a "$LOG_FILE"
  echo "NETWORK=arbitrum oyster-cvm list --address $WALLET_ADDRESS" | tee -a "$LOG_FILE"
  
else
  echo -e "${RED}Deployment command failed.${NC}" | tee -a "$LOG_FILE"
fi

echo "Minimal deployment process complete. Results saved to $LOG_FILE"
