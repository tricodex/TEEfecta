#!/bin/bash
set -e

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Starting build and run process in $ROOT_DIR"

# Set environment variables
export USE_MOCK_SEARCH="true"

# Build the project
echo "Building project..."
cd "$ROOT_DIR"
npx tsc --skipLibCheck --outDir dist || true

# Run the application
echo "Starting application..."
node dist/main.js
