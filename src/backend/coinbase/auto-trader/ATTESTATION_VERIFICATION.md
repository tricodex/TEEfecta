# Attestation Verification Guide

This guide provides in-depth instructions for setting up proper attestation verification for the 4g3n7 trading agent to ensure trustworthy and transparent operation.

## Why Attestation Matters

Attestation verification is crucial because it:

1. **Proves Code Integrity**: Verifies the exact code running in the enclave matches what was deployed
2. **Ensures TEE Environment**: Confirms the code is running in a genuine Trusted Execution Environment
3. **Prevents Tampering**: Detects any modifications to the application or environment
4. **Builds Trust**: Allows users to verify the agent operates as expected

## Attestation Components

The attestation system consists of three key components:

1. **PCR Values**: Platform Configuration Register values that represent the enclave's state
2. **User Data**: A digest of the deployed application (Docker image)
3. **Attestation Report**: A cryptographically signed report from the TEE

## Setting Up Attestation

### 1. Update AttestationService Implementation

The current implementation in `src/services/attestation.ts` needs to be updated for production use:

```typescript
// Example of proper PCR verification
const verifyPcrs = (pcrs: any, expectedPcrs: any): boolean => {
  if (!pcrs || !expectedPcrs) return false;
  
  return pcrs.pcr0 === expectedPcrs.pcr0 &&
         pcrs.pcr1 === expectedPcrs.pcr1 &&
         pcrs.pcr2 === expectedPcrs.pcr2;
};

// Verify attestation cryptographically
const verifyAttestationReport = (report: any, publicKey: string): boolean => {
  // Implement proper cryptographic verification
  // This should verify the signature on the attestation report
  // using the public key of the attestation service
  
  // Example implementation (replace with actual verification)
  try {
    const verifier = crypto.createVerify('sha256');
    verifier.update(JSON.stringify(report.payload));
    return verifier.verify(publicKey, report.signature, 'hex');
  } catch (error) {
    console.error('Error verifying attestation signature:', error);
    return false;
  }
};
```

### 2. Configure Known Good PCR Values

The PCR values should be configured based on the Marlin CVM version:

```typescript
private static readonly PCR_PRESETS: Record<string, { pcr0: string; pcr1: string; pcr2: string; }> = {
  'base/blue/v1.0.0/amd64': {
    pcr0: 'cfa7554f87ba13620037695d62a381a2d876b74c2e1b435584fe5c02c53393ac1c5cd5a8b6f92e866f9a65af751e0462',
    pcr1: 'bcdf05fefccaa8e55bf2c8d6dee9e79bbff31e34bf28a99aa19e6b29c37ee80b214a414b7607236edf26fcb78654e63f',
    pcr2: '20caae8a6a69d9b1aecdf01a0b9c5f3eafd1f06cb51892bf47cef476935bfe77b5b75714b68a69146d650683a217c5b3'
  },
  'base/blue/v1.0.0/arm64': {
    pcr0: '7e0612b91f9cb410c51cd6a9e4f1eb16f7d9e925651f547e60e25fd581c66d2990e9cf8380d7c927fa492386053f9cd2',
    pcr1: 'ab08f4b1dcf5e18fe94a9032d1004d938e9fb0cb7cbf818acc7b1156cc1bb9f66da00528beeff9d981cd11150cd05248',
    pcr2: 'db181e656255b97406cf7f9e4694dbaa1cd3a552177b83af55caa2598792fd2e0cc44c1f4f61174cce2d16ec3f2072c7'
  }
};
```

> **Note**: These values must match the Marlin CVM version used for deployment.

### 3. Add API Endpoint for Attestation

Add an API endpoint to allow clients to verify the attestation:

```typescript
// In src/api/routes.ts
router.get('/attestation', async (req, res) => {
  try {
    // Get the enclave IP (in production this would be localhost)
    const enclaveIp = process.env.MARLIN_ENCLAVE === 'true' ? 'localhost' : req.query.ip as string;
    
    // Get attestation from the enclave
    const attestationResult = await AttestationService.verifyAttestation(
      enclaveIp,
      req.query.pcrPreset as string,
      req.query.userData as string
    );
    
    // Return the verification result
    res.json(attestationResult);
  } catch (error) {
    console.error('Error in attestation verification:', error);
    res.status(500).json({
      verified: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
```

## Verification Process

### 1. Deployment Verification

After deploying to Marlin CVM, verify the attestation:

```bash
# Replace values with those from your deployment
oyster-cvm verify \
  --enclave-ip <ip> \
  --user-data <digest> \
  --pcr-preset base/blue/v1.0.0/arm64
```

The output should show:

```
Verification successful
Public key: <public_key>
PCR0: <pcr0_value>
PCR1: <pcr1_value>
PCR2: <pcr2_value>
```

### 2. Runtime Verification

For continuous verification during operation:

```typescript
// Example implementation in a monitor service
const monitorAttestationStatus = async (enclaveIp: string) => {
  try {
    const result = await AttestationService.getAttestationStatus(enclaveIp);
    
    if (!result.verified) {
      console.error('Attestation verification failed during monitoring:', result.error);
      // Trigger alerts, notifications, or shutdown procedures
      await notifyAdmins('Attestation failure detected: ' + result.error);
    }
    
    console.log('Attestation verification succeeded:', result);
    return result.verified;
  } catch (error) {
    console.error('Error monitoring attestation:', error);
    return false;
  }
};
```

## Integrating with Recall Network for Transparency

The attestation verification should be recorded in Recall Network for transparency:

```typescript
// Example implementation to store attestation verification
const recordAttestationVerification = async (
  result: AttestationResult,
  memoryManager: RecallMemoryManager
) => {
  try {
    await memoryManager.store('attestation', result, {
      timestamp: new Date().toISOString(),
      enclave: process.env.MARLIN_ENCLAVE === 'true',
      verified: result.verified
    });
    
    console.log('Attestation verification recorded in Recall Network');
    return true;
  } catch (error) {
    console.error('Failed to record attestation verification:', error);
    return false;
  }
};
```

## Client-Side Verification

To allow client applications to verify the agent's attestation:

```typescript
// Example client-side verification
const verifyAgentAttestation = async (agentUrl: string) => {
  try {
    // Fetch attestation from agent
    const response = await fetch(`${agentUrl}/api/attestation`);
    const attestation = await response.json();
    
    // Verify PCR values against known good values
    const knownPcrs = {
      pcr0: 'expected_pcr0_value',
      pcr1: 'expected_pcr1_value',
      pcr2: 'expected_pcr2_value'
    };
    
    const pcrsMatch = attestation.pcrs &&
                      attestation.pcrs.pcr0 === knownPcrs.pcr0 &&
                      attestation.pcrs.pcr1 === knownPcrs.pcr1 &&
                      attestation.pcrs.pcr2 === knownPcrs.pcr2;
    
    if (!pcrsMatch) {
      console.error('PCR values do not match expected values');
      return false;
    }
    
    return attestation.verified;
  } catch (error) {
    console.error('Error verifying agent attestation:', error);
    return false;
  }
};
```

## Advanced Verification Features

For production systems, consider these advanced verification features:

### 1. Chain of Trust Verification

Implement a chain of trust verification using the Marlin attestation verifier enclave:

```bash
# Deploy the attestation verifier enclave
oyster-cvm deploy \
  --wallet-private-key <wallet_private_key> \
  --duration-in-minutes 1440 \
  --docker-compose attestation-verifier.yml
```

### 2. Periodic Verification

Implement periodic verification to detect any changes in the enclave:

```typescript
// Example periodic verification implementation
setInterval(async () => {
  const verified = await monitorAttestationStatus(enclaveIp);
  if (!verified) {
    // Take action on verification failure
    await shutdownOrRestrictAgent();
  }
}, 3600000); // Verify every hour
```

### 3. Multi-Party Verification

For critical deployments, implement multi-party verification:

```typescript
// Example multi-party verification
const verifyWithMultipleParties = async (enclaveIp: string, digest: string) => {
  const verificationEndpoints = [
    'https://verifier1.example.com/verify',
    'https://verifier2.example.com/verify',
    'https://verifier3.example.com/verify'
  ];
  
  const results = await Promise.all(
    verificationEndpoints.map(endpoint => 
      fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ enclaveIp, digest }),
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.json())
    )
  );
  
  // Require at least 2 of 3 verifiers to confirm
  const verifiedCount = results.filter(result => result.verified).length;
  return verifiedCount >= 2;
};
```

## Conclusion

Proper attestation verification is essential for establishing trust in the 4g3n7 trading agent. By implementing these verification procedures and integrating with Recall Network for transparent storage, you ensure that:

1. The agent runs in a genuine TEE
2. The code has not been tampered with
3. All operations are verifiably secure
4. Users can independently verify the agent's integrity

This creates a foundation of trust for autonomous trading operations.
