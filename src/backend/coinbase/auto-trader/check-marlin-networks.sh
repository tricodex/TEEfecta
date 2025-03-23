#!/bin/bash

# Script to check Marlin CVM jobs across multiple networks
# This script attempts to locate jobs on different networks to identify
# where the jobs are actually deployed vs where we're checking.

# Colors for better output readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WALLET_ADDRESS=${1:-"0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"}
JOB_ID=${2:-"0x0000000000000000000000000000000000000000000000000000000000000b66"}
LOG_FILE="marlin-network-check-$(date +%Y%m%d-%H%M%S).log"

# Banner
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}  Marlin CVM Network Debug Utility${NC}"
echo -e "${BLUE}  Checking for jobs across multiple networks${NC}"
echo -e "${BLUE}  Wallet: ${WALLET_ADDRESS}${NC}"
echo -e "${BLUE}  Log File: ${LOG_FILE}${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo ""

# Start log file
echo "Starting Marlin network check at $(date)" > "$LOG_FILE"
echo "Wallet Address: $WALLET_ADDRESS" >> "$LOG_FILE"
echo "Job ID: $JOB_ID" >> "$LOG_FILE"
echo "===========================================================" >> "$LOG_FILE"

# Function to check CLI version and available flags
check_cli_version() {
  echo -e "${CYAN}Checking oyster-cvm CLI version and help...${NC}"
  echo -e "${CYAN}===========================================================${NC}"
  
  # Check version
  echo -e "${YELLOW}CLI Version:${NC}"
  VERSION_OUTPUT=$(oyster-cvm --version 2>&1)
  echo "$VERSION_OUTPUT"
  echo "CLI Version Output:" >> "$LOG_FILE"
  echo "$VERSION_OUTPUT" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  
  # Check general help
  echo -e "\n${YELLOW}CLI Help:${NC}"
  HELP_OUTPUT=$(oyster-cvm --help 2>&1)
  echo "$HELP_OUTPUT"
  echo "CLI Help Output:" >> "$LOG_FILE"
  echo "$HELP_OUTPUT" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  
  # Check list command help specifically
  echo -e "\n${YELLOW}List Command Help:${NC}"
  LIST_HELP=$(oyster-cvm list --help 2>&1)
  echo "$LIST_HELP"
  echo "List Command Help:" >> "$LOG_FILE"
  echo "$LIST_HELP" >> "$LOG_FILE"
  echo "===========================================================" >> "$LOG_FILE"
}

# Function to check for jobs across networks
check_networks() {
  echo -e "${CYAN}Checking for jobs across known networks...${NC}"
  echo -e "${CYAN}===========================================================${NC}"
  echo "Network Job Check:" >> "$LOG_FILE"
  
  # Potential networks to check
  # Try with and without the --network flag to handle different CLI versions
  NETWORKS=("arbitrum" "polygon" "ethereum" "optimism" "base")
  
  # First, try default (no network specified)
  echo -e "\n${YELLOW}Checking default network:${NC}"
  DEFAULT_OUTPUT=$(oyster-cvm list --address "$WALLET_ADDRESS" 2>&1)
  echo "$DEFAULT_OUTPUT"
  echo "Default Network Check:" >> "$LOG_FILE"
  echo "$DEFAULT_OUTPUT" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  
  # Try with specific network flag
  if [[ "$HELP_OUTPUT" == *"--network"* ]] || [[ "$LIST_HELP" == *"--network"* ]]; then
    echo -e "\n${GREEN}Network flag is supported!${NC}"
    echo "Network flag is supported!" >> "$LOG_FILE"
    
    for network in "${NETWORKS[@]}"; do
      echo -e "\n${YELLOW}Checking $network network:${NC}"
      NETWORK_OUTPUT=$(oyster-cvm list --address "$WALLET_ADDRESS" --network "$network" 2>&1)
      echo "$NETWORK_OUTPUT"
      echo "Network $network Check:" >> "$LOG_FILE"
      echo "$NETWORK_OUTPUT" >> "$LOG_FILE"
      echo "" >> "$LOG_FILE"
      
      # Check if jobs were found
      if [[ "$NETWORK_OUTPUT" != *"No active jobs found"* ]] && [[ "$NETWORK_OUTPUT" != *"error"* ]]; then
        echo -e "${GREEN}Found jobs on $network network!${NC}"
        echo "SUCCESS: Found jobs on $network network!" >> "$LOG_FILE"
      fi
    done
  else
    echo -e "\n${RED}Network flag does not appear to be supported by this CLI version${NC}"
    echo "WARNING: Network flag not supported by CLI" >> "$LOG_FILE"
    
    # Try alternative approaches - environment variables
    for network in "${NETWORKS[@]}"; do
      echo -e "\n${YELLOW}Trying $network network via environment variable:${NC}"
      NETWORK_OUTPUT=$(NETWORK="$network" oyster-cvm list --address "$WALLET_ADDRESS" 2>&1)
      echo "$NETWORK_OUTPUT"
      echo "Network $network via env var Check:" >> "$LOG_FILE"
      echo "$NETWORK_OUTPUT" >> "$LOG_FILE"
      echo "" >> "$LOG_FILE"
      
      # Check if jobs were found
      if [[ "$NETWORK_OUTPUT" != *"No active jobs found"* ]] && [[ "$NETWORK_OUTPUT" != *"error"* ]]; then
        echo -e "${GREEN}Found jobs on $network network via env var!${NC}"
        echo "SUCCESS: Found jobs on $network network via env var!" >> "$LOG_FILE"
      fi
    done
  fi
}

# Function to check specific job IDs
check_job_ids() {
  echo -e "\n${CYAN}Checking specific job ID across networks...${NC}"
  echo -e "${CYAN}===========================================================${NC}"
  echo "Job ID Check:" >> "$LOG_FILE"
  
  # Check job ID without network
  echo -e "\n${YELLOW}Checking job ID on default network:${NC}"
  JOBID_OUTPUT=$(oyster-cvm list --job-id "$JOB_ID" 2>&1)
  echo "$JOBID_OUTPUT"
  echo "Default Job ID Check:" >> "$LOG_FILE"
  echo "$JOBID_OUTPUT" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  
  # If network flag is available, try specific networks
  if [[ "$HELP_OUTPUT" == *"--network"* ]] || [[ "$LIST_HELP" == *"--network"* ]]; then
    for network in "${NETWORKS[@]}"; do
      echo -e "\n${YELLOW}Checking job ID on $network network:${NC}"
      JOBID_NETWORK_OUTPUT=$(oyster-cvm list --job-id "$JOB_ID" --network "$network" 2>&1)
      echo "$JOBID_NETWORK_OUTPUT"
      echo "Job ID Check on $network:" >> "$LOG_FILE"
      echo "$JOBID_NETWORK_OUTPUT" >> "$LOG_FILE"
      echo "" >> "$LOG_FILE"
      
      # Check if job was found
      if [[ "$JOBID_NETWORK_OUTPUT" != *"No job found"* ]] && [[ "$JOBID_NETWORK_OUTPUT" != *"error"* ]]; then
        echo -e "${GREEN}Found job on $network network!${NC}"
        echo "SUCCESS: Found job ID on $network network!" >> "$LOG_FILE"
      fi
    done
  fi
}

# Function to query job updates
check_job_updates() {
  echo -e "\n${CYAN}Checking job updates across networks...${NC}"
  echo -e "${CYAN}===========================================================${NC}"
  echo "Job Update Check:" >> "$LOG_FILE"
  
  # Get private key for updates
  echo -e "${YELLOW}Retrieving wallet private key...${NC}"
  MARLIN=$(grep "export MARLIN=" ~/.zshrc | grep -o '"[^"]*"' | sed 's/"//g')
  echo "Private key retrieved (hidden for security)" >> "$LOG_FILE"
  
  # Try update on default network
  echo -e "\n${YELLOW}Trying job update on default network:${NC}"
  UPDATE_OUTPUT=$(oyster-cvm update --wallet-private-key "$MARLIN" --job-id "$JOB_ID" 2>&1)
  echo "$UPDATE_OUTPUT"
  echo "Default Update Check:" >> "$LOG_FILE"
  echo "$UPDATE_OUTPUT" >> "$LOG_FILE"
  echo "" >> "$LOG_FILE"
  
  # If network flag is available, try specific networks
  if [[ "$HELP_OUTPUT" == *"--network"* ]] || [[ "$LIST_HELP" == *"--network"* ]]; then
    for network in "${NETWORKS[@]}"; do
      echo -e "\n${YELLOW}Trying job update on $network network:${NC}"
      UPDATE_NETWORK_OUTPUT=$(oyster-cvm update --wallet-private-key "$MARLIN" --job-id "$JOB_ID" --network "$network" 2>&1)
      echo "$UPDATE_NETWORK_OUTPUT"
      echo "Update Check on $network:" >> "$LOG_FILE"
      echo "$UPDATE_NETWORK_OUTPUT" >> "$LOG_FILE"
      echo "" >> "$LOG_FILE"
      
      # Check if update showed anything useful
      if [[ "$UPDATE_NETWORK_OUTPUT" == *"ip"* ]] || [[ "$UPDATE_NETWORK_OUTPUT" == *"metadata"* ]]; then
        echo -e "${GREEN}Update revealed job information on $network network!${NC}"
        echo "SUCCESS: Update revealed job info on $network network!" >> "$LOG_FILE"
      fi
    done
  fi
}

# Function to check direct control plane
check_control_plane() {
  echo -e "\n${CYAN}Checking direct control plane endpoints...${NC}"
  echo -e "${CYAN}===========================================================${NC}"
  echo "Control Plane Check:" >> "$LOG_FILE"
  
  # Control plane URL
  CP_URL="http://13.202.229.168:8080"
  
  # Try different endpoints
  endpoints=(
    "/job/$JOB_ID"
    "/jobs?wallet=$WALLET_ADDRESS"
    "/status/$JOB_ID"
    "/jobs"
  )
  
  for endpoint in "${endpoints[@]}"; do
    full_url="$CP_URL$endpoint"
    echo -e "\n${YELLOW}Querying: $full_url${NC}"
    cp_output=$(curl -s -X GET "$full_url")
    echo "$cp_output"
    
    echo "Control Plane Query to $full_url:" >> "$LOG_FILE"
    echo "$cp_output" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    
    # Check if we got useful data
    if [ ! -z "$cp_output" ] && [ "$cp_output" != "null" ] && [ "$cp_output" != "{}" ]; then
      echo -e "${GREEN}Received data from control plane!${NC}"
      echo "SUCCESS: Received data from control plane at $full_url" >> "$LOG_FILE"
      
      # Try to extract IP if present
      ip_maybe=$(echo "$cp_output" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
      if [ ! -z "$ip_maybe" ]; then
        echo -e "${GREEN}Found IP address in CP response: $ip_maybe${NC}"
        echo "SUCCESS: Found IP address in CP response: $ip_maybe" >> "$LOG_FILE"
      fi
    else
      echo -e "${RED}No useful data from endpoint${NC}"
      echo "FAIL: No useful data from endpoint $full_url" >> "$LOG_FILE"
    fi
  done
}

# Execute all checks
check_cli_version
check_networks
check_job_ids
check_job_updates
check_control_plane

# Summarize findings
echo -e "\n${CYAN}===========================================================${NC}"
echo -e "${CYAN}Summary of Findings:${NC}"
echo -e "${CYAN}===========================================================${NC}"
echo -e "${YELLOW}1. All checks completed and logged to: ${LOG_FILE}${NC}"

# Check log for successes
SUCCESSES=$(grep "SUCCESS:" "$LOG_FILE" | wc -l)
if [ $SUCCESSES -gt 0 ]; then
  echo -e "${GREEN}2. Found $SUCCESSES potential matches! Check log for details.${NC}"
  echo -e "${GREEN}   Success entries:${NC}"
  grep "SUCCESS:" "$LOG_FILE"
else
  echo -e "${RED}2. No successful matches found in any network.${NC}"
  echo -e "${YELLOW}   Recommended next steps:${NC}"
  echo -e "${YELLOW}   - Verify blockchain transactions are on the expected network${NC}"
  echo -e "${YELLOW}   - Consider checking for CLI version updates${NC}"
  echo -e "${YELLOW}   - Try other job IDs extracted directly from transaction data${NC}"
  echo -e "${YELLOW}   - Examine job lifecycle state management${NC}"
fi

echo -e "\n${BLUE}Debug completed. See $LOG_FILE for full details.${NC}" 