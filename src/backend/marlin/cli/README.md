# 4g3n7 Marlin Deploy CLI

A command-line utility for deploying 4g3n7 applications to Marlin Oyster Confidential Virtual Machines (CVMs).

## Installation

```bash
# Install globally
npm install -g 4g3n7-marlin-deploy

# Or use npx
npx 4g3n7-marlin-deploy <command>
```

## Commands

### Initialize a new application

Create a new 4g3n7 agent application from template:

```bash
4g3n7-marlin-deploy init [options]
```

Options:
- `-o, --output <path>`: Output directory (default: "./agent-app")
- `-p, --port <number>`: Port number (default: "3000")
- `-n, --name <name>`: Package name (default: "4g3n7-cvm-app")

### Prepare for deployment

Prepare an existing application for deployment:

```bash
4g3n7-marlin-deploy prepare <app-path> [options]
```

Arguments:
- `app-path`: Path to the application directory

Options:
- `-o, --output <path>`: Output directory for deployment files
- `-a, --arch <architecture>`: Target architecture (amd64, arm64) (default: "arm64")

### Deploy to Marlin Oyster

Deploy a prepared application to Marlin Oyster CVM:

```bash
4g3n7-marlin-deploy deploy <deploy-path> [options]
```

Arguments:
- `deploy-path`: Path to the deployment directory

Options:
- `-k, --key <private-key>`: Wallet private key
- `-d, --duration <minutes>`: Deployment duration in minutes (default: "60")
- `-a, --arch <architecture>`: Target architecture (amd64, arm64) (default: "arm64")

## Examples

```bash
# Initialize a new application
4g3n7-marlin-deploy init --output my-agent --port 4000

# Prepare for deployment
4g3n7-marlin-deploy prepare ./my-agent --arch arm64

# Deploy to Marlin Oyster
4g3n7-marlin-deploy deploy ./my-agent/deploy --key 0x123... --duration 120
```

## Requirements

- Node.js 14 or higher
- Oyster CVM CLI tool installed
- Wallet with sufficient funds for deployment
