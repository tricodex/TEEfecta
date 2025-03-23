#!/bin/bash

# This script checks the Marlin oyster-cvm CLI version and capabilities
# Useful to diagnose version mismatches or missing features

LOG_FILE="oyster-version-check-$(date +%Y%m%d-%H%M%S).log"
echo "Running oyster-cvm version check at $(date)" | tee -a "$LOG_FILE"

# Check if the CLI is installed
if ! command -v oyster-cvm &> /dev/null; then
    echo "Error: oyster-cvm CLI not found. Please install it first." | tee -a "$LOG_FILE"
    exit 1
fi

# Check CLI version
echo "Checking oyster-cvm version..." | tee -a "$LOG_FILE"
oyster-cvm --version 2>&1 | tee -a "$LOG_FILE"

# Get help information
echo -e "\nChecking available commands..." | tee -a "$LOG_FILE"
oyster-cvm --help 2>&1 | tee -a "$LOG_FILE"

# Check deploy command options
echo -e "\nChecking deployment options..." | tee -a "$LOG_FILE"
oyster-cvm deploy --help 2>&1 | tee -a "$LOG_FILE"

# Check list command
echo -e "\nChecking list command options..." | tee -a "$LOG_FILE"
oyster-cvm list --help 2>&1 | tee -a "$LOG_FILE"

# Check wallet command
echo -e "\nChecking wallet command options..." | tee -a "$LOG_FILE"
oyster-cvm wallet --help 2>&1 | tee -a "$LOG_FILE" || echo "Wallet command not available" | tee -a "$LOG_FILE"

# Check job termination options
echo -e "\nChecking job termination options..." | tee -a "$LOG_FILE"
oyster-cvm terminate --help 2>&1 | tee -a "$LOG_FILE" || echo "Terminate command not available" | tee -a "$LOG_FILE"

# Check deposit options
echo -e "\nChecking deposit options..." | tee -a "$LOG_FILE"
oyster-cvm deposit --help 2>&1 | tee -a "$LOG_FILE" || echo "Deposit command not available" | tee -a "$LOG_FILE"

# Check withdraw options
echo -e "\nChecking withdraw options..." | tee -a "$LOG_FILE"
oyster-cvm withdraw --help 2>&1 | tee -a "$LOG_FILE" || echo "Withdraw command not available" | tee -a "$LOG_FILE"

# Check logs command
echo -e "\nChecking logs command options..." | tee -a "$LOG_FILE"
oyster-cvm logs --help 2>&1 | tee -a "$LOG_FILE" || echo "Logs command not available" | tee -a "$LOG_FILE"

# Check if there's any network flag
echo -e "\nLooking for network flags..." | tee -a "$LOG_FILE"
oyster-cvm --help 2>&1 | grep -i "network\|chain" | tee -a "$LOG_FILE" || echo "No network flags found" | tee -a "$LOG_FILE"
oyster-cvm deploy --help 2>&1 | grep -i "network\|chain" | tee -a "$LOG_FILE" || echo "No network flags found in deploy" | tee -a "$LOG_FILE"

echo -e "\nVersion check complete. Results saved to $LOG_FILE" 