#!/bin/bash

# Job monitoring script for Marlin CVM
# This script will continuously monitor a job for IP address and status

# Configuration
JOB_ID=${1:-"0x0000000000000000000000000000000000000000000000000000000000000b66"}
LOG_FILE="job-monitor-$(date +%Y%m%d-%H%M%S).log"
MAX_ATTEMPTS=40  # Check for 20 minutes (30 seconds interval)

# Get the wallet private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# Use the confirmed wallet address
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Display banner
echo "=========================================================="
echo "  Marlin CVM Job Monitoring"
echo "  Job ID: $JOB_ID"
echo "  Wallet: $WALLET_ADDRESS"
echo "  Log File: $LOG_FILE"
echo "=========================================================="

# Start logging
echo "Starting job monitoring at $(date)" | tee -a "$LOG_FILE"
echo "Job ID: $JOB_ID" | tee -a "$LOG_FILE"
echo "Wallet address: $WALLET_ADDRESS" | tee -a "$LOG_FILE"

# Main monitoring loop
attempt=1
IP=""

while [ $attempt -le $MAX_ATTEMPTS ]; do
  echo -e "\nAttempt $attempt/$MAX_ATTEMPTS - $(date)" | tee -a "$LOG_FILE"
  
  # Check job status with list command
  echo "Checking active jobs for wallet..." | tee -a "$LOG_FILE"
  oyster_output=$(oyster-cvm list --address $WALLET_ADDRESS 2>&1)
  echo "$oyster_output" | tee -a "$LOG_FILE"
  
  # Check if job exists and extract IP if present
  if [[ $oyster_output == *"No active jobs"* ]]; then
    echo "No active jobs found at $(date)" | tee -a "$LOG_FILE"
    
    # Try direct query to control plane
    echo "Trying direct control plane query..." | tee -a "$LOG_FILE"
    cp_url="http://13.202.229.168:8080/job/$JOB_ID"
    echo "Querying $cp_url" | tee -a "$LOG_FILE"
    
    cp_output=$(curl -s -X GET "$cp_url")
    if [ ! -z "$cp_output" ]; then
      echo "Control plane response:" | tee -a "$LOG_FILE"
      echo "$cp_output" | tee -a "$LOG_FILE"
      
      # Try to extract IP if present
      ip_maybe=$(echo "$cp_output" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
      if [ ! -z "$ip_maybe" ]; then
        echo "Found IP address in CP response: $ip_maybe" | tee -a "$LOG_FILE"
        IP=$ip_maybe
        break
      fi
    else
      echo "No response from control plane" | tee -a "$LOG_FILE"
    fi
    
    # Try job update as last resort
    echo "Trying job update to get more details..." | tee -a "$LOG_FILE"
    update_output=$(oyster-cvm update --wallet-private-key "$MARLIN" --job-id $JOB_ID 2>&1)
    echo "$update_output" | tee -a "$LOG_FILE"
    
    # Look for IP in the output
    if [[ $update_output == *"ip"* ]]; then
      ip_maybe=$(echo "$update_output" | grep -o '"ip":"[^"]*"' | cut -d'"' -f4)
      if [ ! -z "$ip_maybe" ]; then
        echo "Found IP address in update response: $ip_maybe" | tee -a "$LOG_FILE"
        IP=$ip_maybe
        break
      fi
    fi
  elif [[ $oyster_output == *"IP:"* ]]; then
    # Extract IP from list output
    IP=$(echo "$oyster_output" | grep -o "IP: [0-9.]*" | cut -d' ' -f2)
    if [ ! -z "$IP" ]; then
      echo "Found IP address: $IP" | tee -a "$LOG_FILE"
      break
    else
      echo "IP field found but couldn't extract address" | tee -a "$LOG_FILE"
    fi
  else
    echo "Job exists but no IP found yet at $(date)" | tee -a "$LOG_FILE"
  fi
  
  # Sleep before next attempt
  echo "Waiting 30 seconds before next check..." | tee -a "$LOG_FILE"
  sleep 30
  ((attempt++))
done

# Final status
if [ ! -z "$IP" ]; then
  echo -e "\n==========================================================" | tee -a "$LOG_FILE"
  echo "Job monitoring completed successfully!" | tee -a "$LOG_FILE"
  echo "IP Address: $IP" | tee -a "$LOG_FILE"
  echo "Job ID: $JOB_ID" | tee -a "$LOG_FILE"
  echo "Log File: $LOG_FILE" | tee -a "$LOG_FILE"
  echo "==========================================================" | tee -a "$LOG_FILE"
  
  # Test connection to the service
  echo -e "\nTesting connection to server..." | tee -a "$LOG_FILE"
  curl -v "http://$IP:3222/" 2>&1 | tee -a "$LOG_FILE"
  
  # Display how to check logs
  echo -e "\nTo check logs: oyster-cvm logs --ip $IP" | tee -a "$LOG_FILE"
  
  exit 0
else
  echo -e "\n==========================================================" | tee -a "$LOG_FILE"
  echo "Failed to obtain IP address after $MAX_ATTEMPTS attempts" | tee -a "$LOG_FILE"
  echo "Job ID: $JOB_ID" | tee -a "$LOG_FILE"
  echo "Log File: $LOG_FILE" | tee -a "$LOG_FILE"
  echo "==========================================================" | tee -a "$LOG_FILE"
  
  echo -e "\nPossible solutions:" | tee -a "$LOG_FILE"
  echo "1. Wait longer - it can take up to 5 minutes for the IP to be assigned" | tee -a "$LOG_FILE"
  echo "2. Check transaction status on blockchain explorer" | tee -a "$LOG_FILE"
  echo "3. Try simplified deployment with different instance type" | tee -a "$LOG_FILE"
  echo "4. Contact Marlin support with your job ID and transaction hashes" | tee -a "$LOG_FILE"
  
  exit 1
fi 