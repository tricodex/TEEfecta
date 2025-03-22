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
  echo "  -m, --mode <mode>         Test mode (local, docker, all) (default: local)"
  echo "  -a, --agent <agent>       Agent type (traditional, agentkit, coordinated, all) (default: all)"
  echo "  -h, --help                Display this help message"
  exit 1
}

# Parse command-line arguments
TEST_MODE="local"
AGENT_TYPE="all"
while [[ $# -gt 0 ]]; do
  case $1 in
    -m|--mode)
      TEST_MODE="$2"
      shift 2
      ;;
    -a|--agent)
      AGENT_TYPE="$2"
      shift 2
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

# Check for Bun
if ! command -v bun >/dev/null 2>&1; then
  echo -e "${RED}Error: bun not found in PATH${NC}"
  echo "Please install bun first"
  exit 1
fi

# Check for Docker
if [[ "$TEST_MODE" == "docker" || "$TEST_MODE" == "all" ]] && ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}Error: docker not found in PATH${NC}"
  echo "Please install Docker first to use Docker test mode"
  exit 1
fi

# Test if the .env file exists
if [ ! -f "$ROOT_DIR/.env" ]; then
  echo -e "${YELLOW}Warning: .env file not found, copying from .env.example${NC}"
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo -e "${YELLOW}Please update the .env file with your credentials${NC}"
fi

# Function to run local test
run_local_test() {
  local agent_type=$1
  local env_vars=""
  
  case $agent_type in
    traditional)
      env_vars="ENABLE_AGENTKIT=false"
      ;;
    agentkit)
      env_vars="ENABLE_AGENTKIT=true ENABLE_COLLABORATION=false"
      ;;
    coordinated)
      env_vars="ENABLE_AGENTKIT=true ENABLE_COLLABORATION=true"
      ;;
    *)
      echo -e "${RED}Invalid agent type: $agent_type${NC}"
      return 1
      ;;
  esac
  
  echo -e "${BLUE}=======================================${NC}"
  echo -e "${BLUE}  Testing $agent_type agent locally    ${NC}"
  echo -e "${BLUE}=======================================${NC}"
  
  # Build the application
  echo "Building application..."
  cd "$ROOT_DIR"
  bun run build
  
  # Run the application with a timeout
  echo -e "${YELLOW}Starting agent (will run for 30 seconds)...${NC}"
  LOG_FILE="$ROOT_DIR/autotrader_${agent_type}.log"
  
  # Run with timeout
  (cd "$ROOT_DIR" && $env_vars timeout 30s bun run start > "$LOG_FILE" 2>&1) || true
  
  # Check logs
  if grep -q "Auto Trader API listening on port" "$LOG_FILE"; then
    echo -e "${GREEN}✓ Server started successfully${NC}"
  else
    echo -e "${RED}✗ Server failed to start${NC}"
  fi
  
  if grep -q "agent initialized" "$LOG_FILE" || grep -q "Agent initialized" "$LOG_FILE"; then
    echo -e "${GREEN}✓ Agent initialized successfully${NC}"
  else
    echo -e "${RED}✗ Agent initialization issue${NC}"
  fi
  
  echo -e "${YELLOW}Log file saved to: $LOG_FILE${NC}"
}

# Function to run Docker test
run_docker_test() {
  local agent_type=$1
  local env_vars=""
  
  case $agent_type in
    traditional)
      env_vars="ENABLE_AGENTKIT=false"
      ;;
    agentkit)
      env_vars="ENABLE_AGENTKIT=true ENABLE_COLLABORATION=false"
      ;;
    coordinated)
      env_vars="ENABLE_AGENTKIT=true ENABLE_COLLABORATION=true"
      ;;
    *)
      echo -e "${RED}Invalid agent type: $agent_type${NC}"
      return 1
      ;;
  esac
  
  echo -e "${BLUE}=======================================${NC}"
  echo -e "${BLUE}  Testing $agent_type agent in Docker  ${NC}"
  echo -e "${BLUE}=======================================${NC}"
  
  # Build the container
  echo "Building Docker container..."
  cd "$ROOT_DIR"
  
  # Modify the .env file
  cp "$ROOT_DIR/.env" "$ROOT_DIR/.env.backup"
  sed -i.bak "s/^ENABLE_AGENTKIT=.*/ENABLE_AGENTKIT=${env_vars#*ENABLE_AGENTKIT=}/" "$ROOT_DIR/.env"
  if [[ "$env_vars" == *"ENABLE_COLLABORATION"* ]]; then
    sed -i.bak "s/^ENABLE_COLLABORATION=.*/ENABLE_COLLABORATION=${env_vars##*ENABLE_COLLABORATION=}/" "$ROOT_DIR/.env"
  fi
  
  # Build the Docker image
  bash "$ROOT_DIR/scripts/build.sh"
  
  # Run the Docker container
  echo "Running Docker container..."
  CONTAINER_NAME="4g3n7-test-$agent_type"
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
  docker run -d --name "$CONTAINER_NAME" \
    -p 3000:3000 \
    -e MARLIN_ENCLAVE=false \
    4g3n7-auto-trader:latest
  
  # Wait for the container to start
  echo "Waiting for container to start..."
  sleep 5
  
  # Check if the container is running
  if docker ps -q --filter "name=$CONTAINER_NAME" | grep -q .; then
    echo -e "${GREEN}✓ Container started successfully${NC}"
    
    # Check the logs
    DOCKER_LOGS=$(docker logs "$CONTAINER_NAME" 2>&1)
    LOG_FILE="$ROOT_DIR/autotrader_docker_${agent_type}.log"
    echo "$DOCKER_LOGS" > "$LOG_FILE"
    
    if echo "$DOCKER_LOGS" | grep -q "Auto Trader API listening on port"; then
      echo -e "${GREEN}✓ Server started successfully${NC}"
    else
      echo -e "${RED}✗ Server failed to start${NC}"
    fi
    
    if echo "$DOCKER_LOGS" | grep -q "agent initialized" || echo "$DOCKER_LOGS" | grep -q "Agent initialized"; then
      echo -e "${GREEN}✓ Agent initialized successfully${NC}"
    else
      echo -e "${RED}✗ Agent initialization issue${NC}"
    fi
    
    # Test the API
    echo "Testing API..."
    if curl -s http://localhost:3000/health | grep -q "healthy"; then
      echo -e "${GREEN}✓ API health check successful${NC}"
    else
      echo -e "${RED}✗ API health check failed${NC}"
    fi
    
    echo -e "${YELLOW}Log file saved to: $LOG_FILE${NC}"
  else
    echo -e "${RED}✗ Container failed to start${NC}"
  fi
  
  # Stop the container
  docker stop "$CONTAINER_NAME" > /dev/null
  docker rm "$CONTAINER_NAME" > /dev/null
  
  # Restore the .env file
  mv "$ROOT_DIR/.env.backup" "$ROOT_DIR/.env"
}

# Run tests based on mode and agent type
if [[ "$TEST_MODE" == "local" || "$TEST_MODE" == "all" ]]; then
  if [[ "$AGENT_TYPE" == "traditional" || "$AGENT_TYPE" == "all" ]]; then
    run_local_test "traditional"
  fi
  
  if [[ "$AGENT_TYPE" == "agentkit" || "$AGENT_TYPE" == "all" ]]; then
    run_local_test "agentkit"
  fi
  
  if [[ "$AGENT_TYPE" == "coordinated" || "$AGENT_TYPE" == "all" ]]; then
    run_local_test "coordinated"
  fi
fi

if [[ "$TEST_MODE" == "docker" || "$TEST_MODE" == "all" ]]; then
  if [[ "$AGENT_TYPE" == "traditional" || "$AGENT_TYPE" == "all" ]]; then
    run_docker_test "traditional"
  fi
  
  if [[ "$AGENT_TYPE" == "agentkit" || "$AGENT_TYPE" == "all" ]]; then
    run_docker_test "agentkit"
  fi
  
  if [[ "$AGENT_TYPE" == "coordinated" || "$AGENT_TYPE" == "all" ]]; then
    run_docker_test "coordinated"
  fi
fi

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}  All tests completed                  ${NC}"
echo -e "${BLUE}=======================================${NC}"
