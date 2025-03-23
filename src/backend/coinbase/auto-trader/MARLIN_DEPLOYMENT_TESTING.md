# Marlin CVM Deployment Testing Guide

This guide outlines a systematic approach to testing and troubleshooting Marlin CVM deployments. Each step builds on the previous one, providing more diagnostic information to identify and resolve deployment issues.

## Prerequisites

- Ensure the `MARLIN` environment variable is properly set with the private key
- Confirm the Docker image `cyama/auto-trader:latest` is accessible
- Verify `oyster-cvm` CLI version 0.1.0 is installed

## Step 1: Verify Wallet Address

**Script**: `test-wallet-address.mjs`

```bash
export MARLIN=$(cat ~/.zshrc | grep MARLIN | grep -o '".*"' | tr -d '"')
node test-wallet-address.mjs
```

This script confirms the wallet address derived from your private key. The correct address should be `0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8`.

## Step 2: Check Oyster-CVM CLI Version and Capabilities

**Script**: `check-oyster-version.sh`

```bash
./check-oyster-version.sh
```

This script provides detailed information about the available commands and options in the `oyster-cvm` CLI.

Key findings:
- No `--network` flag exists (contrary to earlier assumptions)
- `--debug` flag is available for the `deploy` command
- Several options exist for instance type and region specification

## Step 3: Verify PCR Values for Attestation

**Script**: `verify-pcr-values.sh`

```bash
./verify-pcr-values.sh
```

This script attempts to check PCR values used for attestation. Note that full verification requires an enclave IP which we'll only have after successful deployment.

## Step 4: Fix Docker Compose Configuration

**Script**: `fix-marlin-compose.sh`

```bash
./fix-marlin-compose.sh
```

This script creates a simplified docker-compose file optimized for Marlin CVM deployment:
- Uses standard port mapping instead of host network mode
- Reduces environment variables to minimum
- Preserves the essential server functionality

## Step 5: Deploy with Simplified Configuration

**Script**: `test-simplified-deployment.sh`

```bash
./test-simplified-deployment.sh
```

This script attempts deployment using the simplified docker-compose file. Monitor the output for any error messages or transaction hashes.

## Step 6: Try Debug Mode Deployment

**Script**: `debug-deployment.sh`

```bash
./debug-deployment.sh
```

If the simplified deployment doesn't work, this script tries a more comprehensive approach:
- Enables debug mode for more verbose logs
- Specifies instance type based on architecture detection
- Includes region and PCR preset parameters
- Monitors for job appearance and attempts to fetch logs

## Step 7: Direct Image Deployment

If docker-compose deployments fail, try deploying directly with the Docker image:

**Script**: `direct-image-deploy.sh`

```bash
./direct-image-deploy.sh
```

This bypasses any docker-compose parsing issues and directly uses the Docker image.

## Troubleshooting

### Common Issues and Solutions

1. **No jobs appearing after successful transaction**
   - Check transaction status on the blockchain
   - Verify you have sufficient USDC on the correct network
   - Use `--debug` flag to get more detailed logs
   - Contact Marlin support with transaction hashes

2. **Network mode issues**
   - Use standard port mapping instead of host network mode
   - Try both approaches to see which works in the enclave environment

3. **Attestation failures**
   - Ensure PCR values match expected values
   - Try different PCR presets if available

## Logging and Monitoring

All scripts automatically create detailed log files with timestamps. These logs are essential for:

1. Troubleshooting deployment issues
2. Sharing information with Marlin support
3. Tracking progress across multiple deployment attempts

## Success Verification

A successful deployment will:

1. Return a job ID in the format `0x...`
2. Eventually provide an IP address
3. Allow access to the deployed application at `http://<IP>:3222/`
4. Enable log streaming with `oyster-cvm logs --ip <IP>`

Once deployed, test the application by sending a simple HTTP request to confirm it's operational:

```bash
curl http://<IP>:3222/
```

Expected response: `4g3n7 AutoTrader Running on CVM!` 