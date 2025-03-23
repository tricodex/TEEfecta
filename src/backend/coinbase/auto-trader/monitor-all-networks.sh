#!/bin/bash

# Comprehensive job monitoring script that checks all networks 
# This script will find your jobs regardless of which network they're on

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WALLET_ADDRESS=${1:-"0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"}
JOB_ID=${2:-""}
LOG_FILE="multinetwork-job-monitor-$(date +%Y%m%d-%H%M%S).log"
CP_URL="http://13.202.229.168:8080"  # Control plane URL
NETWORKS=("arbitrum" "polygon" "ethereum" "optimism" "base")

# Display banner
echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Multi-Network Job Monitor${NC}"
echo -e "${BLUE}  Wallet: ${WALLET_ADDRESS}${NC}"
if [ -n "$JOB_ID" ]; then
    echo -e "${BLUE}  Job ID: ${JOB_ID}${NC}"
fi
echo -e "${BLUE}  Networks: ${NETWORKS[@]}${NC}"
echo -e "${BLUE}  Log File: ${LOG_FILE}${NC}"
echo -e "${BLUE}==========================================================${NC}"

# Start logging
echo "Starting multi-network job monitoring at $(date)" | tee -a "$LOG_FILE"
echo "Wallet address: $WALLET_ADDRESS" | tee -a "$LOG_FILE"
if [ -n "$JOB_ID" ]; then
    echo "Job ID: $JOB_ID" | tee -a "$LOG_FILE"
fi

# Check if the network flag is supported
echo -e "${YELLOW}Checking if network flag is supported...${NC}" | tee -a "$LOG_FILE"
HELP_OUTPUT=$(oyster-cvm --help 2>&1)
LIST_HELP=$(oyster-cvm list --help 2>&1)

NETWORK_SUPPORTED=false
if [[ "$HELP_OUTPUT" == *"--network"* ]] || [[ "$LIST_HELP" == *"--network"* ]]; then
    echo -e "${GREEN}Network flag is supported!${NC}" | tee -a "$LOG_FILE"
    NETWORK_SUPPORTED=true
else
    echo -e "${YELLOW}Network flag might not be supported, using environment variable approach${NC}" | tee -a "$LOG_FILE"
fi

# Function to check a specific network
check_network() {
    local network=$1
    echo -e "\n${CYAN}==============================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}Checking network: ${network}${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}==============================================${NC}" | tee -a "$LOG_FILE"
    
    # List jobs by wallet address
    echo -e "${YELLOW}Listing jobs for wallet on $network...${NC}" | tee -a "$LOG_FILE"
    if [ "$NETWORK_SUPPORTED" = true ]; then
        oyster-cvm list --address "$WALLET_ADDRESS" --network "$network" 2>&1 | tee -a "$LOG_FILE"
    else
        NETWORK="$network" oyster-cvm list --address "$WALLET_ADDRESS" 2>&1 | tee -a "$LOG_FILE"
    fi
    
    # Check specific job ID if provided
    if [ -n "$JOB_ID" ]; then
        echo -e "\n${YELLOW}Checking specific job ID on $network: $JOB_ID${NC}" | tee -a "$LOG_FILE"
        if [ "$NETWORK_SUPPORTED" = true ]; then
            oyster-cvm list --job-id "$JOB_ID" --network "$network" 2>&1 | tee -a "$LOG_FILE"
        else
            NETWORK="$network" oyster-cvm list --job-id "$JOB_ID" 2>&1 | tee -a "$LOG_FILE"
        fi
    fi
    
    # Check control plane directly
    echo -e "\n${YELLOW}Querying control plane for $network...${NC}" | tee -a "$LOG_FILE"
    curl -s "${CP_URL}/jobs?wallet=${WALLET_ADDRESS}&network=${network}" | tee -a "$LOG_FILE"
    echo -e "\n" | tee -a "$LOG_FILE"
    
    if [ -n "$JOB_ID" ]; then
        curl -s "${CP_URL}/job/${JOB_ID}?network=${network}" | tee -a "$LOG_FILE"
        echo -e "\n" | tee -a "$LOG_FILE"
    fi
    
    # Check for success indicators
    if [ -n "$(grep -i "ip" "$LOG_FILE" | tail -20)" ]; then
        echo -e "${GREEN}Found IP address information on $network!${NC}" | tee -a "$LOG_FILE"
        HAS_JOBS=true
        if [ -z "$FOUND_NETWORK" ]; then
            FOUND_NETWORK="$network"
        fi
    fi
    
    if [ -n "$(grep -i "status.*running" "$LOG_FILE" | tail -20)" ]; then
        echo -e "${GREEN}Found running job on $network!${NC}" | tee -a "$LOG_FILE"
        HAS_JOBS=true
        if [ -z "$FOUND_NETWORK" ]; then
            FOUND_NETWORK="$network"
        fi
    fi
}

# Check default network first (no network specified)
echo -e "\n${CYAN}==============================================${NC}" | tee -a "$LOG_FILE"
echo -e "${CYAN}Checking default network${NC}" | tee -a "$LOG_FILE"
echo -e "${CYAN}==============================================${NC}" | tee -a "$LOG_FILE"

oyster-cvm list --address "$WALLET_ADDRESS" 2>&1 | tee -a "$LOG_FILE"

if [ -n "$JOB_ID" ]; then
    echo -e "\n${YELLOW}Checking specific job ID on default network: $JOB_ID${NC}" | tee -a "$LOG_FILE"
    oyster-cvm list --job-id "$JOB_ID" 2>&1 | tee -a "$LOG_FILE"
fi

# Check all networks
HAS_JOBS=false
FOUND_NETWORK=""

for network in "${NETWORKS[@]}"; do
    check_network "$network"
done

# Summary
echo -e "\n${CYAN}==============================================${NC}" | tee -a "$LOG_FILE"
echo -e "${CYAN}Job Search Summary${NC}" | tee -a "$LOG_FILE"
echo -e "${CYAN}==============================================${NC}" | tee -a "$LOG_FILE"

if [ "$HAS_JOBS" = true ]; then
    echo -e "${GREEN}Found jobs for wallet ${WALLET_ADDRESS}!${NC}" | tee -a "$LOG_FILE"
    echo -e "${GREEN}Jobs detected on network: ${FOUND_NETWORK}${NC}" | tee -a "$LOG_FILE"
    
    echo -e "\n${YELLOW}To work with these jobs in the future, use:${NC}" | tee -a "$LOG_FILE"
    if [ "$NETWORK_SUPPORTED" = true ]; then
        echo -e "${YELLOW}oyster-cvm list --address $WALLET_ADDRESS --network $FOUND_NETWORK${NC}" | tee -a "$LOG_FILE"
        if [ -n "$JOB_ID" ]; then
            echo -e "${YELLOW}oyster-cvm list --job-id $JOB_ID --network $FOUND_NETWORK${NC}" | tee -a "$LOG_FILE"
        fi
    else
        echo -e "${YELLOW}NETWORK=$FOUND_NETWORK oyster-cvm list --address $WALLET_ADDRESS${NC}" | tee -a "$LOG_FILE"
        if [ -n "$JOB_ID" ]; then
            echo -e "${YELLOW}NETWORK=$FOUND_NETWORK oyster-cvm list --job-id $JOB_ID${NC}" | tee -a "$LOG_FILE"
        fi
    fi
else
    echo -e "${RED}No jobs found for wallet ${WALLET_ADDRESS} on any network.${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}Possible reasons:${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}1. Deployment transactions are still processing${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}2. Jobs might be on a network not checked (other than ${NETWORKS[@]})${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}3. The control plane might be experiencing synchronization issues${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}4. The jobs might have been terminated${NC}" | tee -a "$LOG_FILE"
fi

echo -e "\n${BLUE}Job monitoring complete. Results saved to ${LOG_FILE}${NC}"
