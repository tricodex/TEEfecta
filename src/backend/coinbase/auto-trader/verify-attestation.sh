#!/bin/bash
# Auto Trader - Marlin CVM Attestation Verification Script
# This script helps verify the attestation of a Marlin CVM deployment

set -e  # Exit on error

# Colors for better readability
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Default values
INSTANCE_ID=""
PCR_PRESET="base/blue/v1.0.0/arm64"  # Default PCR preset
CUSTOM_PCR0=""
CUSTOM_PCR1=""
CUSTOM_PCR2=""
DIGEST=""
IP_ADDRESS=""

# Display help message
show_help() {
  echo -e "${BLUE}Auto Trader - Marlin CVM Attestation Verification Script${NC}"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -h, --help                  Show this help message"
  echo "  -i, --instance-id ID        Specify the Marlin CVM instance ID"
  echo "  -a, --address IP            Specify the Marlin CVM IP address"
  echo "  -p, --preset PRESET         Specify the PCR preset (default: base/blue/v1.0.0/arm64)"
  echo "  -d, --digest DIGEST         Specify the expected digest value"
  echo "  --pcr0 VALUE                Specify custom PCR0 value"
  echo "  --pcr1 VALUE                Specify custom PCR1 value"
  echo "  --pcr2 VALUE                Specify custom PCR2 value"
  echo ""
  echo "Examples:"
  echo "  $0 --instance-id abc123"
  echo "  $0 --address 1.2.3.4 --digest abcdef1234"
  echo "  $0 --instance-id abc123 --preset base/blue/v1.0.0/arm64"
  echo "  $0 --address 1.2.3.4 --pcr0 abc --pcr1 def --pcr2 ghi"
}

# Parse command line arguments
parse_arguments() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        show_help
        exit 0
        ;;
      -i|--instance-id)
        INSTANCE_ID="$2"
        shift 2
        ;;
      -a|--address)
        IP_ADDRESS="$2"
        shift 2
        ;;
      -p|--preset)
        PCR_PRESET="$2"
        shift 2
        ;;
      -d|--digest)
        DIGEST="$2"
        shift 2
        ;;
      --pcr0)
        CUSTOM_PCR0="$2"
        shift 2
        ;;
      --pcr1)
        CUSTOM_PCR1="$2"
        shift 2
        ;;
      --pcr2)
        CUSTOM_PCR2="$2"
        shift 2
        ;;
      *)
        echo -e "${RED}Unknown option: $1${NC}"
        show_help
        exit 1
        ;;
    esac
  done
}

# Check dependencies
check_dependencies() {
  echo -e "${YELLOW}Checking for required tools...${NC}"
  
  if ! command -v oyster-cvm &> /dev/null; then
    echo -e "${RED}oyster-cvm not found. Please install Marlin CVM tools first.${NC}"
    exit 1
  fi
  
  if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}jq not found. Some advanced verification features may not work.${NC}"
  fi
  
  echo -e "${GREEN}Dependencies verified.${NC}"
}

# Get instance info if not provided
get_instance_info() {
  if [ -z "$INSTANCE_ID" ] && [ -z "$IP_ADDRESS" ]; then
    echo -e "${YELLOW}No instance ID or IP address provided. Listing available instances...${NC}"
    oyster-cvm list
    
    echo -e "${YELLOW}Please enter an instance ID:${NC}"
    read -r INSTANCE_ID
    
    if [ -z "$INSTANCE_ID" ]; then
      echo -e "${RED}No instance ID provided. Exiting.${NC}"
      exit 1
    fi
  fi
  
  # If we have instance ID but no IP, get the IP
  if [ -n "$INSTANCE_ID" ] && [ -z "$IP_ADDRESS" ]; then
    echo -e "${YELLOW}Getting IP address for instance ${INSTANCE_ID}...${NC}"
    INSTANCE_INFO=$(oyster-cvm info --instance-id "${INSTANCE_ID}")
    
    if echo "${INSTANCE_INFO}" | grep -q "IP Address"; then
      IP_ADDRESS=$(echo "${INSTANCE_INFO}" | grep "IP Address" | awk '{print $3}')
      echo -e "${GREEN}IP address: ${IP_ADDRESS}${NC}"
    else
      echo -e "${RED}Could not determine IP address for instance ${INSTANCE_ID}.${NC}"
      echo -e "${YELLOW}Please provide the IP address manually with --address.${NC}"
      exit 1
    fi
  fi
}

# Get attestation
get_attestation() {
  echo -e "${YELLOW}Getting attestation for ${INSTANCE_ID}...${NC}"
  
  if [ -n "$INSTANCE_ID" ]; then
    ATTESTATION_RESULT=$(oyster-cvm attestation get --instance-id "${INSTANCE_ID}")
  else
    echo -e "${RED}Instance ID is required for attestation.${NC}"
    exit 1
  fi
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Attestation retrieved successfully.${NC}"
    echo "${ATTESTATION_RESULT}" > "attestation-${INSTANCE_ID}.json"
    echo -e "${GREEN}Attestation saved to attestation-${INSTANCE_ID}.json${NC}"
    
    # Extract PCR values if available
    if echo "${ATTESTATION_RESULT}" | grep -q "PCR"; then
      PCR0=$(echo "${ATTESTATION_RESULT}" | grep "PCR0" | awk '{print $2}')
      PCR1=$(echo "${ATTESTATION_RESULT}" | grep "PCR1" | awk '{print $2}')
      PCR2=$(echo "${ATTESTATION_RESULT}" | grep "PCR2" | awk '{print $2}')
      
      echo -e "${BLUE}PCR Values:${NC}"
      echo -e "${BLUE}PCR0: ${PCR0}${NC}"
      echo -e "${BLUE}PCR1: ${PCR1}${NC}"
      echo -e "${BLUE}PCR2: ${PCR2}${NC}"
    fi
  else
    echo -e "${RED}Failed to retrieve attestation.${NC}"
    exit 1
  fi
}

# Verify attestation
verify_attestation() {
  echo -e "${YELLOW}Verifying attestation...${NC}"
  
  VERIFY_CMD="oyster-cvm attestation verify --instance-id ${INSTANCE_ID}"
  
  if [ -n "$DIGEST" ]; then
    VERIFY_CMD="${VERIFY_CMD} --user-data ${DIGEST}"
  fi
  
  if [ -n "$CUSTOM_PCR0" ] && [ -n "$CUSTOM_PCR1" ] && [ -n "$CUSTOM_PCR2" ]; then
    VERIFY_CMD="${VERIFY_CMD} --pcr0 ${CUSTOM_PCR0} --pcr1 ${CUSTOM_PCR1} --pcr2 ${CUSTOM_PCR2}"
  elif [ -n "$PCR_PRESET" ]; then
    VERIFY_CMD="${VERIFY_CMD} --pcr-preset ${PCR_PRESET}"
  fi
  
  echo -e "${YELLOW}Running: ${VERIFY_CMD}${NC}"
  VERIFY_RESULT=$(eval "${VERIFY_CMD}")
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Attestation verification successful!${NC}"
    echo -e "${GREEN}${VERIFY_RESULT}${NC}"
  else
    echo -e "${RED}Attestation verification failed.${NC}"
    echo -e "${RED}${VERIFY_RESULT}${NC}"
    exit 1
  fi
}

# Test the API
test_api() {
  if [ -z "$IP_ADDRESS" ]; then
    echo -e "${YELLOW}No IP address available. Skipping API test.${NC}"
    return
  fi
  
  echo -e "${YELLOW}Testing the Auto Trader API...${NC}"
  
  # Test health endpoint
  echo -e "${YELLOW}Testing health endpoint...${NC}"
  HEALTH_RESULT=$(curl -s -k "https://${IP_ADDRESS}:3000/health" || echo "Connection failed")
  
  if echo "${HEALTH_RESULT}" | grep -q "ok"; then
    echo -e "${GREEN}Health endpoint test passed.${NC}"
  else
    echo -e "${RED}Health endpoint test failed: ${HEALTH_RESULT}${NC}"
  fi
  
  # Test agent status
  echo -e "${YELLOW}Testing agent status endpoint...${NC}"
  STATUS_RESULT=$(curl -s -k "https://${IP_ADDRESS}:3000/api/agent/status" || echo "Connection failed")
  
  if echo "${STATUS_RESULT}" | grep -q "success"; then
    echo -e "${GREEN}Agent status test passed.${NC}"
    echo -e "${BLUE}Status: ${STATUS_RESULT}${NC}"
  else
    echo -e "${RED}Agent status test failed: ${STATUS_RESULT}${NC}"
  fi
}

# Save verification report
save_verification_report() {
  echo -e "${YELLOW}Generating verification report...${NC}"
  
  REPORT_FILE="verification-report-${INSTANCE_ID}.md"
  
  cat > "${REPORT_FILE}" << EOL
# Auto Trader Marlin CVM Verification Report

## Instance Details
- Instance ID: ${INSTANCE_ID}
- IP Address: ${IP_ADDRESS}
- Verification Date: $(date)

## Attestation Details
- PCR Preset: ${PCR_PRESET}
- PCR0: ${PCR0:-Custom or not available}
- PCR1: ${PCR1:-Custom or not available}
- PCR2: ${PCR2:-Custom or not available}
- Digest: ${DIGEST:-Not specified}

## Verification Results
- Attestation: ${VERIFY_RESULT:-Not performed}

## API Testing Results
- Health Endpoint: ${HEALTH_RESULT:-Not tested}
- Agent Status: ${STATUS_RESULT:-Not tested}

## Next Steps
1. Configure environment variables
2. Monitor the application logs
3. Setup regular attestation verification
EOL
  
  echo -e "${GREEN}Verification report saved to ${REPORT_FILE}${NC}"
}

# Main execution flow
main() {
  echo -e "${GREEN}=========================================================${NC}"
  echo -e "${GREEN}   Auto Trader - Marlin CVM Attestation Verification     ${NC}"
  echo -e "${GREEN}=========================================================${NC}"
  
  parse_arguments "$@"
  check_dependencies
  get_instance_info
  get_attestation
  verify_attestation
  test_api
  save_verification_report
  
  echo -e "${GREEN}=========================================================${NC}"
  echo -e "${GREEN}          Attestation verification completed             ${NC}"
  echo -e "${GREEN}=========================================================${NC}"
}

# Run the main function with all arguments
main "$@" 