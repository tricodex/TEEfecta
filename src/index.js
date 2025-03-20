/**
 * 4g3n7 - Secure Trading Agent
 * 
 * Main application entry point
 */

// Import backends
const marlin = require('./backend/marlin');

// Main function to initialize the application
async function initialize() {
  console.log('Initializing 4g3n7...');
  
  // Check if Marlin Oyster CVM CLI is installed
  const cvmInstalled = await marlin.deployment.verifyOysterCli().catch(() => false);
  
  if (!cvmInstalled) {
    console.warn('Marlin Oyster CVM CLI not found. Some features may not be available.');
    console.warn('Install it using the instructions at: https://docs.marlin.org/oyster/');
  } else {
    console.log('Marlin Oyster CVM CLI detected.');
  }
  
  // Initialize other components
  console.log('4g3n7 initialized successfully!');
}

// Start the application
initialize().catch(error => {
  console.error('Failed to initialize 4g3n7:', error);
  process.exit(1);
});

// Export components
module.exports = {
  marlin
};
