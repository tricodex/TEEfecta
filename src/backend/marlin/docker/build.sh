#!/bin/bash

# Build script for 4g3n7 Marlin CVM

set -e

# Default values
ARCH="arm64"
TAG="latest"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --arch)
      ARCH="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate architecture
if [[ "$ARCH" != "arm64" && "$ARCH" != "amd64" ]]; then
  echo "Error: Architecture must be 'arm64' or 'amd64'"
  exit 1
fi

echo "Building 4g3n7 Marlin CVM Docker image..."
echo "Architecture: $ARCH"
echo "Tag: $TAG"

# Build the Docker image
docker build -t 4g3n7-marlin-cvm:$TAG --build-arg TARGETARCH=$ARCH .

echo "Build completed successfully!"
echo "To run locally:"
echo "  docker-compose up"
echo "To deploy to Marlin Oyster:"
echo "  oyster-cvm deploy --wallet-private-key <key> --duration-in-minutes 60 --docker-compose docker-compose.yml"