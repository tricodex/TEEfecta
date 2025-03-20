/**
 * Marlin Oyster CVM Templates
 * 
 * Provides templates for creating CVM applications.
 */

const fs = require('fs');
const path = require('path');
const { copyDirectory } = require('../utils');

/**
 * Get the path to the agent application template
 * @returns {string} Path to the agent application template
 */
function getAgentAppTemplatePath() {
  return path.join(__dirname, 'agent-app');
}

/**
 * Generate an agent application from template
 * @param {string} outputDir Directory to write the application
 * @param {Object} options Options for customizing the application
 * @returns {Promise<string>} Path to the generated application
 */
async function generateAgentApp(outputDir, options = {}) {
  if (!outputDir) {
    throw new Error('Output directory is required');
  }
  
  const templatePath = getAgentAppTemplatePath();
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Copy template files to output directory
  await copyDirectory(templatePath, outputDir);
  
  // Customize the application based on options if needed
  if (options.port) {
    const serverPath = path.join(outputDir, 'server.js');
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    serverContent = serverContent.replace(
      'const PORT = process.env.PORT || 3000;',
      `const PORT = process.env.PORT || ${options.port};`
    );
    fs.writeFileSync(serverPath, serverContent);
  }
  
  if (options.packageName) {
    const packagePath = path.join(outputDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.name = options.packageName;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  }
  
  return outputDir;
}

module.exports = {
  getAgentAppTemplatePath,
  generateAgentApp
};
