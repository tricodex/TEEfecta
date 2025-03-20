# 4g3n7 Marlin Oyster CVM Backend

This module provides functionality for deploying, managing, and verifying confidential virtual machines (CVMs) on the Marlin Oyster network.

## Features

- **Deployment**: Tools for deploying applications to Marlin Oyster CVMs
- **Attestation**: Verify the authenticity and integrity of CVMs through remote attestation
- **Configuration**: Generate configuration templates for CVM deployments
- **Templates**: Pre-configured application templates for quick development

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

## Usage

### Deployment

```javascript
const { deployment } = require('./marlin');

// Deploy a CVM instance
const deploymentResult = await deployment.deployCvm({
  walletPrivateKey: 'your-wallet-private-key',
  durationInMinutes: 60,
  dockerComposePath: './docker-compose.yml',
  arch: 'arm64' // or 'amd64'
});

console.log('Deployment result:', deploymentResult);

// List running CVMs
const runningCvms = await deployment.listRunningCvms('your-wallet-address');
console.log('Running CVMs:', runningCvms);
```

### Attestation Verification

```javascript
const { attestation } = require('./marlin');

// Verify a CVM using the Oyster CLI
const verificationResult = await attestation.verifyAttestation({
  enclaveIp: '123.456.789.012',
  userData: 'your-digest-value',
  pcrPreset: 'base/blue/v1.0.0/arm64'
});

console.log('Verification result:', verificationResult);
```

### Configuration Generation

```javascript
const { config } = require('./marlin');

// Generate configuration files for deployment
const configFiles = await config.generateConfigFiles({}, './cvm-config');
console.log('Generated config files:', configFiles);
```

### Application Templates

```javascript
const { templates } = require('./marlin');

// Generate an agent application
const appPath = await templates.generateAgentApp('./agent-app', {
  port: 4000,
  packageName: 'my-agent-app'
});

console.log('Generated application at:', appPath);
```

## Testing

Run the tests using:

```bash
npm test
```

## Security

All sensitive operations occur within the Trusted Execution Environment (TEE). The Marlin Oyster CVM ensures:

- Code integrity through attestation verification
- Data privacy through hardware-based encryption
- Secure communication between components
