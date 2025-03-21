/**
 * Environment variable validator for 4g3n7.
 * 
 * This script validates that all required environment variables are present
 * for the 4g3n7 secure financial assistant to function properly.
 * 
 * Usage:
 *    node utils/env.js
 */

// Environment variable requirements for each component
const REQUIRED_ENV_VARS = {
  core: [
    'NODE_ENV', // 'development' or 'production'
    'PORT'
  ],
  recall: [
    'RECALL_PRIVATE_KEY',
    'RECALL_BUCKET_ALIAS',
    'RECALL_COT_LOG_PREFIX',
    'RECALL_NETWORK'
  ],
  coinbase: [
    'COINBASE_CDP_KEY',
    'COINBASE_CDP_SECRET',
    'COINBASE_CDP_CLIENT_KEY'
  ],
  ethereum: [
    'ETHEREUM_PRIVATE_KEY',
    'ETHERSCAN_API_KEY'
  ],
  marlin: [
    'MARLIN_ENCLAVE'
  ],
  azure: [
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_API_INSTANCE_NAME',
    'AZURE_OPENAI_API_DEPLOYMENT_NAME',
    'AZURE_OPENAI_API_VERSION'
  ]
};

/**
 * Validates all required environment variables and returns validation status.
 * 
 * @returns {Object} - Object with component validation status
 */
function validateEnvironment() {
  // Track validation results
  const validation = {};
  const missingVars = new Set();
  
  // Check each component
  for (const [component, requiredVars] of Object.entries(REQUIRED_ENV_VARS)) {
    validation[component] = {};
    for (const varName of requiredVars) {
      const isValid = varName in process.env && 
                       process.env[varName] && 
                       process.env[varName] !== 'your_placeholder_value';
      validation[component][varName] = isValid;
      if (!isValid) {
        missingVars.add(varName);
      }
    }
  }
  
  // Print results
  console.log('\n===== 4g3n7 Environment Validation =====\n');
  
  let allValid = true;
  for (const [component, varsStatus] of Object.entries(validation)) {
    const componentValid = Object.values(varsStatus).every(valid => valid);
    allValid = allValid && componentValid;
    const status = componentValid ? '✅ VALID' : '❌ INVALID';
    console.log(`${component.toUpperCase()} Component: ${status}`);
    
    // Show detailed status if component has issues
    if (!componentValid) {
      for (const [varName, isValid] of Object.entries(varsStatus)) {
        const varStatus = isValid ? '✅' : '❌';
        console.log(`  ${varStatus} ${varName}`);
      }
    }
  }
  
  console.log('\n=======================================');
  if (allValid) {
    console.log('✅ All environment variables are properly configured.');
  } else {
    console.log(`❌ Missing or invalid environment variables: ${missingVars.size}`);
    console.log('Please set these variables in your .env file.');
  }
  
  return { validation, allValid };
}

/**
 * Check if all required environment variables are valid.
 * 
 * @returns {boolean} - True if all variables are valid, False otherwise
 */
function isEnvironmentValid() {
  const { allValid } = validateEnvironment();
  return allValid;
}

// If this file is run directly
if (require.main === module) {
  // Run validation
  const valid = isEnvironmentValid();
  process.exit(valid ? 0 : 1);
}

module.exports = {
  validateEnvironment,
  isEnvironmentValid
};
