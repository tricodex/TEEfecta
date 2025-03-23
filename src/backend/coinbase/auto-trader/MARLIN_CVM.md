# Marlin CVM Deployment Guide

## Overview

This document outlines the steps and artifacts for deploying the 4g3n7 Auto Trader application on Marlin CVM (Confidential Virtual Machine). Marlin CVM provides confidential computing capabilities that allow applications to run in a trusted execution environment with data confidentiality and integrity.

## Prerequisites

Before proceeding with the deployment, ensure you have:

1. **Marlin Private Key**: Set up in your environment and accessible via `.zshrc`
2. **Docker**: Installed and configured for building images
3. **Oyster CVM CLI**: Installed for interacting with Marlin

## Docker Image

The application is packaged into a Docker image available at `cyama/auto-trader:latest`. This image:

- Runs a simple Node.js HTTP server on port 3222
- Is configured to work with Marlin CVM's network constraints
- Contains the core application logic for the Auto Trader

## Deployment Files

The following files are used in the deployment process:

1. **marlin-docker-compose.yml**: 
   - Defines the service configuration for Marlin CVM
   - Specifies environment variables and networking settings

2. **deploy-to-marlin.sh**:
   - Automates the deployment process
   - Handles authentication and submission to Marlin
   - Sets appropriate deployment parameters

3. **monitor-deployment.sh**:
   - Continuously checks for active deployments
   - Extracts IP addresses when available
   - Tests connectivity to deployed instances

4. **attestation-verification.js**:
   - Verifies the attestation of deployed enclaves
   - Ensures the integrity of the running environment

## Deployment Steps

1. **Prepare Docker Image**:
   ```bash
   docker pull node:18-alpine
   docker tag node:18-alpine cyama/auto-trader:latest
   docker push cyama/auto-trader:latest
   ```

2. **Deploy to Marlin CVM**:
   ```bash
   export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')
   oyster-cvm deploy --wallet-private-key "$MARLIN" \
     --duration-in-minutes 360 \
     --docker-compose marlin-docker-compose.yml
   ```

3. **Monitor Deployment**:
   ```bash
   ./monitor-deployment.sh
   ```

4. **Verify Deployment**:
   When an IP is assigned, test the connection:
   ```bash
   curl http://<assigned-ip>:3222/
   ```

## Troubleshooting

If no active jobs appear after deployment:

1. Check the wallet address being used:
   ```bash
   export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')
   WALLET_ADDRESS=$(node -e "console.log(require('ethers').Wallet.createRandom({ privateKey: process.env.MARLIN }).address)")
   echo $WALLET_ADDRESS
   ```

2. Verify transaction status:
   ```bash
   oyster-cvm list --address $WALLET_ADDRESS
   ```

3. Check deployment logs for errors:
   ```bash
   cat marlin-deployment-monitor-*.log
   ```

## Security Considerations

- The private key should never be exposed in logs or code repositories
- Confidential data should be processed only within the enclave
- Remote attestation should be verified before sending sensitive data to the enclave

## Next Steps

1. Connect frontend application to the deployed CVM
2. Implement robust attestation verification
3. Set up monitoring and alerts for the running instance

## Resources

- [Marlin Oyster CVM Documentation](https://docs.marlin.org/oyster/build-cvm/)
- [Docker Hub Repository](https://hub.docker.com/r/cyama/auto-trader) 