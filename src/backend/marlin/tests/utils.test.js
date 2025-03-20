/**
 * Tests for Marlin Oyster CVM utility functions
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const utils = require('../utils');

describe('Marlin CVM Utils', () => {
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
  
  it('should create a temporary directory', async () => {
    const dir = await utils.createTempDirectory();
    
    assert.ok(fs.existsSync(dir));
    assert.ok(dir.includes('4g3n7-cvm-'));
    
    // Clean up
    fs.rmSync(dir, { recursive: true, force: true });
  });
  
  it('should calculate file hash', async () => {
    const testFile = path.join(tempDir, 'test.txt');
    fs.writeFileSync(testFile, 'Hello, world!');
    
    const hash = await utils.calculateFileHash(testFile);
    
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 64); // SHA-256 produces 64 character hex string
    
    // Known hash for 'Hello, world!'
    const expectedHash = '315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3';
    assert.strictEqual(hash, expectedHash);
  });
  
  it('should copy a directory recursively', async () => {
    // Create test directory structure
    const sourceDir = path.join(tempDir, 'source');
    fs.mkdirSync(sourceDir);
    fs.writeFileSync(path.join(sourceDir, 'file1.txt'), 'Content 1');
    
    const subDir = path.join(sourceDir, 'subdir');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'file2.txt'), 'Content 2');
    
    // Copy directory
    const destDir = path.join(tempDir, 'dest');
    await utils.copyDirectory(sourceDir, destDir);
    
    // Verify copied files
    assert.ok(fs.existsSync(destDir));
    assert.ok(fs.existsSync(path.join(destDir, 'file1.txt')));
    assert.ok(fs.existsSync(path.join(destDir, 'subdir')));
    assert.ok(fs.existsSync(path.join(destDir, 'subdir', 'file2.txt')));
    
    assert.strictEqual(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf8'), 'Content 1');
    assert.strictEqual(fs.readFileSync(path.join(destDir, 'subdir', 'file2.txt'), 'utf8'), 'Content 2');
  });
  
  it('should validate PCR values', () => {
    const validPcr = 'a'.repeat(96);
    const invalidPcr1 = 'a'.repeat(95); // Too short
    const invalidPcr2 = 'a'.repeat(97); // Too long
    const invalidPcr3 = 'g'.repeat(96); // Invalid character
    
    assert.strictEqual(utils.isValidPcr(validPcr), true);
    assert.strictEqual(utils.isValidPcr(invalidPcr1), false);
    assert.strictEqual(utils.isValidPcr(invalidPcr2), false);
    assert.strictEqual(utils.isValidPcr(invalidPcr3), false);
  });
  
  it('should format duration correctly', () => {
    assert.strictEqual(utils.formatDuration(30), '30 minutes');
    assert.strictEqual(utils.formatDuration(60), '1 hours');
    assert.strictEqual(utils.formatDuration(90), '1 hours 30 minutes');
    assert.strictEqual(utils.formatDuration(1440), '1 days');
    assert.strictEqual(utils.formatDuration(1500), '1 days 1 hours');
    assert.strictEqual(utils.formatDuration(1530), '1 days 1 hours 30 minutes');
  });
  
  it('should generate random private key', () => {
    const key = utils.generateRandomPrivateKey();
    
    assert.strictEqual(typeof key, 'string');
    assert.strictEqual(key.startsWith('0x'), true);
    assert.strictEqual(key.length, 66); // '0x' + 64 characters
  });
});
