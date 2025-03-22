#!/bin/bash
# Script to build and run the Auto Trader Docker container

# Set current directory to the script's directory
cd "$(dirname "$0")"

# Build the Docker image
echo "Building Auto Trader Docker image..."
docker build -t auto-trader:latest .

# Create data directories if they don't exist
mkdir -p data/wallets

# Check if .env exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create an .env file with your configuration."
  exit 1
fi

# Run the Docker container
echo "Starting Auto Trader Docker container..."
docker run -p 3222:3222 \
  --env-file .env \
  -v "$(pwd)/data:/app/data" \
  --name auto-trader \
  --rm \
  auto-trader:latest

# Note: --rm flag removes the container when it exits
# To run in the background, use -d flag 