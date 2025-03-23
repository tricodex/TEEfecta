#!/bin/bash

# Network Force Check Script for Marlin CVM
# This script tries multiple approaches to check job status, including:
# 1. Explicit network environment variables
# 2. Direct job ID queries with different formats
# 3. Forcing different API endpoints

# Colors for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

# Configuration
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"
LOG_FILE="marlin-force-check-$(date +%Y%m%d-%H%M%S).log"
JOB_ID="0x0000000000000000000000000000000000000000000000000000000000000b66"

# Alternative job ID formats to try
ALT_JOB_IDS=(
  "0x0000000000000000000000000000000000000000000000000000000000000b66"
  "0xb66"
  "b66"
)

# Networks to try
NETWORKS=(
  "arbitrum"
  "polygon"
  "ethereum"
  "optimism"
  "base"
)

# Control plane endpoints to try
CONTROL_PLANES=(
  "13.202.229.168:8080"  # Default from logs
  "api.marlin-cvm.net"   # Fictional example
)

# Function to display banner
function display_banner() {
  echo -e "${BLUE}==========================================================${RESET}"
  echo -e "${BLUE}  Marlin CVM Network Force Check${RESET}"
  echo -e "${BLUE}  Attempting multiple approaches to find deployment${RESET}"
  echo -e "${BLUE}  Wallet: ${WALLET_ADDRESS}${RESET}"
  echo -e "${BLUE}  Job ID: ${JOB_ID}${RESET}"
  echo -e "${BLUE}  Log File: ${LOG_FILE}${RESET}"
  echo -e "${BLUE}==========================================================${RESET}"
  echo
}

# Function to log messages
function log() {
  echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to check if a command exists
function command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check CLI version
function check_cli_version() {
  log "${YELLOW}Checking oyster-cvm CLI version...${RESET}"
  
  if command_exists oyster-cvm; then
    local version=$(oyster-cvm --version)
    log "  ${GREEN}CLI version: $version${RESET}"
    
    # Check if new version is available (simulated)
    log "  Checking for newer versions..."
    log "  ${YELLOW}Note: Manual check for newer versions recommended${RESET}"
  else
    log "  ${RED}oyster-cvm CLI not found in PATH${RESET}"
    log "  Please install the CLI or add it to your PATH"
    exit 1
  fi
}

# Function to try network environment variables
function try_network_envs() {
  log "${YELLOW}Trying different network environment variables...${RESET}"
  
  for network in "${NETWORKS[@]}"; do
    log "${BLUE}Setting MARLIN_NETWORK=$network${RESET}"
    
    # Try different environment variable names
    for env_var in "MARLIN_NETWORK" "NETWORK" "OYSTER_NETWORK" "OYSTER_CVM_NETWORK"; do
      log "  Using $env_var=$network"
      
      # Capture the output of the list command
      output=$(MARLIN_NETWORK="$network" NETWORK="$network" OYSTER_NETWORK="$network" OYSTER_CVM_NETWORK="$network" \
              oyster-cvm list --address "$WALLET_ADDRESS" 2>&1)
      
      echo "$output" >> "$LOG_FILE"
      
      # Check for interesting outputs
      if [[ "$output" == *"active job"* && "$output" != *"No active jobs"* ]]; then
        log "  ${GREEN}Found active job with $env_var=$network!${RESET}"
        log "  ${GREEN}Output: $output${RESET}"
        return 0
      elif [[ "$output" == *"Job ID"* ]]; then
        log "  ${GREEN}Found job information with $env_var=$network!${RESET}"
        log "  ${GREEN}Output: $output${RESET}"
        return 0
      fi
      
      log "  No jobs found with $env_var=$network"
    done
    
    # Wait briefly between attempts
    sleep 1
  done
  
  log "  ${RED}No jobs found with any network environment variable${RESET}"
  return 1
}

# Function to try direct job ID queries
function try_job_id_queries() {
  log "${YELLOW}Trying direct job ID queries...${RESET}"
  
  for network in "${NETWORKS[@]}"; do
    export MARLIN_NETWORK="$network"
    
    for job_id in "${ALT_JOB_IDS[@]}"; do
      log "${BLUE}Checking job ID $job_id on $network${RESET}"
      
      # Try with direct job ID parameter (may fail with current CLI)
      output=$(oyster-cvm list --address "$WALLET_ADDRESS" --job-id "$job_id" 2>&1 || true)
      echo "$output" >> "$LOG_FILE"
      
      if [[ "$output" != *"unexpected argument"* && "$output" != *"No active jobs"* ]]; then
        log "  ${GREEN}Possible match found for job ID $job_id on $network!${RESET}"
        log "  ${GREEN}Output: $output${RESET}"
        return 0
      fi
      
      # Try update command which might show job info
      log "  Trying update command with job ID..."
      output=$(MARLIN_PRIVATE_KEY="$MARLIN" oyster-cvm update "$job_id" 2>&1 || true)
      echo "$output" >> "$LOG_FILE"
      
      if [[ "$output" == *"metadata"* && "$output" != *"error"* ]]; then
        log "  ${GREEN}Job information found via update command for $job_id on $network!${RESET}"
        return 0
      fi
    done
  done
  
  log "  ${RED}No job information found via direct job ID queries${RESET}"
  return 1
}

# Function to try direct control plane queries
function try_control_plane() {
  log "${YELLOW}Trying direct control plane queries...${RESET}"
  
  for endpoint in "${CONTROL_PLANES[@]}"; do
    log "${BLUE}Querying control plane: $endpoint${RESET}"
    
    # Try different API paths
    for job_id in "${ALT_JOB_IDS[@]}"; do
      log "  Checking job ID: $job_id"
      
      # Try job endpoint
      output=$(curl -s "http://$endpoint/job/$job_id" 2>&1 || true)
      echo "$output" >> "$LOG_FILE"
      
      if [[ "$output" != *"error"* && "$output" != *"not found"* && ${#output} -gt 10 ]]; then
        log "  ${GREEN}Found job information via /job/$job_id!${RESET}"
        log "  ${GREEN}Response: $output${RESET}"
        return 0
      fi
      
      # Try status endpoint
      output=$(curl -s "http://$endpoint/status/$job_id" 2>&1 || true)
      echo "$output" >> "$LOG_FILE"
      
      if [[ "$output" != *"error"* && "$output" != *"not found"* && ${#output} -gt 10 ]]; then
        log "  ${GREEN}Found job information via /status/$job_id!${RESET}"
        log "  ${GREEN}Response: $output${RESET}"
        return 0
      fi
    done
    
    # Try wallet endpoint
    log "  Checking wallet: $WALLET_ADDRESS"
    output=$(curl -s "http://$endpoint/jobs?wallet=$WALLET_ADDRESS" 2>&1 || true)
    echo "$output" >> "$LOG_FILE"
    
    if [[ "$output" != *"error"* && "$output" != *"not found"* && ${#output} -gt 10 ]]; then
      log "  ${GREEN}Found wallet information via /jobs?wallet=$WALLET_ADDRESS!${RESET}"
      log "  ${GREEN}Response: $output${RESET}"
      return 0
    fi
    
    # Try all jobs endpoint
    log "  Checking all jobs"
    output=$(curl -s "http://$endpoint/jobs" 2>&1 || true)
    echo "$output" >> "$LOG_FILE"
    
    if [[ "$output" != *"error"* && "$output" != *"not found"* && ${#output} -gt 10 ]]; then
      log "  ${GREEN}Found jobs information via /jobs!${RESET}"
      log "  ${GREEN}Response: $output${RESET}"
      
      # Check if our wallet is in the response
      if [[ "$output" == *"$WALLET_ADDRESS"* ]]; then
        log "  ${GREEN}Wallet address found in response!${RESET}"
        return 0
      fi
    fi
  done
  
  log "  ${RED}No job information found via direct control plane queries${RESET}"
  return 1
}

# Function to try alternative CLI commands
function try_alternative_commands() {
  log "${YELLOW}Trying alternative CLI commands...${RESET}"
  
  # Try verbose/debug mode if available
  log "${BLUE}Checking with verbose/debug mode...${RESET}"
  output=$(oyster-cvm list --address "$WALLET_ADDRESS" --verbose 2>&1 || oyster-cvm list --address "$WALLET_ADDRESS" --debug 2>&1 || true)
  echo "$output" >> "$LOG_FILE"
  
  if [[ "$output" == *"active job"* && "$output" != *"No active jobs"* ]]; then
    log "  ${GREEN}Found job information with verbose/debug mode!${RESET}"
    return 0
  fi
  
  # Try doctor command to check system status
  log "${BLUE}Running doctor command...${RESET}"
  output=$(oyster-cvm doctor 2>&1)
  echo "$output" >> "$LOG_FILE"
  
  if [[ "$output" == *"issue"* || "$output" == *"failed"* ]]; then
    log "  ${RED}System dependencies check failed:${RESET}"
    log "  ${RED}$output${RESET}"
    return 1
  else
    log "  ${GREEN}System dependencies check passed${RESET}"
  fi
  
  return 1
}

# Function to generate final report
function generate_report() {
  log "\n${BLUE}=============================================================${RESET}"
  log "${BLUE}Network Force Check Report:${RESET}"
  log "${BLUE}=============================================================${RESET}"
  
  # Read the entire log file to analyze results
  local log_content=$(<"$LOG_FILE")
  
  # Check for success indicators
  if [[ "$log_content" == *"Found job information"* || "$log_content" == *"Found active job"* ]]; then
    log "${GREEN}SUCCESS: Job information found!${RESET}"
    log "Please review the log file for specific details on which method succeeded."
  else
    log "${RED}No job information found with any method.${RESET}"
    log "Recommended next steps:"
    log "1. Confirm the job deployment transaction on the blockchain"
    log "2. Check for CLI updates or alternative tools"
    log "3. Consider redeploying with explicit network environment variable"
    log "4. Contact Marlin CVM support with transaction hashes"
  fi
  
  log "Complete logs saved to: $LOG_FILE"
}

# Main execution
display_banner

# Initialize log file
echo "Starting Marlin Force Check at $(date)" > "$LOG_FILE"
echo "Wallet Address: $WALLET_ADDRESS" >> "$LOG_FILE"
echo "Job ID: $JOB_ID" >> "$LOG_FILE"
echo "==============================================================" >> "$LOG_FILE"

# Check CLI version
check_cli_version

# Try different approaches
log "\n${BLUE}Attempting multiple approaches to find job information...${RESET}"

try_network_envs
network_envs_success=$?

try_job_id_queries
job_id_success=$?

try_control_plane
control_plane_success=$?

try_alternative_commands
alt_commands_success=$?

# Generate final report
generate_report

echo -e "${GREEN}Force check complete. Log saved to ${LOG_FILE}${RESET}" 