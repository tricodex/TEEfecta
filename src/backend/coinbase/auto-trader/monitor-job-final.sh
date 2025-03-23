#!/bin/bash

# Enhanced Job monitoring script for Marlin CVM
# This script will continuously monitor a job for IP address and status with improved error handling

# Color codes for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
JOB_ID=${1:-"0x0000000000000000000000000000000000000000000000000000000000000b66"}
LOG_FILE="job-monitor-final-$(date +%Y%m%d-%H%M%S).log"
MAX_ATTEMPTS=120  # Check for 20 minutes (10 seconds interval)
INTERVAL=10  # Seconds between checks
CP_URL="http://13.202.229.168:8080"  # Control plane URL

# Get the wallet private key - fixed extraction
echo -e "${BLUE}Retrieving wallet credentials...${NC}"
export MARLIN=$(grep "export MARLIN=" ~/.zshrc | grep -o '"[^"]*"' | sed 's/"//g')
echo "Private key retrieved (hidden for security)"

# Use hardcoded wallet address (known from previous runs)
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"
echo -e "${GREEN}Wallet address: ${WALLET_ADDRESS}${NC}"

# Display banner
echo "=========================================================="
echo "  Enhanced Marlin CVM Job Monitoring - Final Version"
echo "  Job ID: $JOB_ID"
echo "  Wallet: $WALLET_ADDRESS"
echo "  Log File: $LOG_FILE"
echo "=========================================================="

# Start logging
echo "Starting job monitoring at $(date)" | tee -a "$LOG_FILE"
echo "Job ID: $JOB_ID" | tee -a "$LOG_FILE"
echo "Wallet address: $WALLET_ADDRESS" | tee -a "$LOG_FILE"

# Function to check control plane directly
check_control_plane() {
  echo -e "${YELLOW}Trying direct control plane query...${NC}" | tee -a "$LOG_FILE"
  echo "Querying $CP_URL/job/$JOB_ID" | tee -a "$LOG_FILE"
  
  # Try different endpoints
  endpoints=(
    "/job/$JOB_ID"
    "/jobs?wallet=$WALLET_ADDRESS"
    "/status/$JOB_ID"
  )
  
  for endpoint in "${endpoints[@]}"; do
    full_url="$CP_URL$endpoint"
    echo "Trying endpoint: $full_url" | tee -a "$LOG_FILE"
    cp_output=$(curl -s -X GET "$full_url")
    
    if [ ! -z "$cp_output" ] && [ "$cp_output" != "null" ] && [ "$cp_output" != "{}" ]; then
      echo "Control plane response from $endpoint:" | tee -a "$LOG_FILE"
      echo "$cp_output" | tee -a "$LOG_FILE"
      
      # Try to extract IP if present
      ip_maybe=$(echo "$cp_output" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
      if [ ! -z "$ip_maybe" ]; then
        echo -e "${GREEN}Found IP address in CP response: $ip_maybe${NC}" | tee -a "$LOG_FILE"
        echo "$ip_maybe"
        return 0
      fi
    else
      echo "No useful response from endpoint $endpoint" | tee -a "$LOG_FILE"
    fi
  done
  
  return 1
}

# Function to try the update command
try_update_command() {
  echo -e "${YELLOW}Trying job update to get more details...${NC}" | tee -a "$LOG_FILE"
  
  # First try with just the job ID
  update_output=$(oyster-cvm update --job-id "$JOB_ID" 2>&1)
  echo "$update_output" | tee -a "$LOG_FILE"
  
  # Then try with wallet private key
  if [ -z "$update_output" ] || [[ "$update_output" == *"error"* ]]; then
    echo "Trying update with wallet key..." | tee -a "$LOG_FILE"
    update_output=$(oyster-cvm update --wallet-private-key "$MARLIN" --job-id "$JOB_ID" 2>&1)
    echo "$update_output" | tee -a "$LOG_FILE"
  fi
  
  # Look for IP in the output
  if [[ "$update_output" == *"ip"* ]]; then
    ip_maybe=$(echo "$update_output" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$ip_maybe" ]; then
      echo -e "${GREEN}Found IP address in update response: $ip_maybe${NC}" | tee -a "$LOG_FILE"
      echo "$ip_maybe"
      return 0
    fi
  fi
  
  return 1
}

# Function to check if the job is active using the list command
check_active_jobs() {
  echo -e "${YELLOW}Checking active jobs for wallet...${NC}" | tee -a "$LOG_FILE"
  oyster_output=$(oyster-cvm list --address "$WALLET_ADDRESS" 2>&1)
  echo "$oyster_output" | tee -a "$LOG_FILE"
  
  # Check if job exists and extract IP if present
  if [[ "$oyster_output" == *"$JOB_ID"* ]]; then
    # Job exists, try to extract IP
    echo -e "${GREEN}Job $JOB_ID found in active jobs${NC}" | tee -a "$LOG_FILE"
    
    if [[ "$oyster_output" == *"IP:"* ]]; then
      # Extract IP from list output
      job_ip=$(echo "$oyster_output" | grep -o "IP: [0-9.]*" | cut -d' ' -f2)
      if [ ! -z "$job_ip" ]; then
        echo -e "${GREEN}Found IP address: $job_ip${NC}" | tee -a "$LOG_FILE"
        echo "$job_ip"
        return 0
      else
        echo "IP field found but couldn't extract address" | tee -a "$LOG_FILE"
      fi
    fi
  fi
  
  if [[ "$oyster_output" == *"No active jobs"* ]]; then
    echo -e "${RED}No active jobs found at $(date)${NC}" | tee -a "$LOG_FILE"
  fi
  
  return 1
}

# Function to test connectivity to the job
test_connection() {
  local ip=$1
  local port=${2:-3222}
  
  echo -e "\n${YELLOW}Testing connection to server $ip:$port...${NC}" | tee -a "$LOG_FILE"
  
  # Try curl first
  curl_output=$(curl -s -m 5 "http://$ip:$port/" 2>&1)
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Connection successful via curl${NC}" | tee -a "$LOG_FILE"
    echo "$curl_output" | head -20 | tee -a "$LOG_FILE"
    if [ ${#curl_output} -gt 300 ]; then
      echo "... (output truncated)" | tee -a "$LOG_FILE"
    fi
    return 0
  fi
  
  # Try telnet/nc as backup
  nc -z -v -w 5 "$ip" "$port" 2>&1 | tee -a "$LOG_FILE"
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Port $port is open on $ip${NC}" | tee -a "$LOG_FILE"
    return 0
  fi
  
  echo -e "${RED}Connection failed to $ip:$port${NC}" | tee -a "$LOG_FILE"
  return 1
}

# Main monitoring loop
attempt=1
IP=""

while [ $attempt -le $MAX_ATTEMPTS ]; do
  echo -e "\n${BLUE}Attempt $attempt/$MAX_ATTEMPTS - $(date)${NC}" | tee -a "$LOG_FILE"
  
  # Try multiple strategies to find the IP
  IP=""  # Reset IP variable to avoid false positives
  
  # First strategy: check active jobs
  ip_from_jobs=$(check_active_jobs)
  if [ ! -z "$ip_from_jobs" ] && [[ "$ip_from_jobs" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    IP="$ip_from_jobs"
    echo -e "${GREEN}Found IP from active jobs: $IP${NC}" | tee -a "$LOG_FILE"
    break
  fi
  
  # Second strategy: control plane
  ip_from_cp=$(check_control_plane)
  if [ ! -z "$ip_from_cp" ] && [[ "$ip_from_cp" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    IP="$ip_from_cp"
    echo -e "${GREEN}Found IP from control plane: $IP${NC}" | tee -a "$LOG_FILE"
    break
  fi
  
  # Third strategy: update command
  ip_from_update=$(try_update_command)
  if [ ! -z "$ip_from_update" ] && [[ "$ip_from_update" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    IP="$ip_from_update"
    echo -e "${GREEN}Found IP from update command: $IP${NC}" | tee -a "$LOG_FILE"
    break
  fi
  
  # Sleep before next attempt
  echo -e "${BLUE}Waiting $INTERVAL seconds before next check...${NC}" | tee -a "$LOG_FILE"
  sleep $INTERVAL
  ((attempt++))
done

# Final status
if [ ! -z "$IP" ] && [[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "\n${GREEN}==========================================================${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}Job monitoring completed successfully!${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}IP Address: $IP${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}Log File: $LOG_FILE${NC}" | tee -a "$LOG_FILE"
  echo -e "${GREEN}==========================================================${NC}" | tee -a "$LOG_FILE"
  
  # Test connection to the service
  test_connection "$IP" 3222
  
  # Display how to check logs
  echo -e "\n${BLUE}To check logs:${NC} oyster-cvm logs --ip $IP" | tee -a "$LOG_FILE"
  
  # Fetch and display job details
  echo -e "\n${BLUE}Job Details:${NC}" | tee -a "$LOG_FILE"
  oyster-cvm list --address "$WALLET_ADDRESS" | grep -A 10 "$JOB_ID" | tee -a "$LOG_FILE"
  
  exit 0
else
  echo -e "\n${RED}==========================================================${NC}" | tee -a "$LOG_FILE"
  echo -e "${RED}Failed to obtain IP address after $MAX_ATTEMPTS attempts${NC}" | tee -a "$LOG_FILE"
  echo -e "${RED}Job ID: $JOB_ID${NC}" | tee -a "$LOG_FILE"
  echo -e "${RED}Log File: $LOG_FILE${NC}" | tee -a "$LOG_FILE"
  echo -e "${RED}==========================================================${NC}" | tee -a "$LOG_FILE"
  
  echo -e "\n${YELLOW}Possible solutions:${NC}" | tee -a "$LOG_FILE"
  echo "1. Wait longer - it can take up to 10 minutes for the IP to be assigned" | tee -a "$LOG_FILE"
  echo "2. Check transaction status on blockchain explorer" | tee -a "$LOG_FILE" 
  echo "3. Try simplified deployment with different instance type" | tee -a "$LOG_FILE"
  echo "4. Contact Marlin support with your job ID and transaction hashes" | tee -a "$LOG_FILE"
  echo "5. Verify your USDC balance and approval status" | tee -a "$LOG_FILE"
  
  exit 1
fi 