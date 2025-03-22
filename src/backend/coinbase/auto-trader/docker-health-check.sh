#!/bin/bash

# Change to the script directory
cd "$(dirname "$0")"

# ANSI color codes for output formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "==============================================="
echo "Auto Trader Docker Health Check"
echo "==============================================="

# Check if Docker is running
echo -n "Checking if Docker is running: "
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Docker is not running${NC}"
  echo "Please start Docker and try again"
  exit 1
else
  echo -e "${GREEN}OK${NC}"
fi

# Check if auto-trader container exists
echo -n "Checking if auto-trader container exists: "
if docker ps -a --format '{{.Names}}' | grep -q "auto-trader"; then
  echo -e "${GREEN}Found${NC}"
  
  # Check if container is running
  echo -n "Checking if auto-trader container is running: "
  if docker ps --format '{{.Names}}' | grep -q "auto-trader"; then
    echo -e "${GREEN}Running${NC}"
    
    # Get the container ID
    CONTAINER_ID=$(docker ps --format '{{.ID}}' --filter "name=auto-trader")
    
    # Check port mappings
    echo -n "Checking port mappings: "
    PORT_MAPPING=$(docker port "$CONTAINER_ID" 3222)
    if [ -z "$PORT_MAPPING" ]; then
      echo -e "${RED}Port 3222 is not mapped${NC}"
    else
      echo -e "${GREEN}${PORT_MAPPING}${NC}"
    fi
    
    # Check container logs for errors
    echo -n "Checking container logs for errors: "
    if docker logs "$CONTAINER_ID" 2>&1 | grep -i "error\|exception\|fatal" > /dev/null; then
      echo -e "${YELLOW}Errors found in logs${NC}"
      echo "Recent errors:"
      docker logs "$CONTAINER_ID" 2>&1 | grep -i "error\|exception\|fatal" | tail -5
    else
      echo -e "${GREEN}No obvious errors${NC}"
    fi
    
    # Check if service is responding
    echo -n "Checking if service is responding: "
    HEALTH_URL="http://localhost:3222/health"
    if curl -s "$HEALTH_URL" -o /dev/null -w "%{http_code}" | grep -q "200"; then
      echo -e "${GREEN}Service is responding${NC}"
    else
      echo -e "${RED}Service is not responding${NC}"
      echo "Try checking the container logs with: docker logs $CONTAINER_ID"
    fi
  else
    echo -e "${YELLOW}Not running${NC}"
    echo "Start the container with: ./run-docker.sh"
  fi
else
  echo -e "${YELLOW}Not found${NC}"
  echo "Create and start the container with: ./run-docker.sh"
fi

# Check environment variables in .env file
echo -n "Checking .env file: "
if [ -f .env ]; then
  echo -e "${GREEN}Found${NC}"
  
  # Check for required environment variables
  echo "Checking required environment variables:"
  
  required_vars=(
    "PORT"
    "GEMINI_API_KEY"
    "ENABLE_AGENTKIT"
    "ENABLE_COLLABORATION"
    "USE_MOCK_WALLET"
    "USE_MOCK_SEARCH"
    "PREFERRED_LLM_PROVIDER"
  )
  
  all_vars_present=true
  
  for var in "${required_vars[@]}"; do
    if grep -q "^$var=" .env; then
      echo -e "  $var: ${GREEN}Found${NC}"
    else
      echo -e "  $var: ${RED}Missing${NC}"
      all_vars_present=false
    fi
  done
  
  if [ "$all_vars_present" = true ]; then
    echo -e "${GREEN}All required environment variables are present${NC}"
  else
    echo -e "${YELLOW}Some required environment variables are missing${NC}"
  fi
else
  echo -e "${RED}Not found${NC}"
  echo "Please create a .env file with required environment variables"
fi

echo "==============================================="
echo "Health check completed"
echo "===============================================" 