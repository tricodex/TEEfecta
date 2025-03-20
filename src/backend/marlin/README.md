# 4g3n7 Marlin Oyster CVM Backend

This module provides functionality for deploying, managing, and verifying confidential virtual machines (CVMs) on the Marlin Oyster network.

## Features

- **Deployment**: Tools for deploying applications to Marlin Oyster CVMs
- **Attestation**: Verify the authenticity and integrity of CVMs through remote attestation
- **Configuration**: Generate configuration templates for CVM deployments
- **Templates**: Pre-configured application templates for quick development
- **CLI Tool**: Command-line utility for easy deployment

## Installation

Make sure you have the Oyster CVM CLI tool installed:

```bash
# For linux, amd64
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_linux_amd64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm

# For linux, arm64
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_linux_arm64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm

# For darwin, arm64 (M series Macs)
sudo wget https://artifacts.marlin.org/oyster/binaries/oyster-cvm_latest_darwin_arm64 -O /usr/local/bin/oyster-cvm && sudo chmod +x /usr/local/bin/oyster-cvm
```

