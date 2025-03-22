#!/bin/bash
set -e

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCKER_IMAGE_NAME="4g3n7-auto-trader"
DOCKER_IMAGE_TAG="latest"
ENCLAVE_EIF_NAME="4g3n7-enclave.eif"
ARCH=$(uname -m)

# Convert architecture naming for Docker
if [ "$ARCH" = "x86_64" ]; then
  DOCKER_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ]; then
  DOCKER_ARCH="arm64"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

echo "=== Building 4g3n7 Auto-Trader for $ARCH architecture ==="

# Step 1: Build TypeScript application
echo "Building TypeScript application..."
cd "$ROOT_DIR"
bun run build

# Step 2: Build Docker image
echo "Building Docker image..."
docker build \
  --build-arg TARGETARCH="$DOCKER_ARCH" \
  -t "$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG" \
  -f docker/Dockerfile \
  .

echo "Docker image built successfully: $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG"

# Step 3: Build Marlin enclave image (for direct deployment only)
if command -v oyster-cvm >/dev/null 2>&1; then
  echo "Building Marlin CVM image using docker-compose..."
  
  # Create a temporary docker-compose.yml file
  cat > "$ROOT_DIR/docker-compose.yml" <<EOF
services:
  4g3n7-agent:
    image: $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG
    network_mode: host
    restart: unless-stopped
EOF

  echo "Docker compose file created:"
  cat "$ROOT_DIR/docker-compose.yml"
  
  echo "Done! Use the deploy.sh script to deploy to Marlin CVM."
else
  echo "Warning: oyster-cvm not found in PATH, skipping enclave image build."
  echo "Please install oyster-cvm to deploy to Marlin CVM."
fi