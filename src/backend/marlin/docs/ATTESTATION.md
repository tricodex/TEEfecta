# Understanding Attestation in 4g3n7

This guide explains how attestation works in 4g3n7 when deployed to Marlin Oyster Confidential Virtual Machines (CVMs).

## What is Attestation?

Attestation is the process of verifying that a Trusted Execution Environment (TEE) is genuine and that the code running inside it has not been tampered with. It provides cryptographic proof that:

1. The hardware is a genuine TEE (like AWS Nitro Enclaves)
2. The code loaded into the TEE matches the expected measurement
3. The TEE's secure boot process was not compromised

## Attestation Flow in 4g3n7

1. **Deployment**: When you deploy your 4g3n7 application to Marlin Oyster, a unique "digest" is computed, which is a cryptographic representation of your application.

2. **Attestation Request**: A client (like your frontend) can request an attestation document from the CVM's attestation server, which runs on port 1300.

3. **Verification**: The client verifies this attestation document by checking:
   - The signature is valid and from a genuine TEE
   - The attestation document contains the expected PCR values
   - The user data in the attestation matches the expected digest

4. **Secure Communication**: After verification, the client can establish a secure communication channel with the CVM, knowing it's running the correct code.

## Verifying Attestations

### Using the Oyster CLI

```bash
oyster-cvm verify --enclave-ip <ip> --user-data <digest> --pcr-preset base/blue/v1.0.0/arm64
```

### Using the 4g3n7 Attestation Module

```javascript
const { attestation } = require('./marlin');

// Verify a CVM
const result = await attestation.verifyAttestation({
  enclaveIp: '123.456.789.012',
  userData: 'your-digest-value',
  pcrPreset: 'base/blue/v1.0.0/arm64'
});

if (result.success) {
  console.log('Attestation verified successfully!');
} else {
  console.error('Attestation verification failed:', result.error);
}
```

### Manual Verification (Low-Level)

For advanced users who want to understand the verification process:

```javascript
const { attestation } = require('./marlin');

// 1. Get the attestation document
const attestDoc = await attestation.getAttestationDocument('123.456.789.012');

// 2. Set up the verifier
const verifierPath = await attestation.setupVerifier();
const certPath = await attestation.setupCertificate();

// 3. Verify the attestation
const result = await attestation.verifyWithBinary({
  enclaveIp: '123.456.789.012',
  pcr0: 'expected-pcr0-value',
  pcr1: 'expected-pcr1-value',
  pcr2: 'expected-pcr2-value',
  verifierPath,
  maxAge: 300
});

// 4. Use the public key from the verification result
const publicKey = result.publicKey;
```

## Understanding PCR Values

Platform Configuration Registers (PCRs) are special registers that store measurements of the TEE's state:

- **PCR0**: Measures the initial state of the system, including firmware and boot loader
- **PCR1**: Measures the kernel and initial RAM disk
- **PCR2**: Measures the application code and configuration

The `pcr-preset` parameter refers to predefined sets of PCR values that correspond to known-good configurations.

## Security Best Practices

1. **Always verify attestations** before trusting a CVM with sensitive data
2. **Check the PCR values** against expected measurements
3. **Verify the user data (digest)** matches the application you intended to deploy
4. **Set a reasonable max-age** for attestation documents (typically 300 seconds)
5. **Re-verify periodically** to ensure the TEE hasn't been compromised

## Troubleshooting Attestation Issues

- **Verification fails with "PCR mismatch"**: The PCR values don't match the expected preset. This could indicate tampering or using the wrong preset.
- **Verification fails with "Certificate validation failed"**: The attestation document's certificate chain is invalid or expired.
- **Verification fails with "User data mismatch"**: The digest in the attestation document doesn't match what you provided, indicating a different application is running.

## Additional Resources

- [Marlin Oyster Attestation Documentation](https://docs.marlin.org/oyster/attestation/)
- [AWS Nitro Enclaves Attestation](https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave-concepts.html#term-attestation)
- [TEE Attestation Principles](https://confidentialcomputing.io/)