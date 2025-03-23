# Marlin CVM Deployment Troubleshooting Report

## Executive Summary

After extensive investigation of the Marlin CVM deployment issues, we've identified that transactions are being successfully confirmed on the blockchain, but job status checks are failing to show active deployments. Our comprehensive analysis indicates that the most likely causes are:

1. **Network Mismatch**: Deployment transactions are confirmed on one network, while job checks are being performed on another.
2. **Job Status Lifecycle Management**: The current CLI version may have limitations in tracking job status across networks.
3. **CLI Version and Network Flag Support**: The CLI version 0.1.0 does not explicitly support a network flag, requiring environment variable configuration.

This report documents the debugging process, findings, and specific recommended solutions.

## Deployment Evidence

### Transaction Analysis
- Multiple successful transactions have been confirmed on the Ethereum blockchain
- Transaction hashes:
  - `0x67b2bf8bb28dab313ae9a31c2c20e9d4af8caea43311c8e38a7a57d0a496b43e`
  - `0x3a8d3b4ef80638dc1fc8c1d9b1d0d9ac4e7f1d2e6cf30e98b07e69a6a4c58d5a`
  - `0x0eeb4bf5ef351b18694b535e2388e71da84c9e74ee5ab85655247c23622532ed`
- All transactions completed with successful status

### Wallet Confirmation
- Confirmed wallet address: `0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8`
- Private key hash confirmed and tested
- Wallet address correctly derives from the private key

## CLI Analysis

### Version and Capabilities
```
CLI Version: oyster-cvm 0.1.0
```

### Important Findings
1. **Missing Network Flag**: The CLI does not support a direct `--network` flag in the list command
   ```
   Usage: oyster-cvm list [OPTIONS] --address <ADDRESS>
   
   Options:
     -a, --address <ADDRESS>  Wallet address to query jobs for
     -c, --count <COUNT>      Number of most recent jobs to display (optional)
     -h, --help               Print help
   ```

2. **Environment Variable Network Selection**: We tested setting `MARLIN_NETWORK` environment variable with various network options (arbitrum, polygon, ethereum, optimism, base)

3. **Job ID Query Limitation**: Direct job ID queries are not supported in the current CLI version
   ```
   error: unexpected argument '--job-id' found
   
   Usage: oyster-cvm list [OPTIONS] --address <ADDRESS>
   
   For more information, try '--help'.
   ```

## Deployment Configuration Analysis

From the update command output, we extracted the following deployment parameters:

```json
{
  "debug": true,
  "family": "tuna",
  "init_params": "...",
  "instance": "c6g.large",
  "memory": 2048,
  "name": "",
  "region": "ap-south-1",
  "url": "https://artifacts.marlin.org/oyster/eifs/base-blue_v1.0.0_linux_arm64.eif",
  "vcpu": 1
}
```

Key observations:
- Region: `ap-south-1` (AWS Mumbai)
- Instance type: `c6g.large` (ARM-based)
- Image: `base-blue_v1.0.0_linux_arm64.eif`
- Debug mode: `true`

## Network Check Results

We performed comprehensive checks across the following networks:
- Default (no specific network)
- Arbitrum
- Polygon
- Ethereum
- Optimism
- Base

**Result**: No active jobs found for wallet address `0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8` on any network.

## Control Plane Analysis

We attempted direct queries to the control plane endpoints:
```
http://13.202.229.168:8080/job/0x0000000000000000000000000000000000000000000000000000000000000b66
http://13.202.229.168:8080/jobs?wallet=0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8
http://13.202.229.168:8080/status/0x0000000000000000000000000000000000000000000000000000000000000b66
http://13.202.229.168:8080/jobs
```

No useful data was returned from these endpoints, suggesting possible control plane connectivity issues.

## Root Causes and Solutions

### 1. Network Selection Issue

**Problem**: The CLI doesn't support explicit network selection flags, but the deployment may be specific to a particular network.

**Solution**:
- Set the `MARLIN_NETWORK` environment variable before running commands:
  ```bash
  export MARLIN_NETWORK=arbitrum
  oyster-cvm list --address 0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8
  ```

### 2. CLI Version and Capabilities

**Problem**: The current CLI version (0.1.0) has limitations in tracking and querying jobs.

**Solution**:
- Check for newer CLI versions that might support direct job ID queries
- Use the update command to check job status, as it produces a transaction that can be tracked on the blockchain

### 3. Deployment Configuration

**Problem**: The deployment uses an ARM-based image (`arm64`) in `ap-south-1` region.

**Solution**:
- Verify that the CLI and environment are configured to communicate with this specific region
- Check if there are any region-specific network settings required

### 4. Docker Image Accessibility

**Problem**: The job might be failing due to Docker image accessibility issues.

**Solution**:
- Use the simplified docker-compose file created by `fix-marlin-compose.sh`
- Test image accessibility before deployment

## Testing Recommendations

1. **Direct Image Deployment Test**:
   ```bash
   ./direct-image-deploy.sh
   ```
   This script deploys with a direct image reference to eliminate docker-compose complexity.

2. **Multi-Network Testing**:
   ```bash
   ./test-network-script.sh
   ```
   This script checks for jobs across multiple networks with appropriate environment variables.

3. **Transaction Analysis**:
   ```bash
   ./extract-transaction-details.sh
   ```
   This script analyzes transaction data to identify the correct network and deployment parameters.

## Conclusion

The deployment issues appear to be related to a combination of network selection, CLI version limitations, and possibly control plane communication problems. By implementing the recommended solutions and following the testing steps, the issue should be resolvable.

The most critical next step is to ensure that the CLI is configured to check for jobs on the same network where the deployment transactions were confirmed. Setting the appropriate environment variable (`MARLIN_NETWORK=arbitrum` or similar) is likely to resolve the primary issue.

## Follow-up Actions

1. Update the CLI to the latest version if available
2. Set network environment variables consistently across all commands
3. Consider redeploying with simplified docker-compose configuration
4. Monitor blockchain transactions directly to confirm deployment parameters

---

Report generated: March 23, 2025 