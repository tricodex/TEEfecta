#!/bin/bash

# This script checks PCR values for Marlin CVM attestation
# PCR values should match between deployment and attestation

# Start logging
LOG_FILE="pcr-verification-$(date +%Y%m%d-%H%M%S).log"
echo "Starting PCR verification at $(date)" | tee -a "$LOG_FILE"

# Try to detect architecture
ARCH=$(uname -m)
PCR_PRESET=""

if [ "$ARCH" == "x86_64" ] || [ "$ARCH" == "amd64" ]; then
  PCR_PRESET="base/blue/v1.0.0/amd64"
  echo "Detected AMD64 architecture, using $PCR_PRESET preset" | tee -a "$LOG_FILE"
elif [ "$ARCH" == "arm64" ] || [ "$ARCH" == "aarch64" ]; then
  PCR_PRESET="base/blue/v1.0.0/arm64"
  echo "Detected ARM64 architecture, using $PCR_PRESET preset" | tee -a "$LOG_FILE"
else
  echo "Unknown architecture: $ARCH, defaulting to AMD64" | tee -a "$LOG_FILE"
  PCR_PRESET="base/blue/v1.0.0/amd64"
fi

# Check the PCR values for attestation
echo "Checking PCR values for attestation..." | tee -a "$LOG_FILE"
oyster-cvm verify --pcr-preset "$PCR_PRESET" --debug 2>&1 | tee -a "$LOG_FILE"

# Try alternative PCR presets if available
echo "Checking available PCR presets..." | tee -a "$LOG_FILE"
oyster-cvm verify --help | grep -A 10 "pcr-preset" | tee -a "$LOG_FILE"

# Compute digest for docker-compose file to verify attestation
echo "Computing digest for docker-compose file..." | tee -a "$LOG_FILE"
oyster-cvm deploy --help | grep -A 5 "docker-compose" | tee -a "$LOG_FILE"

echo "Computing digest for marlin-docker-compose.yml..." | tee -a "$LOG_FILE"
if [ -f "marlin-docker-compose.yml" ]; then
  cat marlin-docker-compose.yml | tee -a "$LOG_FILE"
  DIGEST=$(sha256sum marlin-docker-compose.yml | cut -d' ' -f1)
  echo "Computed digest: $DIGEST" | tee -a "$LOG_FILE"
else
  echo "Error: marlin-docker-compose.yml not found" | tee -a "$LOG_FILE"
fi

# Check user attestation command
echo "Checking attestation command format..." | tee -a "$LOG_FILE"
oyster-cvm user-attestation --help 2>&1 | tee -a "$LOG_FILE"

echo "PCR verification complete. Results saved to $LOG_FILE" 