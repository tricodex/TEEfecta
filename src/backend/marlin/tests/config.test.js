/**
 * Tests for Marlin Oyster CVM configuration module
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');

describe('Marlin CVM Config', () => {
  let tempDir;
  
  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), '4g3n7-test-'));
  });
  
  afterEach(() => {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  it('should export default templates', () => {
    assert.strictEqual(typeof config.DEFAULT_DOCKERFILE, 'string');
    assert.strictEqual(typeof config.DEFAULT_SETUP_SH, 'string');
    assert.strictEqual(typeof config.DEFAULT_SUPERVISORD_CONF, 'string');
  });
  
  it('should generate configuration files', async () => {
    const files = await config.generateConfigFiles({}, tempDir);
    
    assert.strictEqual(files.length, 3);
    
    const [dockerfilePath, setupPath, supervisordPath] = files;
    
    assert.ok(fs.existsSync(dockerfilePath));
    assert.ok(fs.existsSync(setupPath));
    assert.ok(fs.existsSync(supervisordPath));
    
    // Verify file contents
    assert.strictEqual(fs.readFileSync(dockerfilePath, 'utf8'), config.DEFAULT_DOCKERFILE);
    assert.strictEqual(fs.readFileSync(setupPath, 'utf8'), config.DEFAULT_SETUP_SH);
    assert.strictEqual(fs.readFileSync(supervisordPath, 'utf8'), config.DEFAULT_SUPERVISORD_CONF);
  });
  
  it('should generate configuration files with custom templates', async () => {
    const customDockerfile = 'FROM alpine:latest';
    const customSetupSh = '#!/bin/sh\necho "Custom setup"';
    const customSupervisordConf = '[supervisord]\nloglevel=info';
    
    const files = await config.generateConfigFiles({
      dockerfile: customDockerfile,
      setupSh: customSetupSh,
      supervisordConf: customSupervisordConf
    }, tempDir);
    
    assert.strictEqual(files.length, 3);
    
    const [dockerfilePath, setupPath, supervisordPath] = files;
    
    // Verify file contents
    assert.strictEqual(fs.readFileSync(dockerfilePath, 'utf8'), customDockerfile);
    assert.strictEqual(fs.readFileSync(setupPath, 'utf8'), customSetupSh);
    assert.strictEqual(fs.readFileSync(supervisordPath, 'utf8'), customSupervisordConf);
  });
  
  it('should throw an error if output directory is not provided', async () => {
    try {
      await config.generateConfigFiles({});
      assert.fail('Expected function to throw');
    } catch (error) {
      assert.strictEqual(error.message, 'Output directory is required');
    }
  });
});
