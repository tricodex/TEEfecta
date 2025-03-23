# Marlin CVM Support Request

## Issue Summary

Transactions are succeeding on the blockchain but deployed jobs don't appear in the CLI job list. Multiple successful transactions and deployment approaches have been attempted.

## Wallet & Transaction Details

- **Wallet Address**: `0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8`

**Recent Transaction Hashes**:
| Transaction Hash | Method | Status | Network |
|------------------|--------|--------|---------|
| 0x86d4fe26136866b265f61b940c630f5b89d18737638ec9f9b02bf0f9ee4357e8 | Job Metadata Update | SUCCESS | Arbitrum |
| 0xf8d46e917ea0d62db4f2b023cd8538e5039c58be43469bab354cb6a1b24efe7a | Job Open | SUCCESS | Arbitrum |
| 0x0068c354d9fa7a9ef87f6fea406bdf5541bbd2c45bc5b796e0e9e57685299d90 | Approve | SUCCESS | Arbitrum |

## Deployment Configurations

### Docker Image
- **Image**: `cyama/auto-trader:latest` (based on `node:18-alpine`)
- **Port**: 3222
- **Network Mode**: host (in docker-compose)

### Docker Compose File
```yaml
services:
  auto-trader:
    image: cyama/auto-trader:latest
    network_mode: host
    restart: unless-stopped
    command: sh -c "echo 'Server starting on port 3222' && node -e \"const http=require('http');const server=http.createServer((req,res)=>{res.writeHead(200);res.end('4g3n7 AutoTrader Running on CVM!');});server.listen(3222,'0.0.0.0',()=>console.log('Server running at http://0.0.0.0:3222/'));\""
    environment:
      - NODE_ENV=production
      - PORT=3222
```

## Commands Tried

### 1. Standard Docker Compose Deployment
```bash
oyster-cvm deploy --wallet-private-key "$PRIVATE_KEY" \
  --duration-in-minutes 360 \
  --docker-compose marlin-docker-compose.yml
```

### 2. Direct Image Deployment
```bash
oyster-cvm deploy --wallet-private-key "$PRIVATE_KEY" \
  --duration-in-minutes 15 \
  --image cyama/auto-trader:latest
```

### 3. Debug Mode Deployment
```bash
oyster-cvm deploy --wallet-private-key "$PRIVATE_KEY" \
  --duration-in-minutes 15 \
  --docker-compose marlin-docker-compose.yml \
  --debug
```

### 4. Deployment with Explicit Instance Type
```bash
oyster-cvm deploy --wallet-private-key "$PRIVATE_KEY" \
  --duration-in-minutes 15 \
  --docker-compose marlin-docker-compose.yml \
  --instance-type "c7g.xlarge"
```

## Job Status Check Results

### CLI Check
```bash
oyster-cvm list --address 0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8

# Output:
# 2025-03-22T22:03:30.741341Z  INFO oyster_cvm::commands::list: Listing active jobs for wallet address: 0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8
# 2025-03-22T22:03:31.381102Z  INFO oyster_cvm::commands::list: No active jobs found for address: 0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8
```

### Network Checks
I checked across multiple networks (arbitrum, polygon, ethereum, optimism, base) using various environment variables:
```bash
export MARLIN_NETWORK=arbitrum
export NETWORK=arbitrum
export OYSTER_NETWORK=arbitrum
oyster-cvm list --address 0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8
```

All networks returned "No active jobs found".

## System Information

- **CLI Version**: `oyster-cvm 0.1.0`
- **OS**: macOS 24.3.0 (ARM64)
- **Deployed Job Parameters** (from transaction analysis):
```json
{
  "debug": true,
  "family": "tuna",
  "instance": "c6g.large",
  "memory": 2048,
  "region": "ap-south-1",
  "url": "https://artifacts.marlin.org/oyster/eifs/base-blue_v1.0.0_linux_arm64.eif",
  "vcpu": 1
}
```

## Specific Questions

1. **Network Issue**: Transactions appear on Arbitrum, but jobs don't show up. Is there a specific network I should be checking?

2. **Job ID Format**: What format should I use for job IDs in checks?
   - `0x0000000000000000000000000000000000000000000000000000000000000b66`
   - `0xb66`
   - `b66`

3. **CLI Configuration**: Are there specific environment variables or config files that might affect the CLI's behavior?

4. **Job Appearance Timing**: How long should jobs take to appear after a successful transaction? Are there intermediary states?

## Contact Information

- **Email**: [Your Email]
- **Discord/Telegram**: [Your Handle] 