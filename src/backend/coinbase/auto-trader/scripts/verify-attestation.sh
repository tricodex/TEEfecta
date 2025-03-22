#!/bin/bash
set -e

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -i, --ip <ip>           IP address of the enclave (required)"
  echo "  -d, --digest <digest>   User data digest (optional)"
  echo "  -p, --preset <preset>   PCR preset (default: base/blue/v1.0.0/arm64)"
  echo "  -t, --test              Run attestation test against API endpoints"
  echo "  -h, --help              Display this help message"
  exit 1
}

# Parse command-line arguments
ENCLAVE_IP=""
USER_DATA=""
PCR_PRESET="base/blue/v1.0.0/arm64"
TEST_ATTESTATION=false
while [[ $# -gt 0 ]]; do
  case $1 in
    -i|--ip)
      ENCLAVE_IP="$2"
      shift 2
      ;;
    -d|--digest)
      USER_DATA="$2"
      shift 2
      ;;
    -p|--preset)
      PCR_PRESET="$2"
      shift 2
      ;;
    -t|--test)
      TEST_ATTESTATION=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

# Check for required arguments
if [ -z "$ENCLAVE_IP" ]; then
  echo -e "${RED}Error: Enclave IP is required${NC}"
  usage
fi

# Check for oyster-cvm
if ! command -v oyster-cvm >/dev/null 2>&1; then
  echo -e "${YELLOW}Warning: oyster-cvm not found in PATH${NC}"
  echo "Will attempt to use the attestation API directly if not running a verification test."
  if [[ "$TEST_ATTESTATION" == false ]]; then
    echo "Continuing without oyster-cvm..."
  else
    echo -e "${RED}Error: oyster-cvm is required for attestation tests${NC}"
    echo "Please install oyster-cvm first:"
    echo "sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_linux_amd64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm"
    exit 1
  fi
fi

# Function to verify attestation with oyster-cvm
verify_attestation() {
  echo -e "${BLUE}=======================================${NC}"
  echo -e "${BLUE}  Verifying Attestation with Oyster CVM ${NC}"
  echo -e "${BLUE}=======================================${NC}"
  
  local cmd="oyster-cvm verify --enclave-ip $ENCLAVE_IP"
  
  if [ -n "$USER_DATA" ]; then
    cmd="$cmd --user-data $USER_DATA"
  fi
  
  if [ -n "$PCR_PRESET" ]; then
    cmd="$cmd --pcr-preset $PCR_PRESET"
  fi
  
  echo "Running: $cmd"
  eval "$cmd"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Attestation verification successful${NC}"
    return 0
  else
    echo -e "${RED}✗ Attestation verification failed${NC}"
    return 1
  fi
}

# Function to test attestation API
test_attestation_api() {
  echo -e "${BLUE}=======================================${NC}"
  echo -e "${BLUE}  Testing Attestation API               ${NC}"
  echo -e "${BLUE}=======================================${NC}"
  
  # Test raw attestation endpoint
  echo "Testing attestation server directly..."
  if curl -s "http://$ENCLAVE_IP:1300/attestation/raw" > /dev/null; then
    echo -e "${GREEN}✓ Attestation server (port 1300) is accessible${NC}"
  else
    echo -e "${RED}✗ Attestation server (port 1300) is not accessible${NC}"
    return 1
  fi
  
  # Test agent API endpoint
  echo "Testing agent attestation API..."
  if curl -s "http://$ENCLAVE_IP:3000/api/attestation" > /dev/null; then
    echo -e "${GREEN}✓ Agent attestation API is accessible${NC}"
    
    # Get attestation response
    RESPONSE=$(curl -s "http://$ENCLAVE_IP:3000/api/attestation")
    if echo "$RESPONSE" | grep -q "verified"; then
      echo -e "${GREEN}✓ Agent attestation API returned verification status${NC}"
      
      # Check if verified
      if echo "$RESPONSE" | grep -q "\"verified\":true"; then
        echo -e "${GREEN}✓ Attestation verification through API is successful${NC}"
      else
        echo -e "${RED}✗ Attestation verification through API failed${NC}"
        echo "API response: $RESPONSE"
        return 1
      fi
    else
      echo -e "${RED}✗ Agent attestation API did not return proper verification status${NC}"
      echo "API response: $RESPONSE"
      return 1
    fi
  else
    echo -e "${RED}✗ Agent attestation API is not accessible${NC}"
    return 1
  fi
  
  return 0
}

# Function to test memory transparency
test_memory_transparency() {
  echo -e "${BLUE}=======================================${NC}"
  echo -e "${BLUE}  Testing Memory Transparency           ${NC}"
  echo -e "${BLUE}=======================================${NC}"
  
  # Test agent's memory verification API
  echo "Testing memory verification API..."
  if curl -s "http://$ENCLAVE_IP:3000/api/memory/verify" > /dev/null; then
    echo -e "${GREEN}✓ Memory verification API is accessible${NC}"
    
    # Get memory stats
    RESPONSE=$(curl -s "http://$ENCLAVE_IP:3000/api/memory/stats")
    if echo "$RESPONSE" | grep -q "status"; then
      echo -e "${GREEN}✓ Memory stats API returned status${NC}"
      echo "Memory stats: $RESPONSE"
    else
      echo -e "${YELLOW}⚠ Memory stats API did not return proper status${NC}"
      echo "API response: $RESPONSE"
    fi
  else
    echo -e "${YELLOW}⚠ Memory verification API is not accessible${NC}"
    echo "This may be expected if the API endpoint is not implemented."
  fi
  
  return 0
}

# Main execution
echo -e "${BLUE}Starting attestation verification for enclave at: $ENCLAVE_IP${NC}"

# Verify attestation with oyster-cvm if available
if command -v oyster-cvm >/dev/null 2>&1; then
  verify_attestation
fi

# Test attestation API if requested
if [[ "$TEST_ATTESTATION" == true ]]; then
  test_attestation_api
  test_memory_transparency
fi

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  Verification complete                 ${NC}"
echo -e "${BLUE}=======================================${NC}"
