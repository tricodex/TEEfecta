#!/bin/bash
set -e

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Compiling test script in $ROOT_DIR"

# Compile just the test script
cd "$ROOT_DIR"
npx tsc --skipLibCheck --outDir dist src/test-search.ts || true

# Run the test script
echo "Running test script..."
export USE_MOCK_SEARCH="true"
node dist/test-search.js
