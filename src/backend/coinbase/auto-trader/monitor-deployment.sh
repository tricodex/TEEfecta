#!/bin/bash

# Get the wallet address from private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# IMPORTANT: Use the confirmed wallet address from test-wallet-address.mjs
# This ensures consistent wallet address across all scripts
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

echo "Monitoring deployment for wallet address: $WALLET_ADDRESS"
echo "Press Ctrl+C to stop monitoring"

# Create a log file for this monitoring session
LOG_FILE="marlin-deployment-monitor-$(date +%Y%m%d-%H%M%S).log"
echo "Logging to: $LOG_FILE"

# Check continuously until we find a job or user interrupts
attempt=1
while true; do
  echo "Attempt $attempt - $(date)" | tee -a "$LOG_FILE"
  
  # Run the list command and capture output
  output=$(oyster-cvm list --address $WALLET_ADDRESS 2>&1)
  echo "$output" | tee -a "$LOG_FILE"
  
  # Look for IP address in the output
  if [[ $output == *"IP:"* ]]; then
    echo "Found job with IP address!" | tee -a "$LOG_FILE"
    # Extract IP address - this pattern may need adjustment based on actual output format
    IP=$(echo "$output" | grep -o "IP: [0-9.]*" | cut -d' ' -f2)
    
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
done 