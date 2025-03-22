#!/bin/bash
set -e

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Building TypeScript application (skipping type checking)..."
cd "$ROOT_DIR"

# Remove old build
rm -rf dist

# Use Bun to build the project
bun build ./src/index.ts --outdir dist --target node

echo "Build completed. Files were generated in dist/"
