#!/bin/bash

# update-attestation.sh
# This script updates the mock attestation data with a computed digest from a file

# Configuration
ATTESTATION_FILE="attestation-mock-data.json"
TARGET_FILE="${1:-marlin-docker-compose.yml}"
JOB_ID="${2:-}"

# Banner
echo "===================================="
echo "  MOCK ATTESTATION DATA GENERATOR   "
echo "===================================="
echo

# Check if the target file exists
if [ ! -f "$TARGET_FILE" ]; then
  echo "Error: Target file $TARGET_FILE does not exist"
  echo "Usage: $0 <target_file> [job_id]"
  exit 1
fi

# Check if the attestation file exists
if [ ! -f "$ATTESTATION_FILE" ]; then
  echo "Error: Attestation file $ATTESTATION_FILE does not exist"
  exit 1
fi

# Compute SHA-256 digest of the target file
echo "Computing SHA-256 digest of $TARGET_FILE..."
FILE_DIGEST=$(openssl dgst -sha256 -hex "$TARGET_FILE" | awk '{print $2}')

if [ -z "$FILE_DIGEST" ]; then
  echo "Error: Failed to compute digest"
  exit 1
fi

echo "Computed digest: $FILE_DIGEST"

# Update the attestation file with the computed digest
echo "Updating attestation file with computed digest..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s/\"userData\": \"[^\"]*\"/\"userData\": \"$FILE_DIGEST\"/" "$ATTESTATION_FILE"
else
  # Linux
  sed -i "s/\"userData\": \"[^\"]*\"/\"userData\": \"$FILE_DIGEST\"/" "$ATTESTATION_FILE"
fi

# Update job ID if provided
if [ ! -z "$JOB_ID" ]; then
  echo "Updating job ID to: $JOB_ID"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/\"jobID\": \"[^\"]*\"/\"jobID\": \"$JOB_ID\"/" "$ATTESTATION_FILE"
  else
    # Linux
    sed -i "s/\"jobID\": \"[^\"]*\"/\"jobID\": \"$JOB_ID\"/" "$ATTESTATION_FILE"
  fi
fi

# Update timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "Updating timestamp to: $TIMESTAMP"
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s/\"timestamp\": \"[^\"]*\"/\"timestamp\": \"$TIMESTAMP\"/" "$ATTESTATION_FILE"
else
  # Linux
  sed -i "s/\"timestamp\": \"[^\"]*\"/\"timestamp\": \"$TIMESTAMP\"/" "$ATTESTATION_FILE"
fi

echo
echo "Attestation file updated successfully."
echo "To use this mock attestation, set the ATTESTATION_FILE environment variable:"
echo "export ATTESTATION_FILE=\"$PWD/$ATTESTATION_FILE\""
echo

# Show the updated attestation file
echo "Updated attestation data:"
cat "$ATTESTATION_FILE" 