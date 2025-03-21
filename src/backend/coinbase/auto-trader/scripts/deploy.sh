#!/bin/bash
set -e

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DURATION_MINUTES=60  # Default duration: 1 hour
ARCH=$(uname -m)

# Convert architecture naming
if [ "$ARCH" = "x86_64" ]; then
  DOCKER_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ]; then
  DOCKER_ARCH="arm64"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

# Function to display usage
usage() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  -w, --wallet-key <key>    Private key of the wallet for deployment (required)"
  echo "  -d, --duration <minutes>  Duration in minutes for the deployment (default: 60)"
  echo "  -h, --help                Display this help message"
  exit 1
}

# Parse command-line arguments
WALLET_KEY=""
while [[ $# -gt 0 ]]; do
  case $1 in
    -w|--wallet-key)
      WALLET_KEY="$2"
      shift 2
      ;;
    -d|--duration)
      DURATION_MINUTES="$2"
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

# Check for required arguments
if [ -z "$WALLET_KEY" ]; then
  echo "Error: Wallet private key is required"
  usage
fi

# Check for oyster-cvm
if ! command -v oyster-cvm >/dev/null 2>&1; then
  echo "Error: oyster-cvm not found in PATH"
  echo "Please install oyster-cvm first:"
  echo "sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_linux_amd64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm"
  exit 1
fi

# Build the project first
echo "Running build script..."
bash "$ROOT_DIR/scripts/build.sh"

# Deploy to Marlin CVM
echo "Deploying to Marlin CVM for $DURATION_MINUTES minutes..."
oyster-cvm deploy \
  --wallet-private-key "$WALLET_KEY" \
  --duration-in-minutes "$DURATION_MINUTES" \
  --docker-compose "$ROOT_DIR/docker-compose.yml" \
  --arch "$DOCKER_ARCH"

echo "Deployment complete! Make note of the enclave IP address above."
echo "You can interact with the agent at http://<enclave-ip>:3000"
echo "The attestation server is available at http://<enclave-ip>:1300"