#!/bin/bash

# Job monitoring script for Marlin CVM
# This script will continuously monitor a job for IP address and status

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set job ID from args or environment
JOB_ID=${1:-${JOB_ID}}

if [ -z "$JOB_ID" ]; then
  echo -e "${RED}Error: No job ID provided${NC}"
  echo "Usage: ./monitor-job.sh <job_id>"
  exit 1
fi

# Get the wallet address
MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')
if [ -z "$MARLIN" ]; then
  echo -e "${RED}Error: Could not retrieve MARLIN private key${NC}"
  exit 1
fi

WALLET_ADDRESS=$(node -e "console.log(new require('ethers').Wallet('$MARLIN').address)")
echo -e "${BLUE}Monitoring job ${JOB_ID} for wallet ${WALLET_ADDRESS}${NC}"

# Create a log file
LOG_FILE="job-monitor-$(date +%Y%m%d-%H%M%S).log"
echo "Starting job monitoring at $(date)" | tee -a "$LOG_FILE"
echo "Job ID: $JOB_ID" | tee -a "$LOG_FILE"
echo "Wallet Address: $WALLET_ADDRESS" | tee -a "$LOG_FILE"

# Function to check job status
check_job_status() {
  echo -e "${YELLOW}Checking active jobs for wallet...${NC}" | tee -a "$LOG_FILE"
  oyster_output=$(oyster-cvm list --address $WALLET_ADDRESS 2>&1)
  echo "$oyster_output" | tee -a "$LOG_FILE"
  
  if [[ $oyster_output == *"No active jobs"* ]]; then
    echo -e "${RED}No active jobs found at $(date)${NC}" | tee -a "$LOG_FILE"
    return 1
  fi
  
  # If we found an IP, extract it
  if [[ $oyster_output == *"IP:"* ]]; then
    IP=$(echo "$oyster_output" | grep -o "IP: [0-9.]*" | cut -d' ' -f2)
    if [ ! -z "$IP" ]; then
      echo -e "${GREEN}Found IP address: $IP${NC}" | tee -a "$LOG_FILE"
      return 0
    fi
  fi
  
  echo -e "${YELLOW}Job exists but no IP found yet at $(date)${NC}" | tee -a "$LOG_FILE"
  return 2
}

# Function to try direct connection to control plane
try_direct_cp_query() {
  echo -e "${YELLOW}Trying direct control plane query...${NC}" | tee -a "$LOG_FILE"
  cp_url="http://13.202.229.168:8080/job/$JOB_ID"
  echo "Querying $cp_url" | tee -a "$LOG_FILE"
  
  cp_output=$(curl -s -X GET "$cp_url")
  if [ ! -z "$cp_output" ]; then
    echo "Control plane response:" | tee -a "$LOG_FILE"
    echo "$cp_output" | tee -a "$LOG_FILE"
    
    # Try to extract IP if present
    ip_maybe=$(echo "$cp_output" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$ip_maybe" ]; then
      echo -e "${GREEN}Found IP address in CP response: $ip_maybe${NC}" | tee -a "$LOG_FILE"
      IP=$ip_maybe
      return 0
    fi
  else
    echo "No response from control plane" | tee -a "$LOG_FILE"
  fi
  return 1
}

# Try to update job to get more details
try_job_update() {
  echo -e "${YELLOW}Trying job update to get more details...${NC}" | tee -a "$LOG_FILE"
  update_output=$(oyster-cvm update --wallet-private-key "$MARLIN" --job-id $JOB_ID 2>&1)
  echo "$update_output" | tee -a "$LOG_FILE"
  
  # Look for IP in the output
  if [[ $update_output == *"ip"* ]]; then
    ip_maybe=$(echo "$update_output" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$ip_maybe" ]; then
      echo -e "${GREEN}Found IP address in update response: $ip_maybe${NC}" | tee -a "$LOG_FILE"
      IP=$ip_maybe
      return 0
    fi
  fi
  return 1
}

# Main monitoring loop
max_attempts=40  # Check for 20 minutes (30 seconds interval)
attempt=1
IP=""

while [ $attempt -le $max_attempts ]; do
  echo -e "\n${BLUE}Attempt $attempt/$max_attempts - $(date)${NC}" | tee -a "$LOG_FILE"
  
  # First check job status with list command
  check_job_status
  status=$?
  
  if [ $status -eq 0 ]; then
    # We found the IP
    break
  elif [ $status -eq 1 ]; then
    # No jobs found, try direct query to CP
    try_direct_cp_query
    if [ $? -eq 0 ]; then
      break
    fi
    
    # Try job update as last resort
    try_job_update
    if [ $? -eq 0 ]; then
      break
    fi
  fi
  
  # Sleep before next attempt
  echo -e "${YELLOW}Waiting 30 seconds before next check...${NC}" | tee -a "$LOG_FILE"
  sleep 30
  ((attempt++))
done

# Final status
if [ ! -z "$IP" ]; then
  echo -e "\n${GREEN}===========================================================${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}Job monitoring completed successfully!${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}IP Address: $IP${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}Log File: $LOG_FILE${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}===========================================================${NC}" | tee -a "$LOG_FILE"
  
  # Test connection to the service
  echo -e "\n${BLUE}Testing connection to server...${NC}" | tee -a "$LOG_FILE"
  curl -v "http://$IP:3222/" 2>&1 | tee -a "$LOG_FILE"
  
  # Display how to check logs
  echo -e "\n${BLUE}To check logs: oyster-cvm logs --ip $IP${NC}" | tee -a "$LOG_FILE"
  
  exit 0
else
  echo -e "\n${RED}===========================================================${NC}" | tee -a "$LOG_FILE"
  echo -e "${RED}Failed to obtain IP address after $max_attempts attempts${NC}" | tee -a "$LOG_FILE"
  echo -e "${RED}Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
  echo -e "${RED}Log File: $LOG_FILE${NC}" | tee -a "$LOG_FILE"
  echo -e "${RED}===========================================================${NC}" | tee -a "$LOG_FILE"
  
  echo -e "\n${YELLOW}Possible solutions:${NC}" | tee -a "$LOG_FILE"
  echo "1. Wait longer - it can take up to 5 minutes for the IP to be assigned" | tee -a "$LOG_FILE"
  echo "2. Check transaction status on blockchain explorer" | tee -a "$LOG_FILE"
  echo "3. Try simplified deployment with different instance type" | tee -a "$LOG_FILE"
  echo "4. Contact Marlin support with your job ID and transaction hashes" | tee -a "$LOG_FILE"
  
  exit 1
fi 