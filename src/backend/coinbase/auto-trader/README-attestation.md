# Marlin CVM Attestation Verification Module

This module provides attestation verification for Marlin CVM environments. It verifies the integrity of a Marlin CVM instance by checking PCR values, user data digests, and job IDs, ensuring that your workload is running in a trustworthy environment.

## Features

- **PCR Value Verification**: Verifies that the PCR (Platform Configuration Register) values match expected values for trusted environments.
- **User Data Verification**: Confirms that the user data (e.g., docker-compose configuration) has not been tampered with.
- **Secure Wallet Creation**: Only creates wallets if attestation is verified, enhancing security for key operations.
- **Job ID Validation**: Ensures the attestation corresponds to the expected job.
- **File Digest Computation**: Utility to compute SHA-256 digests of files for verification.

## Architecture

The module consists of the following components:

- `agent-attestation.js` - Core attestation verification functionality
- `test-attestation.js` - Test suite to verify the module's functionality

## Installation

This module is part of the Marlin CVM deployment tooling. No separate installation is required beyond the project dependencies.

Make sure you have the required dependencies:

```bash
cd /path/to/project
bun install
```

## Usage

### Basic Attestation Verification

```javascript
import { verifyAttestation, computeFileDigest } from './agent-attestation.js';

// Compute the digest of your docker-compose file
const composeDigest = await computeFileDigest('./docker-compose.yml');

// Verify attestation using the computed digest
const attestationVerified = await verifyAttestation(composeDigest);

if (attestationVerified) {
  console.log('Attestation verification successful');
} else {
  console.log('Attestation verification failed');
}
```

### Creating a Secure Wallet

```javascript
import { verifyAttestation, createSecureWallet } from './agent-attestation.js';

// First verify attestation
const attestationVerified = await verifyAttestation(userDataDigest);

// Attempt to create a secure wallet
// This will only succeed if attestation was verified
const privateKey = process.env.WALLET_PRIVATE_KEY;
const wallet = createSecureWallet(privateKey);

if (wallet) {
  console.log(`Secure wallet created: ${wallet.address}`);
} else {
  console.log('Could not create secure wallet: attestation not verified');
}
```

### Environment Variables

The module supports the following environment variables:

- `ATTESTATION_FILE`: Path to the attestation data JSON file (default: './attestation-data.json')
- `ATTESTATION_SERVICE`: URL of the attestation service (default: 'http://localhost:1300')
- `JOB_ID`: ID of the expected job for verification

## Running Tests

The test suite verifies all aspects of the attestation module:

```bash
node test-attestation.js
```

The tests cover:
1. Format validation
2. PCR value verification
3. User data verification
4. Job ID verification
5. File digest computation
6. Full attestation verification
7. Secure wallet creation
8. Negative tests (bad PCR values)

## Extending the Module

### Adding Support for New Platform Configurations

To add support for new platform configurations (e.g., different VM types), update the `EXPECTED_PCR_VALUES` constant:

```javascript
const EXPECTED_PCR_VALUES = {
  // Existing values
  PCR0: '0d8c50f0d0e9ecf25c48ba9ed1d8d5dc475be1dba553a0ef299f385bd7447220',
  
  // New platform values
  PCR0_PLATFORM2: 'new-pcr-value-here',
};
```

Then modify the verification logic to support platform detection and value selection.

### Adding New Verification Checks

To add new verification checks:

1. Add a new verification function
2. Update the `verifyAttestation` function to include the new check
3. Update the tests to cover the new functionality

## Security Considerations

- The module prevents wallet creation when attestation is not verified
- All verification steps must pass for attestation to be considered valid
- PCR values are hard-coded for security (not loaded from a potentially compromised source)
- Proper error handling prevents silently passing invalid attestations

## Troubleshooting

### Common Issues

**Error: Failed to load attestation data**
- Verify that the attestation file exists or the attestation service is running
- Check permissions on the attestation file

**PCR Value Mismatch**
- This typically indicates a potential security issue or a changed platform
- Verify that you're using the correct PCR values for your platform
- If this is a legitimate platform change, update the expected PCR values

**User Data Verification Failed**
- Verify that the docker-compose file has not been modified
- Recompute the digest and verify it matches the expected value

## Contributing

When contributing to this module:

1. Add tests for any new functionality
2. Maintain security-first approach for all changes
3. Document any changes to the API or behavior 