#!/bin/bash
# Start script for Auto Trader Server
# This script ensures all required environment variables are set

# Set current directory to the script's directory
cd "$(dirname "$0")"

# Default port if not set
export PORT="${PORT:-3222}"

# Ensure AgentKit and Collaboration are enabled
export ENABLE_AGENTKIT=true
export ENABLE_COLLABORATION=true
export USE_MOCK_WALLET=false

# Use real search instead of mock
export USE_MOCK_SEARCH=false

# Ensure LLM provider is set to Gemini
export PREFERRED_LLM_PROVIDER=gemini

# Make sure GEMINI_API_KEY is set from GOOGLE_API_KEY if not present
if [ -n "$GOOGLE_API_KEY" ] && [ -z "$GEMINI_API_KEY" ]; then
  export GEMINI_API_KEY="$GOOGLE_API_KEY"
  echo "GEMINI_API_KEY set from GOOGLE_API_KEY"
fi

# Use the standard development mnemonic
export MNEMONIC_PHRASE="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

# Print startup configuration
echo "Starting Auto Trader Server with:"
echo "- PORT: $PORT"
echo "- ENABLE_AGENTKIT: $ENABLE_AGENTKIT"
echo "- ENABLE_COLLABORATION: $ENABLE_COLLABORATION"
echo "- USE_MOCK_WALLET: $USE_MOCK_WALLET"
echo "- USE_MOCK_SEARCH: $USE_MOCK_SEARCH"
echo "- PREFERRED_LLM_PROVIDER: $PREFERRED_LLM_PROVIDER"
echo "- MNEMONIC_PHRASE is set: $(if [ -n "$MNEMONIC_PHRASE" ]; then echo "Yes"; else echo "No"; fi)"
echo "- GEMINI_API_KEY is set: $(if [ -n "$GEMINI_API_KEY" ]; then echo "Yes"; else echo "No"; fi)"

# Start the server
bun run src/index.ts 