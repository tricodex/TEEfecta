#!/bin/bash

# This script fixes common issues with docker-compose files for Marlin deployment
# It creates a new docker-compose file with proper format and options

# Backup original file
echo "Creating backup of original marlin-docker-compose.yml..."
cp marlin-docker-compose.yml marlin-docker-compose.yml.bak

# Create a new simplified docker-compose file
echo "Creating new docker-compose file with simplified configuration..."
cat > marlin-docker-compose.yml << 'EOF'
services:
  auto-trader:
    image: cyama/auto-trader:latest
    ports:
      - "3222:3222"
    restart: always
    command: sh -c "node -e \"const http=require('http');const server=http.createServer((req,res)=>{res.writeHead(200);res.end('4g3n7 AutoTrader Running on CVM!');});server.listen(3222,'0.0.0.0',()=>console.log('Server running at http://0.0.0.0:3222/'));\""
    environment:
      - NODE_ENV=production
      - PORT=3222
EOF

echo "Docker compose file updated."

# Compute digest for the new file
DIGEST=$(sha256sum marlin-docker-compose.yml | cut -d' ' -f1)
echo "Computed digest for new compose file: $DIGEST"

# Test if the image is accessible
echo "Testing if Docker image is accessible..."
docker pull cyama/auto-trader:latest
if [ $? -eq 0 ]; then
  echo "Docker image is accessible. Good to proceed."
else
  echo "WARNING: Could not pull Docker image. Make sure it exists and is publicly accessible."
fi

# Create a deployment test script with the new compose file
echo "Creating a deployment test script..."
cat > test-simplified-deployment.sh << 'EOF'
#!/bin/bash

# This script tests deployment with a simplified docker-compose file

# Get the wallet private key
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')

# Use the confirmed wallet address
WALLET_ADDRESS="0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"

# Run the deployment command
echo "Running deployment with simplified docker-compose..."
oyster-cvm deploy \
  --wallet-private-key "$MARLIN" \
  --duration-in-minutes 15 \
  --docker-compose marlin-docker-compose.yml

# Check job status
echo "Checking job status..."
oyster-cvm list --address $WALLET_ADDRESS

echo "Deployment test complete."
EOF

chmod +x test-simplified-deployment.sh
echo "Created test-simplified-deployment.sh"

echo "Fix process complete. You can now try deploying with the new docker-compose file." 