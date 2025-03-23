#!/bin/bash

# Enhanced multi-network job monitoring script
# This script systematically checks for jobs across all networks and via direct control plane queries

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
LOG_FILE="enhanced-network-monitor-$(date +%Y%m%d-%H%M%S).log"
CP_URL="http://13.202.229.168:8080"  # Control plane URL
NETWORKS=("arbitrum" "polygon" "ethereum" "optimism" "base")
MAX_ATTEMPTS=30  # 15 minutes (30 checks * 30 second interval)
INTERVAL=30  # Seconds between checks

# Display banner
echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Enhanced Multi-Network Job Monitor${NC}"
echo -e "${BLUE}  Wallet: ${WALLET_ADDRESS}${NC}"
if [ -n "$JOB_ID" ]; then
    echo -e "${BLUE}  Job ID: ${JOB_ID}${NC}"
fi
echo -e "${BLUE}  Networks: ${NETWORKS[@]}${NC}"
echo -e "${BLUE}  Log File: ${LOG_FILE}${NC}"
echo -e "${BLUE}  Max Attempts: ${MAX_ATTEMPTS} (${MAX_ATTEMPTS} * ${INTERVAL}s = $(($MAX_ATTEMPTS * $INTERVAL / 60)) min)${NC}"
echo -e "${BLUE}==========================================================${NC}"

# Start logging
echo "Starting enhanced multi-network job monitoring at $(date)" | tee -a "$LOG_FILE"
echo "Wallet address: $WALLET_ADDRESS" | tee -a "$LOG_FILE"
if [ -n "$JOB_ID" ]; then
    echo "Job ID: $JOB_ID" | tee -a "$LOG_FILE"
fi

# Function to check a specific network
check_network() {
    local network=$1
    echo -e "\n${CYAN}==============================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}Checking network: ${network}${NC}" | tee -a "$LOG_FILE"
    echo -e "${CYAN}==============================================${NC}" | tee -a "$LOG_FILE"
    
    # List jobs by wallet address
    echo -e "${YELLOW}Listing jobs for wallet on $network...${NC}" | tee -a "$LOG_FILE"
    NETWORK="$network" oyster-cvm list --address "$WALLET_ADDRESS" 2>&1 | tee -a "$LOG_FILE"
    
    # Direct control plane query
    echo -e "\n${YELLOW}Querying control plane for $network...${NC}" | tee -a "$LOG_FILE"
    CP_RESPONSE=$(curl -s "${CP_URL}/jobs?wallet=${WALLET_ADDRESS}&network=${network}")
    echo "$CP_RESPONSE" | tee -a "$LOG_FILE"
    echo -e "\n" | tee -a "$LOG_FILE"
    
    # Check specific job ID if provided
    if [ -n "$JOB_ID" ]; then
        echo -e "\n${YELLOW}Checking specific job on $network: $JOB_ID${NC}" | tee -a "$LOG_FILE"
        JOB_RESPONSE=$(curl -s "${CP_URL}/job/${JOB_ID}?network=${network}")
        echo "$JOB_RESPONSE" | tee -a "$LOG_FILE"
        echo -e "\n" | tee -a "$LOG_FILE"
        
        # Check if job details were returned
        if [[ "$JOB_RESPONSE" != "" && "$JOB_RESPONSE" != "{}" && "$JOB_RESPONSE" != "null" ]]; then
            echo -e "${GREEN}Found job details on $network!${NC}" | tee -a "$LOG_FILE"
            JOB_FOUND=true
            FOUND_NETWORK="$network"
            
            # Extract IP if present
            IP=$(echo "$JOB_RESPONSE" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
            if [ -n "$IP" ]; then
                echo -e "${GREEN}IP address found: $IP${NC}" | tee -a "$LOG_FILE"
                FOUND_IP="$IP"
            fi
        fi
    fi
    
    # Check general jobs list
    if [[ "$CP_RESPONSE" != "" && "$CP_RESPONSE" != "[]" && "$CP_RESPONSE" != "{}" && "$CP_RESPONSE" != "null" ]]; then
        echo -e "${GREEN}Found jobs for wallet on $network!${NC}" | tee -a "$LOG_FILE"
        JOB_FOUND=true
        FOUND_NETWORK="$network"
        
        # Extract job IDs
        JOB_IDS=$(echo "$CP_RESPONSE" | grep -o '"id":"[0-9a-fx]*"' | cut -d'"' -f4)
        if [ -n "$JOB_IDS" ]; then
            echo -e "${GREEN}Found job IDs: $JOB_IDS${NC}" | tee -a "$LOG_FILE"
            
            # Check each job for IP
            for job in $JOB_IDS; do
                JOB_DETAILS=$(curl -s "${CP_URL}/job/${job}?network=${network}")
                IP=$(echo "$JOB_DETAILS" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
                if [ -n "$IP" ]; then
                    echo -e "${GREEN}IP address found for job $job: $IP${NC}" | tee -a "$LOG_FILE"
                    FOUND_IP="$IP"
                    FOUND_JOB_ID="$job"
                fi
            done
        fi
    fi
}

# Function to test a server connection
test_server() {
    local ip=$1
    echo -e "\n${YELLOW}Testing connection to server at $ip:3222...${NC}" | tee -a "$LOG_FILE"
    SERVER_RESPONSE=$(curl -s -m 5 "http://$ip:3222/")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Connection successful!${NC}" | tee -a "$LOG_FILE"
        echo "Server response: $SERVER_RESPONSE" | tee -a "$LOG_FILE"
        CONNECTED=true
    else
        echo -e "${RED}Connection failed.${NC}" | tee -a "$LOG_FILE"
        # Try another approach
        NC_OUTPUT=$(nc -z -v -w 5 "$ip" 3222 2>&1)
        echo "$NC_OUTPUT" | tee -a "$LOG_FILE"
        if [[ "$NC_OUTPUT" == *"succeeded!"* ]]; then
            echo -e "${GREEN}Port is open but HTTP request failed.${NC}" | tee -a "$LOG_FILE"
            CONNECTED=true
        fi
    fi
}

# Main monitoring loop
JOB_FOUND=false
CONNECTED=false
FOUND_NETWORK=""
FOUND_IP=""
FOUND_JOB_ID=""

for attempt in $(seq 1 $MAX_ATTEMPTS); do
    echo -e "\n${BLUE}==========================================================${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}Monitoring Attempt $attempt/$MAX_ATTEMPTS - $(date)${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}==========================================================${NC}" | tee -a "$LOG_FILE"
    
    # Check default network first (no network specified)
    echo -e "\n${CYAN}Checking default network settings...${NC}" | tee -a "$LOG_FILE"
    DEFAULT_OUTPUT=$(oyster-cvm list --address "$WALLET_ADDRESS" 2>&1)
    echo "$DEFAULT_OUTPUT" | tee -a "$LOG_FILE"
    
    # Check each network
    for network in "${NETWORKS[@]}"; do
        check_network "$network"
        
        # If we found a job with an IP, try to connect to it
        if [ -n "$FOUND_IP" ] && [ "$CONNECTED" = false ]; then
            test_server "$FOUND_IP"
            
            # If we successfully connected, no need to check other networks
            if [ "$CONNECTED" = true ]; then
                break 2  # Break out of both loops
            fi
        fi
    done
    
    # If we found a job with an IP and connected successfully, we're done
    if [ "$JOB_FOUND" = true ] && [ "$CONNECTED" = true ]; then
        echo -e "\n${GREEN}Successfully found job and connected to server!${NC}" | tee -a "$LOG_FILE"
        break
    fi
    
    # If we've reached max attempts, break
    if [ $attempt -eq $MAX_ATTEMPTS ]; then
        echo -e "\n${RED}Reached maximum monitoring attempts without success.${NC}" | tee -a "$LOG_FILE"
        break
    fi
    
    # Wait before next attempt
    echo -e "\n${BLUE}Waiting $INTERVAL seconds before next check...${NC}" | tee -a "$LOG_FILE"
    sleep $INTERVAL
done

# Final summary
echo -e "\n${BLUE}==========================================================${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}Monitoring Summary${NC}" | tee -a "$LOG_FILE"
echo -e "${BLUE}==========================================================${NC}" | tee -a "$LOG_FILE"

if [ "$JOB_FOUND" = true ]; then
    echo -e "${GREEN}Job found on network: $FOUND_NETWORK${NC}" | tee -a "$LOG_FILE"
    if [ -n "$FOUND_JOB_ID" ]; then
        echo -e "${GREEN}Job ID: $FOUND_JOB_ID${NC}" | tee -a "$LOG_FILE"
    elif [ -n "$JOB_ID" ]; then
        echo -e "${GREEN}Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
    fi
    
    if [ -n "$FOUND_IP" ]; then
        echo -e "${GREEN}IP Address: $FOUND_IP${NC}" | tee -a "$LOG_FILE"
        if [ "$CONNECTED" = true ]; then
            echo -e "${GREEN}Successfully connected to server at http://$FOUND_IP:3222/${NC}" | tee -a "$LOG_FILE"
            echo -e "${YELLOW}To check logs: NETWORK=$FOUND_NETWORK oyster-cvm logs --ip $FOUND_IP${NC}" | tee -a "$LOG_FILE"
        else
            echo -e "${YELLOW}Could not connect to server, may still be initializing.${NC}" | tee -a "$LOG_FILE"
            echo -e "${YELLOW}Try manual connection: curl http://$FOUND_IP:3222/${NC}" | tee -a "$LOG_FILE"
        fi
    else
        echo -e "${YELLOW}No IP address found yet, job may still be initializing.${NC}" | tee -a "$LOG_FILE"
    fi
    
    echo -e "\n${YELLOW}To use this job in the future:${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}NETWORK=$FOUND_NETWORK oyster-cvm list --address $WALLET_ADDRESS${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}NETWORK=$FOUND_NETWORK oyster-cvm logs --ip <IP_ADDRESS>${NC}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}No jobs found after $MAX_ATTEMPTS attempts.${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}Deployment transactions may have succeeded on-chain but jobs are not visible yet.${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}Potential issues:${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}1. Control plane synchronization delay - wait longer (up to 30 minutes)${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}2. Deployment parameters incompatibility - try different instance type${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}3. Network configuration issues - try direct image deployment${NC}" | tee -a "$LOG_FILE"
    echo -e "${YELLOW}4. Docker image accessibility problems - ensure image is public${NC}" | tee -a "$LOG_FILE"
fi

echo -e "\n${BLUE}Monitoring complete. Full logs available at: $LOG_FILE${NC}" | tee -a "$LOG_FILE"
