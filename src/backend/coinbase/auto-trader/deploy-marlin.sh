#!/bin/bash
# Auto Trader - Marlin CVM Deployment Script
# This script automates the process of deploying the Auto Trader application to Marlin CVM

set -e  # Exit on error

# Configuration - modify these values
MEMORY_SIZE=4096
CPU_COUNT=2
DOCKER_IMAGE="auto-trader:latest"
OUTPUT_DIR="./marlin-deploy"
PINATA_JWT=""  # Add your Pinata JWT if using Pinata

# Colors for better readability
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m" # No Color

# Check for required tools
check_dependencies() {
  echo -e "${YELLOW}Checking for required tools...${NC}"
  
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found. Please install Docker first.${NC}"
    exit 1
  fi
  
  if ! command -v oyster-eif &> /dev/null; then
    echo -e "${RED}oyster-eif not found. Please install Marlin CVM tools first.${NC}"
    exit 1
  fi
  
  if ! command -v oyster-cvm &> /dev/null; then
    echo -e "${RED}oyster-cvm not found. Please install Marlin CVM tools first.${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}All dependencies found.${NC}"
}

# Create output directory
setup_directories() {
  echo -e "${YELLOW}Setting up deployment directories...${NC}"
  mkdir -p "${OUTPUT_DIR}"
}

# Build Docker image
build_docker_image() {
  echo -e "${YELLOW}Building Docker image...${NC}"
  docker build -t "${DOCKER_IMAGE}" .
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Docker image built successfully.${NC}"
  else
    echo -e "${RED}Docker image build failed.${NC}"
    exit 1
  fi
}

# Save Docker image to tarball
save_docker_image() {
  echo -e "${YELLOW}Saving Docker image to tarball...${NC}"
  docker save "${DOCKER_IMAGE}" > "${OUTPUT_DIR}/auto-trader.tar"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Docker image saved to ${OUTPUT_DIR}/auto-trader.tar${NC}"
  else
    echo -e "${RED}Failed to save Docker image.${NC}"
    exit 1
  fi
}

# Build EIF file
build_eif() {
  echo -e "${YELLOW}Building EIF file...${NC}"
  oyster-eif build -i "${OUTPUT_DIR}/auto-trader.tar" -o "${OUTPUT_DIR}/auto-trader.eif" --memory-size ${MEMORY_SIZE} --cpu-count ${CPU_COUNT}
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}EIF file built successfully: ${OUTPUT_DIR}/auto-trader.eif${NC}"
  else
    echo -e "${RED}EIF build failed.${NC}"
    exit 1
  fi
}

# Upload EIF to storage
upload_eif() {
  if [ -z "$PINATA_JWT" ]; then
    echo -e "${YELLOW}Skipping EIF upload (no Pinata JWT provided).${NC}"
    echo -e "${YELLOW}You'll need to manually upload the EIF file at: ${OUTPUT_DIR}/auto-trader.eif${NC}"
    return
  fi
  
  echo -e "${YELLOW}Uploading EIF file to Pinata...${NC}"
  RESULT=$(oyster-eif upload "${OUTPUT_DIR}/auto-trader.eif" --pinata-jwt "${PINATA_JWT}")
  
  if [ $? -eq 0 ]; then
    EIF_CID=$(echo "${RESULT}" | grep "CID:" | cut -d ' ' -f 2)
    echo -e "${GREEN}EIF uploaded successfully.${NC}"
    echo -e "${GREEN}CID: ${EIF_CID}${NC}"
    echo "${EIF_CID}" > "${OUTPUT_DIR}/eif-cid.txt"
  else
    echo -e "${RED}EIF upload failed.${NC}"
    echo -e "${YELLOW}You'll need to manually upload the EIF file at: ${OUTPUT_DIR}/auto-trader.eif${NC}"
  fi
}

# Deploy to Marlin CVM
deploy_to_cvm() {
  if [ ! -f "${OUTPUT_DIR}/eif-cid.txt" ]; then
    echo -e "${YELLOW}No EIF CID found. Please upload the EIF file manually and run:${NC}"
    echo -e "${YELLOW}oyster-cvm deploy --eif-cid YOUR_CID --wallet-private-key YOUR_PRIVATE_KEY${NC}"
    return
  fi
  
  EIF_CID=$(cat "${OUTPUT_DIR}/eif-cid.txt")
  
  echo -e "${YELLOW}Do you want to deploy the EIF to Marlin CVM now? (y/n)${NC}"
  read -r DEPLOY_NOW
  
  if [ "$DEPLOY_NOW" != "y" ]; then
    echo -e "${YELLOW}Deployment skipped. To deploy later, run:${NC}"
    echo -e "${YELLOW}oyster-cvm deploy --eif-cid ${EIF_CID} --wallet-private-key YOUR_PRIVATE_KEY${NC}"
    return
  fi
  
  echo -e "${YELLOW}Enter your wallet private key for deployment:${NC}"
  read -rs WALLET_PRIVATE_KEY
  
  echo -e "${YELLOW}Deploying to Marlin CVM...${NC}"
  oyster-cvm deploy --eif-cid "${EIF_CID}" --wallet-private-key "${WALLET_PRIVATE_KEY}"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment initiated successfully.${NC}"
    echo -e "${GREEN}Please save the Instance ID and IP address for future reference.${NC}"
  else
    echo -e "${RED}Deployment failed.${NC}"
    exit 1
  fi
}

# Generate deployment info file
generate_info_file() {
  echo -e "${YELLOW}Generating deployment info file...${NC}"
  
  cat > "${OUTPUT_DIR}/deployment-info.md" << EOL
# Auto Trader Marlin CVM Deployment Info

## Deployment Details
- Date: $(date)
- Docker Image: ${DOCKER_IMAGE}
- Memory Size: ${MEMORY_SIZE} MB
- CPU Count: ${CPU_COUNT}

## Deployment Files
- Docker Tarball: ${OUTPUT_DIR}/auto-trader.tar
- EIF File: ${OUTPUT_DIR}/auto-trader.eif

## Post-Deployment Steps
1. Verify your instance is running:
   \`\`\`
   oyster-cvm list
   \`\`\`

2. Check attestation:
   \`\`\`
   oyster-cvm attestation get --instance-id YOUR_INSTANCE_ID
   oyster-cvm attestation verify --instance-id YOUR_INSTANCE_ID
   \`\`\`

3. Set environment variables:
   \`\`\`
   oyster-cvm config set-env --instance-id YOUR_INSTANCE_ID --env-file .env
   \`\`\`

4. Test the API:
   \`\`\`
   curl -k https://YOUR_INSTANCE_IP:3000/api/agent/status
   \`\`\`

5. View logs:
   \`\`\`
   oyster-cvm logs --instance-id YOUR_INSTANCE_ID --follow
   \`\`\`
EOL
  
  echo -e "${GREEN}Deployment info file created: ${OUTPUT_DIR}/deployment-info.md${NC}"
}

# Main execution flow
main() {
  echo -e "${GREEN}=========================================================${NC}"
  echo -e "${GREEN}      Auto Trader - Marlin CVM Deployment Script         ${NC}"
  echo -e "${GREEN}=========================================================${NC}"
  
  check_dependencies
  setup_directories
  build_docker_image
  save_docker_image
  build_eif
  upload_eif
  generate_info_file
  deploy_to_cvm
  
  echo -e "${GREEN}=========================================================${NC}"
  echo -e "${GREEN}      Deployment process completed                       ${NC}"
  echo -e "${GREEN}=========================================================${NC}"
  echo -e "${YELLOW}Deployment files are located in: ${OUTPUT_DIR}${NC}"
}

# Run the main function
main 