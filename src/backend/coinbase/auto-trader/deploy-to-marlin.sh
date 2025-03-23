#!/bin/bash
# 4g3n7 Auto Trader - Marlin CVM Deployment Script
# This script automates the deployment of the 4g3n7 Auto Trader to Marlin CVM

set -e # Exit on error

# Check for required environment variables
if [ -z "$MARLIN" ]; then
    echo "ERROR: MARLIN private key environment variable not set"
    echo "Add 'export MARLIN=your_private_key_here' to your shell configuration"
    exit 1
fi

# Check for required tools
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker is required but not installed"; exit 1; }
command -v oyster-cvm >/dev/null 2>&1 || { echo "ERROR: oyster-cvm is required but not installed"; exit 1; }

# Configuration
DOCKER_TAG="4g3n7-auto-trader:latest"
DEPLOYMENT_NAME="4g3n7-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="marlin-deployment-$(date +%Y%m%d-%H%M%S).log"
MEMORY_REQUIRED=8192 # 8GB RAM
DURATION_HOURS=24    # Default deployment duration

# Banner
echo "============================================="
echo "  4g3n7 Auto Trader - Marlin CVM Deployment  "
echo "============================================="
echo ""

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $DOCKER_TAG -f Dockerfile . | tee -a $LOG_FILE
echo "✅ Docker image built successfully"

# Get Docker image digest
IMAGE_DIGEST=$(docker inspect --format='{{index .RepoDigests 0}}' $DOCKER_TAG)
DIGEST_SHORT=$(echo $IMAGE_DIGEST | cut -d':' -f2 | cut -c1-12)
echo "📋 Image digest: $DIGEST_SHORT"

# Check if the user wants to specify an entrypoint command
read -p "Do you want to specify a custom entrypoint command? (y/N): " CUSTOM_ENTRYPOINT
if [[ $CUSTOM_ENTRYPOINT =~ ^[Yy]$ ]]; then
    read -p "Enter entrypoint command: " ENTRYPOINT_CMD
    ENTRYPOINT_FLAG="--entrypoint \"$ENTRYPOINT_CMD\""
else
    ENTRYPOINT_FLAG=""
fi

# Ask for deployment duration
read -p "Enter deployment duration in hours [$DURATION_HOURS]: " DURATION_INPUT
DURATION_HOURS=${DURATION_INPUT:-$DURATION_HOURS}
DURATION_SECS=$((DURATION_HOURS * 3600))

echo ""
echo "🚀 Deploying to Marlin CVM..."
echo "- Image: $DOCKER_TAG"
echo "- Deployment name: $DEPLOYMENT_NAME"
echo "- Memory: ${MEMORY_REQUIRED}MB"
echo "- Duration: $DURATION_HOURS hours"
echo ""

# Calculate expected cost (simplified estimation)
COST_ESTIMATE=$(echo "scale=2; $MEMORY_REQUIRED * $DURATION_HOURS * 0.0003" | bc)
echo "💰 Estimated cost: $COST_ESTIMATE USDC"
read -p "Continue with deployment? (Y/n): " CONTINUE
if [[ $CONTINUE =~ ^[Nn]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Deploy to Marlin CVM
echo "🔄 Deploying to Marlin CVM... (this may take a few minutes)"
DEPLOY_CMD="oyster-cvm deploy \
    --wallet-private-key $MARLIN \
    --duration $DURATION_SECS \
    --memory $MEMORY_REQUIRED \
    --name $DEPLOYMENT_NAME \
    --docker-image $DOCKER_TAG \
    $ENTRYPOINT_FLAG"

# Execute deployment and capture output
DEPLOY_OUTPUT=$(eval $DEPLOY_CMD)
echo "$DEPLOY_OUTPUT" | tee -a $LOG_FILE

# Extract job ID and IP address from output
JOB_ID=$(echo "$DEPLOY_OUTPUT" | grep -o 'Job ID: [a-zA-Z0-9]*' | cut -d' ' -f3)
IP_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -o 'IP: [0-9.]*' | cut -d' ' -f2)

if [ -z "$JOB_ID" ] || [ -z "$IP_ADDRESS" ]; then
    echo "❌ Failed to extract deployment details. Check $LOG_FILE for more information."
    exit 1
fi

# Create deployment info file
DEPLOYMENT_INFO="deployment-info-${JOB_ID}.json"
cat > $DEPLOYMENT_INFO << EOF
{
  "deployment": {
    "name": "$DEPLOYMENT_NAME",
    "job_id": "$JOB_ID",
    "ip_address": "$IP_ADDRESS",
    "image_digest": "$IMAGE_DIGEST",
    "memory_mb": $MEMORY_REQUIRED,
    "duration_hours": $DURATION_HOURS,
    "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "expires_at": "$(date -u -d "+$DURATION_HOURS hours" +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF

echo ""
echo "✅ Deployment successful!"
echo "📝 Deployment information:"
echo "- Job ID: $JOB_ID"
echo "- IP Address: $IP_ADDRESS"
echo "- Details saved to: $DEPLOYMENT_INFO"
echo ""
echo "🖥️ To connect your frontend:"
echo "1. Open the 4g3n7 Auto Trader frontend"
echo "2. Click the 'Connect to Marlin CVM' button in the header"
echo "3. Enter the IP address: $IP_ADDRESS"
echo "4. Port: 3000 (default)"
echo ""
echo "🔍 To check deployment status:"
echo "oyster-cvm status --wallet-private-key \$MARLIN --job-id $JOB_ID"
echo ""
echo "📊 To view logs:"
echo "oyster-cvm logs --wallet-private-key \$MARLIN --job-id $JOB_ID"
echo ""
echo "⏰ To extend deployment duration:"
echo "oyster-cvm deposit --wallet-private-key \$MARLIN --job-id $JOB_ID --amount <USDC_amount>"
echo ""
echo "🔒 Deployment complete. Your 4g3n7 Auto Trader is now running securely in Marlin CVM." 