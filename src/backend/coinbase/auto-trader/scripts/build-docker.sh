#!/bin/bash
set -e

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="4g3n7-agent"
TAG="latest"

# Build the application first
echo "Building TypeScript application..."
bash "$ROOT_DIR/scripts/build-ncheck.sh"

# Build the Docker image
echo "Building Docker image $IMAGE_NAME:$TAG..."
docker build -t "$IMAGE_NAME:$TAG" -f "$ROOT_DIR/docker/Dockerfile" "$ROOT_DIR"

echo "Docker image build complete."
echo "To push to a registry: docker push $IMAGE_NAME:$TAG"
echo "To deploy to Marlin CVM: bash scripts/deploy.sh --wallet-key YOUR_KEY --duration MINUTES"