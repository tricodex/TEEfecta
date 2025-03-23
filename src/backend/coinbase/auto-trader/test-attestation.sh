#!/bin/bash

# Script to thoroughly test attestation for a Marlin CVM instance
# This script should be run after a successful deployment

# Colors for better readability
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Configuration
LOG_FILE="attestation-test-$(date +%Y%m%d-%H%M%S).log"
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Display banner
echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Marlin CVM Attestation Test - ARBITRUM NETWORK${NC}"
echo -e "${BLUE}  Wallet: $WALLET_ADDRESS${NC}"
echo -e "${BLUE}  Log File: $LOG_FILE${NC}"
echo -e "${BLUE}==========================================================${NC}"

# Get job information
echo -e "${YELLOW}Fetching job information from Arbitrum network...${NC}" | tee -a "$LOG_FILE"
JOB_OUTPUT=$(NETWORK=arbitrum oyster-cvm list --address $WALLET_ADDRESS 2>&1)
echo "$JOB_OUTPUT" | tee -a "$LOG_FILE"

# Check if the job was found
if [[ "$JOB_OUTPUT" == *"No active jobs found"* ]]; then
  echo -e "${RED}No active jobs found for wallet ${WALLET_ADDRESS} on Arbitrum network.${NC}" | tee -a "$LOG_FILE"
  echo "Please make sure the deployment completed successfully before running this test." | tee -a "$LOG_FILE"
  exit 1
fi

# Extract IP address from job output
IP_ADDRESS=$(echo "$JOB_OUTPUT" | grep -o '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}' | head -1)

if [ -z "$IP_ADDRESS" ]; then
  echo -e "${RED}Could not extract IP address from job output.${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

echo -e "${GREEN}Found IP address: $IP_ADDRESS${NC}" | tee -a "$LOG_FILE"

# Extract Job ID if available
JOB_ID=$(echo "$JOB_OUTPUT" | grep -o "0x[0-9a-f]\{64\}" | head -1)
if [ -n "$JOB_ID" ]; then
  echo -e "${GREEN}Found Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
fi

# Check basic connectivity
echo -e "${YELLOW}Testing basic connectivity to $IP_ADDRESS...${NC}" | tee -a "$LOG_FILE"
ping -c 3 $IP_ADDRESS | tee -a "$LOG_FILE"

# Test attestation service port
echo -e "${YELLOW}Testing connection to attestation service (port 1300)...${NC}" | tee -a "$LOG_FILE"
nc -zv $IP_ADDRESS 1300 | tee -a "$LOG_FILE" || echo -e "${RED}Connection to attestation service failed.${NC}" | tee -a "$LOG_FILE"

# Test application port
echo -e "${YELLOW}Testing connection to application service (port 3222)...${NC}" | tee -a "$LOG_FILE"
nc -zv $IP_ADDRESS 3222 | tee -a "$LOG_FILE" || echo -e "${RED}Connection to application service failed.${NC}" | tee -a "$LOG_FILE"

# Test HTTP response from application
echo -e "${YELLOW}Testing HTTP response from application...${NC}" | tee -a "$LOG_FILE"
curl -m 5 -v http://$IP_ADDRESS:3222/ | tee -a "$LOG_FILE" || echo -e "${RED}HTTP request to application failed.${NC}" | tee -a "$LOG_FILE"

# Attempt attestation verification with both AMD64 and ARM64 presets
echo -e "${YELLOW}Attempting attestation verification with ARM64 preset...${NC}" | tee -a "$LOG_FILE"
oyster-cvm verify --enclave-ip $IP_ADDRESS --pcr-preset base/blue/v1.0.0/arm64 2>&1 | tee -a "$LOG_FILE"

echo -e "${YELLOW}Attempting attestation verification with AMD64 preset...${NC}" | tee -a "$LOG_FILE"
oyster-cvm verify --enclave-ip $IP_ADDRESS --pcr-preset base/blue/v1.0.0/amd64 2>&1 | tee -a "$LOG_FILE"

# If we have a compose file, calculate digest and try verification with user data
if [ -f "minimal-docker-compose.yml" ]; then
  echo -e "${YELLOW}Calculating digest from compose file...${NC}" | tee -a "$LOG_FILE"
  DIGEST=$(sha256sum minimal-docker-compose.yml | awk '{print $1}')
  echo "Calculated digest: $DIGEST" | tee -a "$LOG_FILE"
  
  echo -e "${YELLOW}Attempting attestation verification with user data...${NC}" | tee -a "$LOG_FILE"
  oyster-cvm verify --enclave-ip $IP_ADDRESS --pcr-preset base/blue/v1.0.0/arm64 --user-data $DIGEST 2>&1 | tee -a "$LOG_FILE"
fi

echo -e "${BLUE}Attestation testing complete. Results saved to $LOG_FILE${NC}"
