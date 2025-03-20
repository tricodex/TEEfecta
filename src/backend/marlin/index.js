/**
 * Marlin Oyster CVM Backend Module
 * 
 * This module provides functionality for deploying, managing, and verifying
 * confidential virtual machines (CVMs) on the Marlin Oyster network.
 */

const deployment = require('./deployment');
const attestation = require('./attestation');
const config = require('./config');
const utils = require('./utils');

module.exports = {
  deployment,
  attestation,
  config,
  utils,
};
