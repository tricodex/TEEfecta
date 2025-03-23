#!/bin/bash

# Setup script for the attestation environment
# This script sets up the local environment first, then provides instructions
# for the Marlin CVM deployment

echo "==== 4g3n7 Attestation Setup ===="
echo "Setting up local environment first..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Error: Docker is not running. Please start Docker first."
  exit 1
fi

# Build the Docker image if not already built
echo "Building Docker image for the attestation service..."
docker compose build

# Start the Docker container
echo "Starting the local attestation service container..."
docker compose up -d

# Wait for container to be healthy
echo "Waiting for container to be ready..."
attempt=1
max_attempts=10
until [ $attempt -gt $max_attempts ] || docker compose ps | grep healthy; do
  echo "Attempt $attempt/$max_attempts: Waiting for container to be healthy..."
  sleep 5
  attempt=$((attempt+1))
done

if [ $attempt -gt $max_attempts ]; then
  echo "Warning: Container may not be fully healthy yet. Check 'docker compose ps' to verify."
else
  echo "Container is healthy!"
fi

# Compute the digest of the minimal docker-compose file
DIGEST=$(sha256sum minimal-docker-compose.yml | awk '{print $1}')
echo "Docker-compose digest: $DIGEST"

# Display Marlin CVM deployment instructions
echo ""
echo "=== Marlin CVM Deployment Instructions ==="
echo ""
echo "To deploy to Marlin CVM for 24-hour attestation, run:"
echo "./deploy-24h-attestation.sh"
echo ""
echo "Your local setup is complete. The backend is running at:"
echo "- Backend API: http://localhost:3222"
echo "- WebSocket: ws://localhost:3222/socket.io"
echo ""
echo "You can access the frontend at:"
echo "- Frontend: http://localhost:3001"
echo ""
echo "Local environment setup complete!"
