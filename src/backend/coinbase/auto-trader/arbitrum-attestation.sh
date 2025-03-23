#!/bin/bash

# Focused Arbitrum Attestation Script
# This script focuses only on Arbitrum network and works with the minimal deployment

# Colors for better readability
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Configuration
LOG_FILE="arbitrum-attestation-$(date +%Y%m%d-%H%M%S).log"
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"
JOB_ID="0x0000000000000000000000000000000000000000000000000000000000000b7e"
IP_ADDRESS="54.243.144.77"
DIGEST="c2131afec4fb1a03728113f1bfb8d8893cb590b40b2282d54bfdc6662b88a8e5"

# Display banner
echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Arbitrum Attestation Generator - FOCUSED CVM TEST${NC}"
echo -e "${BLUE}  Wallet: $WALLET_ADDRESS${NC}"
echo -e "${BLUE}  Job ID: $JOB_ID${NC}"
echo -e "${BLUE}  IP: $IP_ADDRESS${NC}"
echo -e "${BLUE}  Log File: $LOG_FILE${NC}"
echo -e "${BLUE}==========================================================${NC}"

echo "Starting attestation process at $(date)" | tee -a "$LOG_FILE"

# First check if the IP address is reachable
echo -e "${YELLOW}Testing connectivity to $IP_ADDRESS...${NC}" | tee -a "$LOG_FILE"
if ping -c 3 $IP_ADDRESS | tee -a "$LOG_FILE"; then
  echo -e "${GREEN}IP is reachable!${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}IP is not reachable. Check deployment status.${NC}" | tee -a "$LOG_FILE"
  
  # Try to check job status on Arbitrum
  echo -e "${YELLOW}Checking job status on Arbitrum...${NC}" | tee -a "$LOG_FILE"
  NETWORK=arbitrum oyster-cvm list --address $WALLET_ADDRESS | tee -a "$LOG_FILE"
  exit 1
fi

# Check application service
echo -e "${YELLOW}Testing application service on port 3222...${NC}" | tee -a "$LOG_FILE"
curl -s -m 5 http://$IP_ADDRESS:3222/ | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Application service is running!${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}Application service is not accessible.${NC}" | tee -a "$LOG_FILE"
fi

# Check attestation service
echo -e "${YELLOW}Testing attestation service on port 1300...${NC}" | tee -a "$LOG_FILE"
if nc -z -w5 $IP_ADDRESS 1300 2>/dev/null; then
  echo -e "${GREEN}Attestation service port is open!${NC}" | tee -a "$LOG_FILE"
else
  echo -e "${RED}Attestation service port is closed.${NC}" | tee -a "$LOG_FILE"
  echo "This means we can't retrieve attestations. Check the deployment." | tee -a "$LOG_FILE"
fi

# Verify attestation with ARM64 preset (since we used c7g.xlarge)
echo -e "${YELLOW}Verifying attestation with ARM64 preset...${NC}" | tee -a "$LOG_FILE"
ATTESTATION_RESULT=$(oyster-cvm verify --enclave-ip $IP_ADDRESS --pcr-preset base/blue/v1.0.0/arm64 --user-data $DIGEST 2>&1)
echo "$ATTESTATION_RESULT" | tee -a "$LOG_FILE"

# Check if verification was successful
if [[ "$ATTESTATION_RESULT" == *"Verification successful"* ]]; then
  echo -e "${GREEN}Attestation verified successfully!${NC}" | tee -a "$LOG_FILE"
  
  # Extract important attestation fields
  echo -e "${YELLOW}Extracting attestation data...${NC}" | tee -a "$LOG_FILE"
  ATTESTATION_FIELDS=$(echo "$ATTESTATION_RESULT" | grep -E "Received PCR|Computed PCR|User data|User data digest|enclave name")
  echo "$ATTESTATION_FIELDS" | tee -a "$LOG_FILE"
  
  # Create attestation data file for agent use
  echo -e "${YELLOW}Creating attestation data file for agent use...${NC}" | tee -a "$LOG_FILE"
  ATTESTATION_FILE="attestation-data-$(date +%Y%m%d-%H%M%S).json"
  
  cat > "$ATTESTATION_FILE" <<EOF
{
  "job_id": "$JOB_ID",
  "ip_address": "$IP_ADDRESS",
  "wallet_address": "$WALLET_ADDRESS",
  "user_data_digest": "$DIGEST",
  "attestation_verified": true,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "network": "arbitrum"
}
EOF
  
  echo -e "${GREEN}Attestation data saved to $ATTESTATION_FILE${NC}" | tee -a "$LOG_FILE"
  cat "$ATTESTATION_FILE" | tee -a "$LOG_FILE"
else
  echo -e "${RED}Attestation verification failed.${NC}" | tee -a "$LOG_FILE"
  
  # Try alternative verification methods
  echo -e "${YELLOW}Trying attestation without user data...${NC}" | tee -a "$LOG_FILE"
  oyster-cvm verify --enclave-ip $IP_ADDRESS --pcr-preset base/blue/v1.0.0/arm64 2>&1 | tee -a "$LOG_FILE"
  
  # Check if the digest might be wrong
  echo -e "${YELLOW}Computing digest from minimal-docker-compose.yml...${NC}" | tee -a "$LOG_FILE"
  if [ -f "minimal-docker-compose.yml" ]; then
    COMPUTED_DIGEST=$(oyster-cvm compute-digest --docker-compose minimal-docker-compose.yml 2>/dev/null || echo "Failed to compute digest")
    echo "Computed digest: $COMPUTED_DIGEST" | tee -a "$LOG_FILE"
    
    if [ "$COMPUTED_DIGEST" != "Failed to compute digest" ]; then
      echo -e "${YELLOW}Trying attestation with computed digest...${NC}" | tee -a "$LOG_FILE"
      oyster-cvm verify --enclave-ip $IP_ADDRESS --pcr-preset base/blue/v1.0.0/arm64 --user-data $COMPUTED_DIGEST 2>&1 | tee -a "$LOG_FILE"
    fi
  fi
fi

# Create a simple script to demonstrate agent integration with attestation
echo -e "${YELLOW}Creating sample agent attestation integration...${NC}" | tee -a "$LOG_FILE"
AGENT_SCRIPT="secure-agent-attestation.js"

cat > "$AGENT_SCRIPT" <<EOF
// Secure Agent Attestation Integration
const fs = require('fs');
const https = require('https');

// Load attestation data
const loadAttestation = () => {
  try {
    const attestationFile = 'attestation-data-$(date +%Y%m%d-%H%M%S).json';
    const data = fs.readFileSync(attestationFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading attestation data:', error);
    return null;
  }
};

// Verify attestation before executing agent operations
const verifyAndExecute = async () => {
  const attestation = loadAttestation();
  
  if (!attestation || !attestation.attestation_verified) {
    console.error('Invalid or missing attestation data');
    return false;
  }
  
  console.log('Attestation verified. Agent running in secure CVM environment');
  console.log(\`Job ID: \${attestation.job_id}\`);
  console.log(\`IP Address: \${attestation.ip_address}\`);
  console.log(\`Network: \${attestation.network}\`);
  
  // Here you would initiate your agent with confidence that
  // it's running in a verified secure environment
  
  // Demo: Simple health check of the CVM
  try {
    const result = await pingCvm(attestation.ip_address);
    console.log('CVM health check:', result ? 'OK' : 'Failed');
    return result;
  } catch (error) {
    console.error('Error in CVM health check:', error);
    return false;
  }
};

// Simple health check function
const pingCvm = (ipAddress) => {
  return new Promise((resolve) => {
    const req = https.get(\`http://\${ipAddress}:3222/\`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(res.statusCode === 200);
      });
    }).on('error', () => {
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
};

// Run the verification and agent
verifyAndExecute()
  .then(success => {
    console.log('Agent execution:', success ? 'Successful' : 'Failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Agent execution error:', error);
    process.exit(1);
  });
EOF

echo -e "${GREEN}Sample agent attestation integration created: $AGENT_SCRIPT${NC}" | tee -a "$LOG_FILE"
echo "You can use this as a starting point for integrating attestation with your agent." | tee -a "$LOG_FILE"

echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Attestation process complete.${NC}"
echo -e "${BLUE}  Results saved to $LOG_FILE${NC}"
echo -e "${BLUE}  Use attestation data for secure agent execution${NC}"
echo -e "${BLUE}==========================================================${NC}" 