/**
 * Main tests for Marlin Oyster CVM backend
 */

const assert = require('assert');
const marlin = require('../index');

describe('Marlin Backend', () => {
  it('should export required modules', () => {
    assert.strictEqual(typeof marlin.deployment, 'object');
    assert.strictEqual(typeof marlin.attestation, 'object');
    assert.strictEqual(typeof marlin.config, 'object');
    assert.strictEqual(typeof marlin.utils, 'object');
  });
  
  it('should export deployment functions', () => {
    assert.strictEqual(typeof marlin.deployment.installOysterCli, 'function');
    assert.strictEqual(typeof marlin.deployment.verifyOysterCli, 'function');
    assert.strictEqual(typeof marlin.deployment.generateDockerCompose, 'function');
    assert.strictEqual(typeof marlin.deployment.deployCvm, 'function');
    assert.strictEqual(typeof marlin.deployment.listRunningCvms, 'function');
  });
  
  it('should export attestation functions', () => {
    assert.strictEqual(typeof marlin.attestation.getAttestationDocument, 'function');
    assert.strictEqual(typeof marlin.attestation.verifyAttestation, 'function');
    assert.strictEqual(typeof marlin.attestation.setupCertificate, 'function');
    assert.strictEqual(typeof marlin.attestation.setupVerifier, 'function');
    assert.strictEqual(typeof marlin.attestation.verifyWithBinary, 'function');
  });
  
  it('should export config functions', () => {
    assert.strictEqual(typeof marlin.config.generateConfigFiles, 'function');
  });
  
  it('should export utility functions', () => {
    assert.strictEqual(typeof marlin.utils.createTempDirectory, 'function');
    assert.strictEqual(typeof marlin.utils.calculateFileHash, 'function');
    assert.strictEqual(typeof marlin.utils.copyDirectory, 'function');
    assert.strictEqual(typeof marlin.utils.isPortInUse, 'function');
    assert.strictEqual(typeof marlin.utils.generateRandomPrivateKey, 'function');
    assert.strictEqual(typeof marlin.utils.isValidPcr, 'function');
    assert.strictEqual(typeof marlin.utils.formatDuration, 'function');
  });
});
