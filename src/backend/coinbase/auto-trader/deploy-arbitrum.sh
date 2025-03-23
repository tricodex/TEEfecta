#!/bin/bash

# Network-aware deployment script for Marlin CVM
# This script explicitly targets Arbitrum network for deployment

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DURATION_MINUTES=60
COMPOSE_FILE="fixed-marlin-compose.yml"
LOG_FILE="arbitrum-deployment-$(date +%Y%m%d-%H%M%S).log"
TARGET_NETWORK="arbitrum"

# Get wallet credentials
export MARLIN=$(grep "export MARLIN=" ~/.zshrc | grep -o '"[^"]*"' | sed 's/"//g')
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Display banner
echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Marlin CVM Deployment - Arbitrum Network${NC}"
echo -e "${BLUE}  Duration: ${DURATION_MINUTES} minutes${NC}"
echo -e "${BLUE}  Wallet: ${WALLET_ADDRESS}${NC}"
echo -e "${BLUE}  Compose File: ${COMPOSE_FILE}${NC}"
echo -e "${BLUE}  Target Network: ${TARGET_NETWORK}${NC}"
echo -e "${BLUE}  Log File: ${LOG_FILE}${NC}"
echo -e "${BLUE}==========================================================${NC}"

# Start logging
echo "Starting Arbitrum deployment at $(date)" | tee -a "$LOG_FILE"
echo "Using wallet address: $WALLET_ADDRESS" | tee -a "$LOG_FILE"
echo "Using fixed compose file: $COMPOSE_FILE" | tee -a "$LOG_FILE"
echo "Target network: $TARGET_NETWORK" | tee -a "$LOG_FILE"

# Check if the network flag is supported
echo -e "${YELLOW}Checking if network flag is supported...${NC}" | tee -a "$LOG_FILE"
NETWORK_SUPPORTED=$(oyster-cvm --help 2>&1 | grep -i "network\|--network")

# Build deployment command based on network flag support
if [[ -n "$NETWORK_SUPPORTED" ]]; then
    echo -e "${GREEN}Network flag is supported!${NC}" | tee -a "$LOG_FILE"
    DEPLOY_CMD="oyster-cvm deploy --wallet-private-key \"$MARLIN\" --duration-in-minutes $DURATION_MINUTES --docker-compose $COMPOSE_FILE --network $TARGET_NETWORK"
else
    echo -e "${YELLOW}Network flag might not be supported, using environment variable approach${NC}" | tee -a "$LOG_FILE"
    DEPLOY_CMD="NETWORK=$TARGET_NETWORK oyster-cvm deploy --wallet-private-key \"$MARLIN\" --duration-in-minutes $DURATION_MINUTES --docker-compose $COMPOSE_FILE"
fi

echo -e "${YELLOW}Deployment command: ${NC}" | tee -a "$LOG_FILE"
echo "$DEPLOY_CMD" | grep -v "private-key" | tee -a "$LOG_FILE"

# Execute deployment command
echo -e "${YELLOW}Executing deployment...${NC}" | tee -a "$LOG_FILE"
eval "$DEPLOY_CMD" 2>&1 | tee -a "$LOG_FILE"

DEPLOY_RESULT=$?
if [ $DEPLOY_RESULT -eq 0 ]; then
    echo -e "${GREEN}Deployment command completed successfully.${NC}" | tee -a "$LOG_FILE"
    
    # Extract Job ID from logs if possible
    JOB_ID=$(grep -o '0x[0-9a-f]\{64\}' "$LOG_FILE" | tail -1)
    if [ -n "$JOB_ID" ]; then
        echo -e "${GREEN}Detected Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
    else
        echo -e "${YELLOW}Could not automatically detect Job ID.${NC}" | tee -a "$LOG_FILE"
        JOB_ID="0x0000000000000000000000000000000000000000000000000000000000000000"
    fi
    
    # Monitor job status
    echo -e "${YELLOW}Monitoring job status on $TARGET_NETWORK...${NC}" | tee -a "$LOG_FILE"
    
    # Define how to check for jobs based on network flag support
    if [[ -n "$NETWORK_SUPPORTED" ]]; then
        LIST_CMD="oyster-cvm list --address $WALLET_ADDRESS --network $TARGET_NETWORK"
    else
        LIST_CMD="NETWORK=$TARGET_NETWORK oyster-cvm list --address $WALLET_ADDRESS"
    fi
    
    # Check every 30 seconds for 5 minutes
    for i in {1..10}; do
        echo -e "\n${YELLOW}Checking job status on $TARGET_NETWORK (attempt $i/10)...${NC}" | tee -a "$LOG_FILE"
        eval "$LIST_CMD" 2>&1 | tee -a "$LOG_FILE"
        
        # Also check for specific job ID
        if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
            echo -e "${YELLOW}Checking specific job ID: $JOB_ID...${NC}" | tee -a "$LOG_FILE"
            
            if [[ -n "$NETWORK_SUPPORTED" ]]; then
                JOB_CMD="oyster-cvm list --job-id $JOB_ID --network $TARGET_NETWORK"
            else
                JOB_CMD="NETWORK=$TARGET_NETWORK oyster-cvm list --job-id $JOB_ID"
            fi
            
            eval "$JOB_CMD" 2>&1 | tee -a "$LOG_FILE"
        fi
        
        # Check control plane directly
        echo -e "${YELLOW}Checking control plane directly...${NC}" | tee -a "$LOG_FILE"
        curl -s "http://13.202.229.168:8080/jobs?wallet=$WALLET_ADDRESS" | tee -a "$LOG_FILE"
        echo -e "\n" | tee -a "$LOG_FILE"
        
        if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
            curl -s "http://13.202.229.168:8080/job/$JOB_ID" | tee -a "$LOG_FILE"
            echo -e "\n" | tee -a "$LOG_FILE"
        fi
        
        # Wait before next check
        if [ $i -lt 10 ]; then
            echo -e "${BLUE}Waiting 30 seconds before next check...${NC}" | tee -a "$LOG_FILE"
            sleep 30
        fi
    done
else
    echo -e "${RED}Deployment command failed.${NC}" | tee -a "$LOG_FILE"
fi

echo -e "${BLUE}Deployment process complete. Results saved to ${LOG_FILE}${NC}"
