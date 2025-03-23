#!/bin/bash

# Get the wallet address from private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# Get a reliable wallet address using ethers directly with the private key
echo "Getting wallet address from private key..."
WALLET_ADDRESS=$(node -e "const { ethers } = require('ethers'); console.log(new ethers.Wallet(process.env.MARLIN).address);")

echo "Monitoring deployment for wallet address: $WALLET_ADDRESS"
echo "Press Ctrl+C to stop monitoring"

# Create a log file for this monitoring session
LOG_FILE="marlin-deployment-monitor-$(date +%Y%m%d-%H%M%S).log"
echo "Logging to: $LOG_FILE"

# Log transaction info
echo "Checking for job with ID: 0x0000000000000000000000000000000000000000000000000000000000000b50" | tee -a "$LOG_FILE"
echo "Related to transaction: 0xb21eae37d865b5eaffbdcc4811047e2148edb5eb3633bca9fd31b7f0dc05c4ab" | tee -a "$LOG_FILE"

# Check continuously until we find a job or user interrupts
attempt=1
while true; do
  echo "Attempt $attempt - $(date)" | tee -a "$LOG_FILE"
  
  # Run the list command and capture output
  output=$(oyster-cvm list --address $WALLET_ADDRESS 2>&1)
  echo "$output" | tee -a "$LOG_FILE"
  
  # Also check explicitly for our job ID
  echo "Checking specific job ID..." | tee -a "$LOG_FILE"
  job_output=$(oyster-cvm status --job-id 0x0000000000000000000000000000000000000000000000000000000000000b50 2>&1)
  echo "$job_output" | tee -a "$LOG_FILE"
  
  # Look for IP address in the output
  if [[ $output == *"IP:"* ]] || [[ $job_output == *"IP:"* ]]; then
    echo "Found job with IP address!" | tee -a "$LOG_FILE"
    # Extract IP address - this pattern may need adjustment based on actual output format
    IP=$(echo "$output $job_output" | grep -o "IP: [0-9.]*" | cut -d' ' -f2 | head -n 1)
    
    if [ ! -z "$IP" ]; then
      echo "Extracted IP: $IP" | tee -a "$LOG_FILE"
      echo "To check logs: oyster-cvm logs --ip $IP" | tee -a "$LOG_FILE"
      echo "To access server: curl http://$IP:3222/" | tee -a "$LOG_FILE"
      
      # Try to connect to the server
      echo "Testing connection to server..." | tee -a "$LOG_FILE"
      curl -v "http://$IP:3222/" 2>&1 | tee -a "$LOG_FILE"
      
      # Exit loop if we successfully found an IP
      break
    fi
  fi
  
  # If we didn't find an IP, wait before trying again
  echo "No active jobs with IP found yet. Waiting 30 seconds..." | tee -a "$LOG_FILE"
  sleep 30
  ((attempt++))
  
  # Check if we've been trying for more than 20 minutes (40 attempts)
  if [ $attempt -gt 40 ]; then
    echo "Monitoring timeout after 20 minutes. Consider redeploying or checking on the blockchain explorer." | tee -a "$LOG_FILE"
    echo "Transaction hash: 0xb21eae37d865b5eaffbdcc4811047e2148edb5eb3633bca9fd31b7f0dc05c4ab" | tee -a "$LOG_FILE"
    break
  fi
done 