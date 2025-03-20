#!/bin/bash

# 4g3n7 Marlin CVM Builder
# This script builds the Marlin CVM Docker image and prepares it for deployment

set -e

# Default parameters
ARCHITECTURE="arm64"
OUTPUT_DIR="./build"
VERSION="0.1.0"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --arch)
      ARCHITECTURE="$2"
      shift 2
      ;;
    --output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Verify architecture
if [[ "$ARCHITECTURE" != "arm64" && "$ARCHITECTURE" != "amd64" ]]; then
  echo "Error: Architecture must be 'arm64' or 'amd64'"
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Copy Docker configuration to output directory
echo "Copying Docker configuration..."
cp -r ./docker/* "$OUTPUT_DIR"

# Update version in package.json
if [[ -f "$OUTPUT_DIR/app/package.json" ]]; then
  echo "Updating version to $VERSION in package.json..."
  sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" "$OUTPUT_DIR/app/package.json"
  rm "$OUTPUT_DIR/app/package.json.bak"
fi

# Build the Docker image
echo "Building Docker image for $ARCHITECTURE architecture..."
cd "$OUTPUT_DIR"
docker build -t cyama/4g3n7-marlin-cvm:$VERSION --build-arg TARGETARCH=$ARCHITECTURE .

echo "Successfully built cyama/4g3n7-marlin-cvm:$VERSION for $ARCHITECTURE"
echo ""
echo "To run the image locally:"
echo "  docker run -p 3000:3000 cyama/4g3n7-marlin-cvm:$VERSION"
echo ""
echo "To deploy to Marlin Oyster:"
echo "  oyster-cvm deploy --wallet-private-key <key> --duration-in-minutes 60 --docker-compose docker-compose.yml"
