/**
 * Integration tests for Marlin deployment
 * 
 * NOTE: These tests are designed to be skipped by default since they require
 * actual blockchain transactions and deployment. To run them, set the
 * environment variable RUN_INTEGRATION_TESTS=true.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const deployment = require('../../deployment');

const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

// Skip all tests if RUN_INTEGRATION_TESTS is not set to true
(shouldRunIntegrationTests ? describe : describe.skip)('Marlin CVM Integration Tests', () => {
  let tempDir;
  
  before(() => {
    // Create a temporary deployment directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), '4g3n7-integration-test-'));
    
    // Copy the docker-compose.yml to the temp directory
    const srcDockerCompose = path.join(
      __dirname, '..', 'docker', 'docker-compose.yml'
    );
    const destDockerCompose = path.join(tempDir, 'docker-compose.yml');
    fs.copyFileSync(srcDockerCompose, destDockerCompose);
  });
  
  after(() => {
    // Clean up the temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  it('should verify Oyster CLI installation', async () => {
    const isInstalled = await deployment.verifyOysterCli();
    assert.strictEqual(isInstalled, true, 'Oyster CLI should be installed');
  });
  
  it('should generate docker-compose.yml', async () => {
    const dockerComposePath = path.join(tempDir, 'generated-docker-compose.yml');
    
    await deployment.generateDockerCompose({
      services: {
        agent: {
          image: '4g3n7-marlin-cvm:test',
          network_mode: 'host',
          restart: 'unless-stopped',
          init: true
        }
      }
    }, dockerComposePath);
    
    assert.ok(fs.existsSync(dockerComposePath), 'Docker compose file should be generated');
    
    const content = fs.readFileSync(dockerComposePath, 'utf8');
    assert.ok(content.includes('4g3n7-marlin-cvm:test'), 'Docker compose should contain the image name');
  });
  
  // This test is skipped even if RUN_INTEGRATION_TESTS is true, as it would make an actual deployment
  it.skip('should deploy CVM to Marlin Oyster network', async () => {
    const dockerComposePath = path.join(tempDir, 'docker-compose.yml');
    
    // This would require a real private key with funds
    const walletPrivateKey = process.env.TEST_WALLET_PRIVATE_KEY;
    
    if (!walletPrivateKey) {
      throw new Error('TEST_WALLET_PRIVATE_KEY environment variable must be set to run this test');
    }
    
    const result = await deployment.deployCvm({
      walletPrivateKey,
      durationInMinutes: 15, // Short duration for testing
      dockerComposePath,
      arch: 'arm64'
    });
    
    assert.strictEqual(result.success, true, 'Deployment should succeed');
    assert.ok(result.digest, 'Deployment should return a digest');
    assert.ok(result.ip, 'Deployment should return an IP address');
  });
});
