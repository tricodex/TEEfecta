#!/bin/bash

# Minimal Deployment Script for Arbitrum with Attestation
# This script creates and deploys a minimal Docker Compose file specifically for testing attestation

# Colors for better readability
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Configuration
LOG_FILE="minimal-deploy-$(date +%Y%m%d-%H%M%S).log"
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"
# Get the wallet private key from environment variable
if [ -z "$MARLIN" ]; then
  echo -e "${RED}Error: MARLIN environment variable not set. Please set it to your private key.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi
DOCKER_COMPOSE_FILE="minimal-docker-compose.yml"
NETWORK="arbitrum"

# Display banner
echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Minimal Arbitrum Deployment with Attestation${NC}"
echo -e "${BLUE}  Wallet: $WALLET_ADDRESS${NC}"
echo -e "${BLUE}  Docker Compose: $DOCKER_COMPOSE_FILE${NC}"
echo -e "${BLUE}  Network: $NETWORK${NC}"
echo -e "${BLUE}  Log File: $LOG_FILE${NC}"
echo -e "${BLUE}==========================================================${NC}"

echo "Starting minimal deployment at $(date)" | tee -a "$LOG_FILE"

# Check if compose file exists
if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
  echo -e "${RED}Error: Docker Compose file '$DOCKER_COMPOSE_FILE' not found.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

# Verify Marlin CLI is installed
if ! command -v oyster-cvm &> /dev/null; then
  echo -e "${RED}Error: oyster-cvm command not found. Please install Marlin CLI.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

# Compute digest
echo -e "${YELLOW}Computing docker-compose digest...${NC}" | tee -a "$LOG_FILE"
DIGEST=$(oyster-cvm compute-digest --docker-compose "$DOCKER_COMPOSE_FILE" 2>&1)

if [[ "$DIGEST" != *"c2131afec4fb1a03728113f1bfb8d8893cb590b40b2282d54bfdc6662b88a8e5"* ]]; then
  echo -e "${YELLOW}Digest: $DIGEST${NC}" | tee -a "$LOG_FILE"
  echo -e "${YELLOW}Warning: Digest may have changed. Update the arbitrum-attestation.sh script if needed.${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${GREEN}Digest matches expected value: $DIGEST${NC}" | tee -a "$LOG_FILE"
fi

# Choose an instance type
INSTANCE_TYPE="c7g.xlarge"
echo -e "${YELLOW}Using instance type: $INSTANCE_TYPE (ARM64)${NC}" | tee -a "$LOG_FILE"

# Deploy to Marlin
echo -e "${YELLOW}Deploying to Marlin on $NETWORK network...${NC}" | tee -a "$LOG_FILE"
DEPLOY_COMMAND="NETWORK=$NETWORK oyster-cvm deploy --wallet-private-key \"\$MARLIN\" --docker-compose $DOCKER_COMPOSE_FILE --instance $INSTANCE_TYPE --debug"
echo "Running: ${DEPLOY_COMMAND/--wallet-private-key \"\$MARLIN\"/--wallet-private-key \"REDACTED\"}" | tee -a "$LOG_FILE"
eval $DEPLOY_COMMAND | tee -a "$LOG_FILE"

# Check for deployment success
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Deployment initiated successfully!${NC}" | tee -a "$LOG_FILE"
  
  # Extract job ID if possible
  JOB_ID=$(grep -o "Job ID: 0x[0-9a-f]*" "$LOG_FILE" | tail -1 | cut -d' ' -f3 || echo "Unknown")
  echo -e "${GREEN}Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
  
  # Update attestation script with new job ID if found
  if [[ "$JOB_ID" != "Unknown" ]]; then
    echo -e "${YELLOW}Updating arbitrum-attestation.sh with new Job ID...${NC}" | tee -a "$LOG_FILE"
    sed -i '' "s/JOB_ID=\"0x[0-9a-f]*\"/JOB_ID=\"$JOB_ID\"/" arbitrum-attestation.sh
    echo -e "${GREEN}arbitrum-attestation.sh updated with Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
  fi
  
  # Start monitoring
  echo -e "${YELLOW}Starting job monitoring...${NC}" | tee -a "$LOG_FILE"
  echo "This may take up to 5 minutes for the job to become active." | tee -a "$LOG_FILE"
  
  # Monitor job status
  MAX_ATTEMPTS=30
  for ((i=1; i<=MAX_ATTEMPTS; i++)); do
    echo -e "${YELLOW}Monitoring attempt $i/$MAX_ATTEMPTS...${NC}" | tee -a "$LOG_FILE"
    
    JOB_STATUS=$(NETWORK=$NETWORK oyster-cvm list --address $WALLET_ADDRESS 2>&1)
    echo "$JOB_STATUS" | tee -a "$LOG_FILE"
    
    # Check if IP address is found
    IP_ADDRESS=$(echo "$JOB_STATUS" | grep -o '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}' | head -1)
    
    if [ -n "$IP_ADDRESS" ]; then
      echo -e "${GREEN}IP Address found: $IP_ADDRESS${NC}" | tee -a "$LOG_FILE"
      
      # Update attestation script with new IP
      echo -e "${YELLOW}Updating arbitrum-attestation.sh with new IP Address...${NC}" | tee -a "$LOG_FILE"
      sed -i '' "s/IP_ADDRESS=\"[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\"/IP_ADDRESS=\"$IP_ADDRESS\"/" arbitrum-attestation.sh
      echo -e "${GREEN}arbitrum-attestation.sh updated with IP: $IP_ADDRESS${NC}" | tee -a "$LOG_FILE"
      
      # Wait for services to be ready
      echo -e "${YELLOW}Waiting for services to be ready...${NC}" | tee -a "$LOG_FILE"
      sleep 60
      
      echo -e "${GREEN}Deployment complete! Ready for attestation.${NC}" | tee -a "$LOG_FILE"
      echo -e "${GREEN}Run ./arbitrum-attestation.sh to verify attestation.${NC}" | tee -a "$LOG_FILE"
      break
    else
      echo -e "${YELLOW}IP Address not found yet. Waiting 30 seconds...${NC}" | tee -a "$LOG_FILE"
      sleep 30
    fi
    
    # Exit if max attempts reached
    if [ $i -eq $MAX_ATTEMPTS ]; then
      echo -e "${RED}Maximum monitoring attempts reached. Please check job status manually.${NC}" | tee -a "$LOG_FILE"
      echo -e "${YELLOW}Run: NETWORK=$NETWORK oyster-cvm list --address $WALLET_ADDRESS${NC}" | tee -a "$LOG_FILE"
    fi
  done
else
  echo -e "${RED}Deployment failed. See log for details.${NC}" | tee -a "$LOG_FILE"
fi

echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Deployment process complete.${NC}"
echo -e "${BLUE}  Results saved to $LOG_FILE${NC}"
echo -e "${BLUE}  Run ./arbitrum-attestation.sh to verify attestation${NC}"
echo -e "${BLUE}==========================================================${NC}" 