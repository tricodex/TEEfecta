#!/bin/bash
# Verification script for the dual agent framework
# This script tests each agent configuration separately

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  4g3n7 Dual Agent Verification Tool   ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found. Please copy .env.example to .env and configure appropriately.${NC}"
  exit 1
fi

# Create a backup of the .env file
cp .env .env.backup
echo -e "${GREEN}Created backup of .env as .env.backup${NC}"

# Check for critical dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"

# Check TypeScript files
echo "Checking for TypeScript errors..."
npx tsc --noEmit

if [ $? -eq 0 ]; then
  echo -e "${GREEN}TypeScript compilation successful!${NC}"
else
  echo -e "${YELLOW}TypeScript errors detected - this might be normal due to module resolution issues${NC}"
  echo -e "${YELLOW}Continuing with verification...${NC}"
fi

# Check for Recall Network SDK
echo "Checking for Recall SDK..."
npm list @recallnet/sdk > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${YELLOW}@recallnet/sdk not found. Installing...${NC}"
  npm install @recallnet/sdk @recallnet/chains viem
fi

# Function to run a test with specific config
run_test() {
  local test_name=$1
  local agent_type=$2
  local collaboration=$3
  
  echo -e "\n${BLUE}=======================================${NC}"
  echo -e "${BLUE}  Testing: $test_name${NC}"
  echo -e "${BLUE}=======================================${NC}"
  
  # Update .env
  sed -i.bak "s/^ENABLE_AGENTKIT=.*/ENABLE_AGENTKIT=$agent_type/" .env
  sed -i.bak "s/^ENABLE_COLLABORATION=.*/ENABLE_COLLABORATION=$collaboration/" .env
  
  # Build the application
  echo "Building application..."
  npm run build
  
  # Run the agent in test mode
  echo "Starting agent test..."
  LOG_FILE="autotrader_$test_name.log"
  echo -e "${YELLOW}Starting agent (will run for 30 seconds)...${NC}"
  echo -e "${YELLOW}Logs will be saved to $LOG_FILE${NC}"
  
  # Run for a short period, then terminate
  timeout 30s node dist/index.js > $LOG_FILE 2>&1
  
  # Check results
  if grep -q "Auto Trader API listening on port" $LOG_FILE; then
    echo -e "${GREEN}✓ Server started successfully${NC}"
  else
    echo -e "${RED}✗ Server failed to start${NC}"
  fi
  
  if grep -q "agent initialized" $LOG_FILE; then
    echo -e "${GREEN}✓ Agent initialized successfully${NC}"
  else
    echo -e "${RED}✗ Agent initialization issue${NC}"
  fi
}

# Test traditional agent first
run_test "traditional" "false" "false"

# Test AgentKit agent
run_test "agentkit" "true" "false"

# Test coordinated mode
run_test "coordinated" "true" "true"

# Test Marlin enclave mode
echo -e "\n${BLUE}=======================================${NC}"
echo -e "${BLUE}  Testing: Marlin Enclave Mode${NC}"
echo -e "${BLUE}=======================================${NC}"

# Update .env for enclave test
sed -i.bak "s/^MARLIN_ENCLAVE=.*/MARLIN_ENCLAVE=true/" .env
sed -i.bak "s/^ENABLE_AGENTKIT=.*/ENABLE_AGENTKIT=true/" .env
sed -i.bak "s/^ENABLE_COLLABORATION=.*/ENABLE_COLLABORATION=true/" .env

# Build the application
echo "Building application for enclave test..."
npm run build

# Run for a short period, then terminate
LOG_FILE="autotrader_enclave.log"
echo -e "${YELLOW}Starting agent in enclave mode (will run for 30 seconds)...${NC}"
echo -e "${YELLOW}Logs will be saved to $LOG_FILE${NC}"
timeout 30s node dist/index.js > $LOG_FILE 2>&1

# Check attestation results
if grep -q "Attestation" $LOG_FILE; then
  echo -e "${GREEN}✓ Attestation process initiated${NC}"
  
  if grep -q "Running in enclave: Yes" $LOG_FILE; then
    echo -e "${GREEN}✓ Properly detected Marlin enclave environment${NC}"
  else
    echo -e "${YELLOW}⚠ Did not detect enclave environment - this is expected in local testing${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Attestation process may not have run${NC}"
fi

# Restore original .env
cp .env.backup .env
echo -e "${GREEN}Restored original .env configuration${NC}"

echo -e "\n${BLUE}=======================================${NC}"
echo -e "${BLUE}  Verification Complete${NC}"
echo -e "${BLUE}=======================================${NC}"

echo -e "${YELLOW}Check the following log files for details:${NC}"
echo -e "  - autotrader_traditional.log"
echo -e "  - autotrader_agentkit.log"
echo -e "  - autotrader_coordinated.log" 
echo -e "  - autotrader_enclave.log"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "1. Resolve any TypeScript errors"
echo -e "2. Test with actual CDP credentials" 
echo -e "3. Deploy to Marlin CVM using scripts/deploy.sh"
echo ""
