#!/bin/bash
# Deploy to Marlin CVM and monitor the deployment

# Export MARLIN env var from .zshrc if not already available
if [ -z "$MARLIN" ]; then
  echo "Sourcing MARLIN from .zshrc..."
  export MARLIN=$(grep "export MARLIN=" ~/.zshrc | cut -d'"' -f2)
fi

# Get wallet address
echo "Getting wallet address..."
WALLET_ADDRESS=$(node export-wallet.js "$MARLIN")
echo "Using wallet address: $WALLET_ADDRESS"

# Check if Docker image exists
echo "Checking for Docker image..."
if ! docker image inspect cyama/auto-trader:latest >/dev/null 2>&1; then
  echo "Image not found locally, trying to pull from Docker Hub..."
  if ! docker pull cyama/auto-trader:latest; then
    echo "Falling back to node:18-alpine..."
    docker pull node:18-alpine
    docker tag node:18-alpine cyama/auto-trader:latest
  fi
fi

# Set duration for deployment (15 minutes for testing)
DURATION=15

# Create a timestamp for the log file
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="marlin-deployment-$TIMESTAMP.log"

echo "Starting deployment with duration: $DURATION minutes"
echo "Log file: $LOG_FILE"

# Deploy to Marlin CVM
echo "Deploying to Marlin CVM..."
oyster-cvm deploy docker-compose -f marlin-docker-compose.yml -d $DURATION > "$LOG_FILE" 2>&1 &
DEPLOY_PID=$!

echo "Deployment started with PID: $DEPLOY_PID"
echo "Waiting for transaction submission..."
sleep 10

# Start monitoring job status
echo "Monitoring job status for wallet: $WALLET_ADDRESS"
echo "Press Ctrl+C to stop monitoring"

# Monitor job status in a loop
while true; do
  echo "Checking for active jobs at $(date)..."
  oyster-cvm list-jobs -a "$WALLET_ADDRESS"
  sleep 30
done 