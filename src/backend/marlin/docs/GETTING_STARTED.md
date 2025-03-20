# Getting Started with 4g3n7 on Marlin Oyster CVM

This guide will help you set up, develop, and deploy 4g3n7 applications to Marlin Oyster Confidential Virtual Machines (CVMs).

## Prerequisites

- Node.js 14 or higher
- Docker
- Oyster CVM CLI tool
- Wallet with funds on Polygon (for production deployment)

## Installation

### 1. Install the Oyster CVM CLI tool

```bash
# For macOS (ARM64)
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_darwin_arm64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm

# For Linux (ARM64)
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_linux_arm64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm

# For Linux (AMD64)
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_linux_amd64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm
```

### 2. Install the 4g3n7 CLI tool

```bash
npm install -g 4g3n7-marlin-deploy
```

## Quick Start

### 1. Initialize a new 4g3n7 application

```bash
4g3n7-marlin-deploy init --output my-agent-app
```

### 2. Customize your application

Edit the files in the `my-agent-app` directory to implement your trading logic.

### 3. Prepare for deployment

```bash
4g3n7-marlin-deploy prepare my-agent-app
```

### 4. Deploy to Marlin Oyster

```bash
4g3n7-marlin-deploy deploy my-agent-app/deploy --key YOUR_WALLET_PRIVATE_KEY --duration 60
```

## Development Workflow

### Local Development

1. Develop your application using standard Node.js practices.
2. Test locally using:
   ```bash
   cd my-agent-app
   npm install
   npm start
   ```

### Docker Testing

Before deploying to Marlin Oyster, you can test your application in a Docker container:

```bash
cd my-agent-app/deploy
docker build -t 4g3n7-local-test --build-arg TARGETARCH=arm64 .
docker run -p 3000:3000 --name 4g3n7-test 4g3n7-local-test
```

### Deployment

1. Prepare your application for deployment:
   ```bash
   4g3n7-marlin-deploy prepare my-agent-app
   ```

2. Deploy to Marlin Oyster:
   ```bash
   4g3n7-marlin-deploy deploy my-agent-app/deploy --key YOUR_WALLET_PRIVATE_KEY --duration 60
   ```

3. Verify the deployment:
   ```bash
   oyster-cvm verify --enclave-ip <ip> --user-data <digest> --pcr-preset base/blue/v1.0.0/arm64
   ```

## Security Considerations

### Private Key Management

- Never hardcode or expose your wallet private key
- Use environment variables or secure storage solutions

### Data Protection

- All sensitive data should be processed inside the CVM
- Use secure communication channels for external API calls

### Attestation Verification

- Always verify attestations before trusting a CVM
- Check PCR values against expected measurements

## Troubleshooting

### Common Issues

1. **Deployment fails with "Insufficient funds"**
   - Ensure your wallet has sufficient USDC and MATIC on Polygon

2. **Connection refused to deployed CVM**
   - Wait a few minutes for the CVM to fully initialize
   - Check if the port is correctly exposed in supervisord.conf

3. **Verification fails**
   - Ensure you're using the correct PCR preset for your architecture
   - Verify the user data (digest) matches the deployed application

### Getting Help

- Join the Marlin Discord for community support
- Check the Marlin documentation for detailed information
- Raise an issue on the 4g3n7 GitHub repository