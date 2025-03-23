#!/bin/bash

# Extract transaction details from Marlin CVM deployment transactions
# This script extracts and analyzes transaction data to identify network, deployment parameters,
# and possible issues with Marlin CVM deployments

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Configuration
LOG_FILE="marlin-transaction-details-$(date +%Y%m%d-%H%M%S).log"
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Transaction hashes to analyze
TRANSACTIONS=(
  "0x67b2bf8bb28dab313ae9a31c2c20e9d4af8caea43311c8e38a7a57d0a496b43e"  # Recent deploy
  "0x3a8d3b4ef80638dc1fc8c1d9b1d0d9ac4e7f1d2e6cf30e98b07e69a6a4c58d5a"  # Another recent deploy 
  "0x0eeb4bf5ef351b18694b535e2388e71da84c9e74ee5ab85655247c23622532ed"  # Update transaction
)

# Networks to check
NETWORKS=(
  "https://api.etherscan.io/api"            # Ethereum
  "https://api.arbiscan.io/api"             # Arbitrum
  "https://api.polygonscan.com/api"         # Polygon
  "https://api-optimistic.etherscan.io/api" # Optimism
  "https://api.basescan.org/api"            # Base
)

NETWORK_NAMES=(
  "Ethereum"
  "Arbitrum"
  "Polygon"
  "Optimism" 
  "Base"
)

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${YELLOW}Warning: jq is not installed. Using fallback methods for JSON parsing.${RESET}"
  HAS_JQ=false
else
  HAS_JQ=true
fi

# Function to display banner
function display_banner() {
  echo -e "${BLUE}=========================================================${RESET}"
  echo -e "${BLUE}  Marlin CVM Transaction Analysis${RESET}"
  echo -e "${BLUE}  Extracting deployment details from transaction data${RESET}"
  echo -e "${BLUE}  Log File: ${LOG_FILE}${RESET}"
  echo -e "${BLUE}=========================================================${RESET}"
  echo
}

# Function to log messages
function log() {
  echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to fetch transaction details from different networks
function fetch_transaction_details() {
  local tx_hash="$1"
  
  log "${YELLOW}Analyzing transaction: ${tx_hash}${RESET}"
  log "----------------------------------------"
  
  local found=false
  
  for i in "${!NETWORKS[@]}"; do
    local network="${NETWORKS[$i]}"
    local network_name="${NETWORK_NAMES[$i]}"
    
    log "${BLUE}Checking ${network_name}...${RESET}"
    
    # Try with more specific etherscan query first
    local tx_query="${network}?module=proxy&action=eth_getTransactionByHash&txhash=${tx_hash}&apikey=YourApiKeyToken"
    log "  Query: $tx_query" >> "$LOG_FILE"  # Only log to file, not console
    
    # Use curl to fetch transaction data
    local response=$(curl -s "$tx_query")
    
    # Check if transaction exists on this network
    if [[ "$response" == *"\"result\":null"* ]]; then
      log "  Not found on ${network_name}"
      continue
    fi
    
    found=true
    log "${GREEN}  Transaction found on ${network_name}!${RESET}"
    
    # Extract and analyze transaction data
    local to=""
    local from=""
    local value=""
    local input_data=""
    
    if $HAS_JQ; then
      # Use jq for better parsing if available
      to=$(echo "$response" | jq -r '.result.to')
      from=$(echo "$response" | jq -r '.result.from')
      value=$(echo "$response" | jq -r '.result.value')
      input_data=$(echo "$response" | jq -r '.result.input')
    else
      # Fallback to grep/cut method
      to=$(echo "$response" | grep -o '"to":"[^"]*"' | head -1 | cut -d':' -f2 | tr -d '"')
      from=$(echo "$response" | grep -o '"from":"[^"]*"' | head -1 | cut -d':' -f2 | tr -d '"')
      value=$(echo "$response" | grep -o '"value":"[^"]*"' | head -1 | cut -d':' -f2 | tr -d '"')
      input_data=$(echo "$response" | grep -o '"input":"[^"]*"' | head -1 | cut -d':' -f2 | tr -d '"')
    fi
    
    # Handle null values
    if [[ "$to" == "null" || -z "$to" ]]; then
      to="Contract creation"
    fi
    
    # Convert hex value to ETH
    local eth_value=0
    if [[ -n "$value" && "$value" != "null" && "$value" != "0x0" ]]; then
      dec_value=$(echo "ibase=16; ${value:2}" | tr '[:lower:]' '[:upper:]' | bc 2>/dev/null || echo "0")
      eth_value=$(echo "scale=18; $dec_value / 10^18" | bc)
    fi
    
    log "  Contract: $to"
    log "  From: $from"
    log "  Value: $eth_value ETH"
    
    # Get function signature from input data
    local function_sig="${input_data:0:10}"
    
    log "  Function signature: $function_sig"
    
    # Known function signatures for Marlin CVM
    case "$function_sig" in
      "0x3a247568") 
        log "  Function: deploy()"
        extract_deploy_params "$input_data" "$network_name"
        ;;
      "0xb6c52324") 
        log "  Function: update(address,bytes)"
        extract_update_params "$input_data" "$network_name"
        ;;
      "0x2b68b9c6") 
        log "  Function: deposit(uint256,address)"
        log "  Action: Adding funds to existing job"
        ;;
      "0x82bfefc8") 
        log "  Function: withdraw(address,address)"
        log "  Action: Withdrawing funds from job"
        ;;
      *) 
        log "  Function signature: $function_sig (unknown)"
        # Try to inspect the raw transaction data
        if [[ ${#input_data} -gt 100 ]]; then
          log "  Data analysis: Large data payload detected (${#input_data} bytes)"
          if [[ "$input_data" == *"6d61726c696e"* ]]; then # 'marlin' in hex
            log "  Contains 'marlin' string reference"
          fi
          if [[ "$input_data" == *"6f79737465722d63766d"* ]]; then # 'oyster-cvm' in hex
            log "  Contains 'oyster-cvm' string reference"
          fi
        fi
        ;;
    esac
    
    # Also fetch receipt to check status and logs
    fetch_transaction_receipt "$tx_hash" "$network" "$network_name"
    
    # If we've found the transaction, no need to check other networks
    break
  done
  
  if ! $found; then
    log "${RED}Transaction not found on any of the checked networks${RESET}"
  fi
  
  log ""
}

# Function to fetch transaction receipt
function fetch_transaction_receipt() {
  local tx_hash="$1"
  local network="$2"
  local network_name="$3"
  
  log "  Fetching transaction receipt..."
  
  local receipt_query="${network}?module=proxy&action=eth_getTransactionReceipt&txhash=${tx_hash}&apikey=YourApiKeyToken"
  local receipt=$(curl -s "$receipt_query")
  
  # Extract status
  local status=""
  if $HAS_JQ; then
    status=$(echo "$receipt" | jq -r '.result.status')
  else
    status=$(echo "$receipt" | grep -o '"status":"[^"]*"' | head -1 | cut -d':' -f2 | tr -d '"')
  fi
  
  if [[ "$status" == "0x1" ]]; then
    log "${GREEN}  Transaction status: Success${RESET}"
  elif [[ "$status" == "0x0" ]]; then
    log "${RED}  Transaction status: Failed${RESET}"
  else
    log "${YELLOW}  Transaction status: Unknown ($status)${RESET}"
  fi
  
  # Extract contract address if created
  local contract_address=""
  if $HAS_JQ; then
    contract_address=$(echo "$receipt" | jq -r '.result.contractAddress')
  else
    contract_address=$(echo "$receipt" | grep -o '"contractAddress":"[^"]*"' | head -1 | cut -d':' -f2 | tr -d '"')
  fi
  
  if [[ -n "$contract_address" && "$contract_address" != "null" ]]; then
    log "  Contract created: $contract_address"
  fi
  
  # Extract gas used
  local gas_used=""
  if $HAS_JQ; then
    gas_used=$(echo "$receipt" | jq -r '.result.gasUsed')
  else
    gas_used=$(echo "$receipt" | grep -o '"gasUsed":"[^"]*"' | head -1 | cut -d':' -f2 | tr -d '"')
  fi
  
  if [[ -n "$gas_used" && "$gas_used" != "null" ]]; then
    log "  Gas used: $gas_used"
  fi
  
  # Count logs (events) - good indicator of contract activity
  local log_count=0
  if $HAS_JQ; then
    log_count=$(echo "$receipt" | jq '.result.logs | length')
  else
    log_count=$(echo "$receipt" | grep -o '"logs":\[' | wc -l)
  fi
  
  log "  Events emitted: $log_count"
  
  # Try to extract useful event data (simplified)
  if [[ "$log_count" -gt 0 ]]; then
    log "  Event topics:" >> "$LOG_FILE"  # Only log to file
    
    # Look for deployment related events
    if [[ "$receipt" == *"JobDeployed"* ]]; then
      log "  Event: JobDeployed detected"
      # Try to extract job ID from events
      if $HAS_JQ; then
        local topics=$(echo "$receipt" | jq -r '.result.logs[].topics[]')
        log "  Topic data: $topics" >> "$LOG_FILE"
      fi
    fi
    
    if [[ "$receipt" == *"JobUpdated"* ]]; then
      log "  Event: JobUpdated detected"
    fi
  fi
}

# Function to extract deploy parameters
function extract_deploy_params() {
  local input_data="$1"
  local network_name="$2"
  
  log "  Deployment parameters:"
  
  # Extract encoded parameters - this is simplified and would need adjustments for actual data
  log "  Network: $network_name"
  log "  Data length: ${#input_data} bytes"
  
  # Extract image URL if possible
  if [[ "$input_data" == *"6261736529626c7565"* ]] || [[ "$input_data" == *"base-blue"* ]]; then
    log "  Image: Contains reference to base-blue"
  fi
  
  # Extract region if possible
  if [[ "$input_data" == *"61702d736f7574682d31"* ]] || [[ "$input_data" == *"ap-south-1"* ]]; then
    log "  Region: ap-south-1 detected"
  fi
  
  # Look for debug flag
  if [[ "$input_data" == *"64656275672074727565"* ]] || [[ "$input_data" == *"debug"* ]]; then
    log "  Debug: true (Debug mode enabled)"
  fi
}

# Function to extract update parameters
function extract_update_params() {
  local input_data="$1"
  local network_name="$2"
  
  log "  Update parameters:"
  log "  Network: $network_name"
  log "  Data length: ${#input_data} bytes"
  
  # Extract job ID if possible (simplified)
  if [[ "${#input_data}" -gt 200 ]]; then
    local possible_job_id="${input_data:10:64}"
    log "  Possible Job ID: 0x$possible_job_id"
  fi
}

# Function to check if value is valid hex
function is_valid_hex() {
  local value="$1"
  if [[ "$value" =~ ^0x[0-9a-fA-F]+$ ]]; then
    return 0  # true in bash
  else
    return 1  # false in bash
  fi
}

# Function to summarize findings
function summarize_findings() {
  log "${BLUE}=============================================================${RESET}"
  log "${BLUE}Summary of Transaction Analysis:${RESET}"
  log "${BLUE}=============================================================${RESET}"
  log "1. All transactions were checked against ${#NETWORKS[@]} networks."
  log "2. Primary wallet address: $WALLET_ADDRESS"
  log ""
  log "3. Key findings:"
  log "   - Network configuration: Check if CLI commands match network used for deployments"
  log "   - Contract addresses: Verify correct contract used for specific network"
  log "   - Job IDs: Look for job IDs in transaction data for direct queries"
  log ""
  log "4. Next Steps:"
  log "   - Inspect log file for detailed transaction analysis"
  log "   - Use extracted job IDs with 'oyster-cvm list --job-id <ID>' when implemented"
  log "   - Ensure network parameter matches deployment network"
  log ""
  log "Analysis completed. See ${LOG_FILE} for full details."
}

# Main execution
display_banner

# Initialize log file
echo "Starting Marlin transaction analysis at $(date)" > "$LOG_FILE"
echo "Wallet Address: $WALLET_ADDRESS" >> "$LOG_FILE"
echo "==============================================================" >> "$LOG_FILE"

# Process each transaction
for tx in "${TRANSACTIONS[@]}"; do
  fetch_transaction_details "$tx"
done

# Summarize findings
summarize_findings

echo -e "${GREEN}Transaction analysis complete. Log saved to ${LOG_FILE}${RESET}" 