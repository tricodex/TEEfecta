# 4g3n7 Marlin CVM Deployment

This repository contains tools and scripts for deploying the 4g3n7 Auto Trader application in a Trusted Execution Environment (TEE) using Marlin Oyster Confidential Virtual Machines (CVMs).

## Overview

4g3n7 is a privacy-preserving AI financial assistant that leverages TEEs to ensure user data remains secure while executing trading algorithms. The Marlin Oyster CVM deployment enables:

- **Data Privacy**: All operations run inside a secure enclave
- **Verifiable Execution**: Remote attestation verifies the code running in the TEE
- **Secure Trading**: Execute trades with sensitive API keys protected from exposure
- **Scalable Deployment**: Easy deployment and management of CVMs

## Prerequisites

- [Marlin Oyster CVM CLI](https://docs.marlin.org/oyster/) installed
- Node.js (v16 or higher)
- Bun package manager
- Docker (for local testing)
- A Marlin wallet with POND tokens for deployment

## Installation

### Install Marlin Oyster CVM CLI

```bash
# For Linux, amd64
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_linux_amd64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm

# For Linux, arm64
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_linux_arm64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm

# For macOS, arm64 (M series Macs)
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_darwin_arm64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm
```

### Install Project Dependencies

```bash
bun install
```

## Building the CVM Image

The `build-cvm.sh` script prepares the Docker image for deployment:

```bash
# For arm64 architecture (default)
./src/backend/marlin/build-cvm.sh 

# For amd64 architecture
./src/backend/marlin/build-cvm.sh --arch amd64
```

Options:
- `--arch`: Target architecture (`arm64` or `amd64`)
- `--output`: Output directory for build artifacts
- `--version`: Version tag for the Docker image

## Deployment

### Configuration

1. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file to include your configuration:
   - Add your API keys (they will be securely stored in the TEE)
   - Configure trading parameters
   - Set network options

### Deploy to Marlin Oyster

```bash
# Simple deployment
node src/index.js deploy-marlin --wallet-key YOUR_PRIVATE_KEY

# With advanced options
node src/index.js deploy-marlin \
  --wallet-key YOUR_PRIVATE_KEY \
  --duration 120 \
  --architecture arm64
```

### Verify Deployment

After deployment, you can verify the CVM's authenticity using remote attestation:

```bash
node src/index.js verify-marlin \
  --ip CVM_IP_ADDRESS \
  --expect-digest EXPECTED_DIGEST
```

## Security Features

### Remote Attestation

The deployment includes tools for verifying that the CVM is running in a genuine TEE with the expected code:

1. The attestation process verifies the AWS Nitro enclave signature
2. Confirms the code digest matches the expected value
3. Ensures the CVM has not been tampered with

### Secure Key Management

All sensitive API keys and credentials are:
- Never exposed in plaintext outside the TEE
- Protected during transit with secure channels
- Only accessible within the attested enclave

## Operations

### Listing Running CVMs

```bash
node src/index.js list-marlin --address YOUR_WALLET_ADDRESS
```

### Stopping a CVM

```bash
node src/index.js stop-marlin --job-id JOB_ID
```

## Local Testing

For local development and testing, you can run the CVM image locally:

```bash
docker run -p 3000:3000 cyama/4g3n7-marlin-cvm:0.1.0
```

## Architecture

The deployment architecture consists of:

1. **Docker Container**: Packaged application with all dependencies
2. **Marlin Oyster CVM**: The Trusted Execution Environment running the container
3. **Attestation Server**: Provides verification of the TEE's authenticity
4. **Client Libraries**: Tools for interacting with the deployed CVM

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT 