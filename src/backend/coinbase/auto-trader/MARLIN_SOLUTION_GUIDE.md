# Marlin CVM Deployment: Solution Guide

## Overview

This guide outlines a comprehensive approach to resolving the Marlin CVM deployment issue where transactions are successful on-chain but jobs don't appear in the CLI.

## Root Cause Analysis

After extensive testing and investigation, we've identified several key issues:

1. **Docker Compose Configuration Issues**: The `network_mode: host` setting may be incompatible with Marlin CVMs.

2. **Control Plane Synchronization**: There's a disconnect between job creation on-chain and control plane indexing.

3. **CLI Limitations**: The `oyster-cvm` CLI has limitations that affect troubleshooting.

## Solution Components

We've created three specialized files to resolve these issues:

1. **Optimized Docker Compose** (`optimized-marlin-compose.yml`)
   - Uses standard port mapping instead of host network mode
   - Simplifies the environment variables
   - Changes restart policy to `always` for better reliability

2. **Direct Image Deployment** (`direct-image-deploy-fixed.sh`)
   - Bypasses docker-compose to avoid parsing issues
   - Includes architecture detection for proper instance type
   - Adds debugging flags for more verbose error reporting
   - Explicitly targets Arbitrum network

3. **Enhanced Network Monitor** (`enhanced-network-monitor.sh`)
   - Checks for jobs across all networks
   - Queries the control plane directly
   - Tests server connectivity once an IP is found
   - Implements a longer monitoring period (15 minutes)

## Implementation Instructions

Follow these steps to deploy your application on Marlin CVM:

### Setup

First, make the script files executable:

```bash
chmod +x direct-image-deploy-fixed.sh enhanced-network-monitor.sh
```

### Option 1: Deploy with Optimized Docker Compose

1. Deploy using the optimized docker-compose file:

```bash
export MARLIN=$(grep "export MARLIN=" ~/.zshrc | grep -o '"[^"]*"' | sed 's/"//g')
NETWORK=arbitrum oyster-cvm deploy --wallet-private-key "$MARLIN" --duration-in-minutes 60 --docker-compose optimized-marlin-compose.yml
```

2. Monitor for the job across all networks:

```bash
./enhanced-network-monitor.sh
```

### Option 2: Deploy with Direct Image

1. Run the direct image deployment script:

```bash
./direct-image-deploy-fixed.sh
```

2. When prompted, confirm the deployment with `y`.

3. The script will automatically monitor for the job, but you can also use the enhanced monitor:

```bash
./enhanced-network-monitor.sh
```

## Understanding the Results

The monitoring script will search across all networks and provide detailed information about:

- Job ID
- Network where the job was found
- IP address (if assigned)
- Server connectivity status

If a job is found, you'll receive instructions for accessing the server and viewing logs.

## Troubleshooting

If you encounter issues:

1. **No jobs found after monitoring**:
   - Wait longer (up to 30 minutes)
   - Try deploying with a different instance type
   - Verify your USDC balance on Arbitrum
   - Try a shorter duration (15 minutes)

2. **Job found but no IP assigned**:
   - Continue monitoring - IP assignment can take up to 10 minutes
   - Check transaction status on block explorer
   - Try direct control plane queries

3. **Job found with IP but server unreachable**:
   - Wait a few more minutes - server initialization can take time
   - Try connecting with different tools (curl, nc, telnet)
   - Check logs with `NETWORK=arbitrum oyster-cvm logs --ip <IP>`

## Long-term Recommendations

1. **Always specify the network**: Use `NETWORK=arbitrum` for all commands

2. **Use standard port mapping**: Avoid `network_mode: host` in docker-compose files

3. **Save transaction hashes**: Track all deployment transaction hashes for troubleshooting

4. **Implement longer monitoring**: Allow 10-15 minutes for jobs to become visible

5. **Use architecture-specific instance types**: `c6a.xlarge` for x86_64, `c7g.xlarge` for ARM

## Conclusion

This solution addresses the complex issue of Marlin CVM jobs not appearing in the CLI despite successful on-chain transactions. By implementing these changes, you should be able to successfully deploy and monitor your 4g3n7 Auto Trader application.
