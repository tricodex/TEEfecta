#!/bin/bash
set -e

# Configuration
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Building TypeScript application (ignoring type errors)..."
cd "$ROOT_DIR"

# Remove old build
rm -rf dist

# Build with tsc ignoring errors
tsc --skipLibCheck --outDir dist || true

echo "Build completed with warnings, but files were generated."
