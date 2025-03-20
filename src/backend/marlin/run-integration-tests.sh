#!/bin/bash

# 4g3n7 Marlin Integration Test Runner
# This script runs integration tests for the Marlin CVM

set -e

# Default parameters
WALLET_KEY=""
RUN_DEPLOYMENT_TEST=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --key)
      WALLET_KEY="$2"
      shift 2
      ;;
    --run-deployment)
      RUN_DEPLOYMENT_TEST=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Set environment variables for the tests
export RUN_INTEGRATION_TESTS=true

if [[ -n "$WALLET_KEY" ]]; then
  export TEST_WALLET_PRIVATE_KEY="$WALLET_KEY"
fi

if [[ "$RUN_DEPLOYMENT_TEST" == "true" ]]; then
  echo "Running all integration tests including deployment (requires wallet key)..."
  
  if [[ -z "$WALLET_KEY" ]]; then
    echo "Error: Wallet private key is required for deployment tests"
    echo "Usage: ./run-integration-tests.sh --key <wallet-private-key> --run-deployment"
    exit 1
  fi
else
  echo "Running integration tests (excluding actual deployment)..."
fi

# Install test dependencies if needed
if [[ ! -d "node_modules" ]]; then
  echo "Installing dependencies..."
  npm install --save-dev mocha
fi

# Run the tests
npx mocha tests/integration/*.test.js

echo "Integration tests completed!"
