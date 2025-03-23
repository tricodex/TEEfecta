# Marlin CVM Attestation Guide

This guide provides comprehensive instructions for deploying and attesting Marlin CVM deployments, with a focus on the Arbitrum network. These tools enable you to verify the integrity and authenticity of your deployment through remote attestation.

## Overview of Attestation

Attestation is the process of cryptographically verifying that a workload is running in a secure Trusted Execution Environment (TEE). This verification ensures:

1. The workload has not been tampered with
2. The environment is a genuine TEE
3. The correct software stack is running

Marlin CVM provides attestation capabilities through the Nitro Enclaves platform.

## Prerequisite

Before using these tools, ensure you have:

1. Installed the Marlin CVM CLI (`oyster-cvm`)
2. Set up your wallet with sufficient funds
3. Have access to the Marlin CVM platform

## Scripts Included

This toolkit includes the following scripts:

| Script | Purpose |
|--------|---------|
| `minimal-docker-compose.yml` | A simplified Docker Compose file optimized for testing attestation |
| `minimal-deploy.sh` | Deploys the minimal Docker Compose to Arbitrum with proper attestation parameters |
| `arbitrum-attestation.sh` | Verifies attestation on a deployed Marlin CVM instance |
| `secure-agent-attestation.js` | Sample agent integration showing how to use attestation data |

## Deployment Process

### Step 1: Deploy the Minimal Service

The `minimal-deploy.sh` script handles deployment of a simple attestable service:

```bash
./minimal-deploy.sh
```

This script will:
- Compute the digest of your docker-compose file
- Deploy to the Arbitrum network
- Monitor for job activation
- Update the attestation script with the correct Job ID and IP address

### Step 2: Verify Attestation

Once deployment is complete, run the attestation verification script:

```bash
./arbitrum-attestation.sh
```

This script will:
- Test connectivity to the deployed service
- Verify the PCR values match the expected values
- Generate attestation data for your agent to use

## Understanding PCR Values

Platform Configuration Registers (PCRs) are values that represent the state of the secure environment:

- **PCR0**: Represents the firmware and boot measurement
- **PCR1**: Contains kernel and system component measurements
- **PCR2**: Contains application component measurements
- **PCR3-7**: Reserved for additional measurements

Different architectures (x86_64 vs ARM64) will have different PCR values for the same workload.

## Integrating Attestation with Your Agent

The `secure-agent-attestation.js` script demonstrates how to integrate attestation verification into your agent:

```javascript
// Load attestation data from file
const attestation = loadAttestation();

// Verify attestation before executing sensitive operations
if (!attestation || !attestation.attestation_verified) {
  console.error('Invalid or missing attestation data');
  return false;
}

// Proceed with agent operations in the verified secure environment
```

## Troubleshooting

### Attestation Failures

If attestation verification fails, consider:

1. **Digest Mismatch**: The docker-compose digest might have changed. Update the expected digest in the attestation script.
2. **PCR Preset**: Ensure you're using the correct PCR preset for your instance type (arm64 vs x86_64).
3. **Network Connectivity**: Ensure ports 1300 (attestation) and 3222 (application) are accessible.

### Common Errors

| Error | Solution |
|-------|----------|
| "Verification failed" | Check the PCR preset and user data digest |
| "Could not connect to attestation service" | Ensure port 1300 is accessible |
| "No active jobs found" | Deployment may have failed or the job is still initializing |

## Security Considerations

- **Private Keys**: Never expose your private keys in scripts or logs
- **Attestation Data**: Store attestation results securely 
- **Regular Verification**: Implement periodic re-attestation in long-running agents

## Advanced Usage

### Custom PCR Presets

For custom applications, you may need to create your own PCR preset:

```bash
# Generate a PCR measurement for your application
oyster-cvm measure --docker-compose your-compose.yml
```

### Continuous Attestation

For high-security applications, implement continuous attestation:

```javascript
// Check attestation periodically
setInterval(async () => {
  const verified = await verifyAttestation();
  if (!verified) {
    // Halt sensitive operations
    shutdown();
  }
}, 3600000); // Re-verify every hour
```

## Conclusion

By following this guide, you can deploy secure, verifiable workloads to Marlin CVM and integrate attestation verification into your agent workflows, ensuring your applications run in trusted execution environments.

For more information on Marlin CVM attestation capabilities, refer to the official documentation. 