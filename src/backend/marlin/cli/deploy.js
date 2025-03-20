#!/usr/bin/env node

/**
 * 4g3n7 Marlin CVM Deploy CLI Tool
 * 
 * A command-line utility for deploying applications to Marlin Oyster CVMs.
 */

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const deployment = require('../deployment');
const config = require('../config');
const templates = require('../templates');
const utils = require('../utils');

program
  .name('4g3n7-marlin-deploy')
  .description('Deploy 4g3n7 applications to Marlin Oyster CVMs')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new 4g3n7 agent application')
  .option('-o, --output <path>', 'Output directory', './agent-app')
  .option('-p, --port <number>', 'Port number', '3000')
  .option('-n, --name <name>', 'Package name', '4g3n7-cvm-app')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Initializing 4g3n7 agent application...'));
      
      const outputDir = path.resolve(options.output);
      const appPath = await templates.generateAgentApp(outputDir, {
        port: options.port,
        packageName: options.name
      });
      
      console.log(chalk.green(`Successfully created agent application at ${appPath}`));
      console.log(chalk.yellow('Next steps:'));
      console.log('  1. Customize the application in', chalk.cyan(appPath));
      console.log('  2. Run', chalk.cyan(`4g3n7-marlin-deploy prepare ${appPath}`), 'to prepare for deployment');
      console.log('  3. Run', chalk.cyan(`4g3n7-marlin-deploy deploy ${appPath}`), 'to deploy to Marlin Oyster');
    } catch (error) {
      console.error(chalk.red('Error initializing application:'), error.message);
      process.exit(1);
    }
  });

program
  .command('prepare')
  .description('Prepare an application for deployment to Marlin Oyster CVM')
  .argument('<app-path>', 'Path to the application')
  .option('-o, --output <path>', 'Output directory for deployment files')
  .option('-a, --arch <architecture>', 'Target architecture (amd64, arm64)', 'arm64')
  .action(async (appPath, options) => {
    try {
      console.log(chalk.blue('Preparing application for deployment...'));
      
      const resolvedAppPath = path.resolve(appPath);
      
      if (!fs.existsSync(resolvedAppPath)) {
        throw new Error(`Application path ${resolvedAppPath} does not exist`);
      }
      
      // Create output directory if specified, otherwise use app path + '/deploy'
      const outputDir = options.output 
        ? path.resolve(options.output) 
        : path.join(resolvedAppPath, 'deploy');
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Generate config files
      console.log(chalk.yellow('Generating configuration files...'));
      const configFiles = await config.generateConfigFiles({}, outputDir);
      
      // Create app directory in output
      const appOutputDir = path.join(outputDir, 'app');
      if (!fs.existsSync(appOutputDir)) {
        fs.mkdirSync(appOutputDir, { recursive: true });
      }
      
      // Copy application files
      console.log(chalk.yellow('Copying application files...'));
      await utils.copyDirectory(resolvedAppPath, appOutputDir);
      
      // Generate docker-compose.yml
      console.log(chalk.yellow('Generating docker-compose.yml...'));
      const dockerComposePath = path.join(outputDir, 'docker-compose.yml');
      await deployment.generateDockerCompose({
        services: {
          agent: {
            image: 'marlinorg/enclave-builder',
            network_mode: 'host',
            restart: 'unless-stopped',
            init: true
          }
        }
      }, dockerComposePath);
      
      console.log(chalk.green('Successfully prepared application for deployment'));
      console.log(chalk.yellow('Next steps:'));
      console.log('  1. Review the generated files in', chalk.cyan(outputDir));
      console.log('  2. Run', chalk.cyan(`4g3n7-marlin-deploy deploy ${outputDir}`), 'to deploy to Marlin Oyster');
    } catch (error) {
      console.error(chalk.red('Error preparing application:'), error.message);
      process.exit(1);
    }
  });

program
  .command('deploy')
  .description('Deploy an application to Marlin Oyster CVM')
  .argument('<deploy-path>', 'Path to the deployment directory')
  .option('-k, --key <private-key>', 'Wallet private key')
  .option('-d, --duration <minutes>', 'Deployment duration in minutes', '60')
  .option('-a, --arch <architecture>', 'Target architecture (amd64, arm64)', 'arm64')
  .action(async (deployPath, options) => {
    try {
      console.log(chalk.blue('Deploying application to Marlin Oyster CVM...'));
      
      const resolvedDeployPath = path.resolve(deployPath);
      
      if (!fs.existsSync(resolvedDeployPath)) {
        throw new Error(`Deployment path ${resolvedDeployPath} does not exist`);
      }
      
      const dockerComposePath = path.join(resolvedDeployPath, 'docker-compose.yml');
      
      if (!fs.existsSync(dockerComposePath)) {
        throw new Error(`docker-compose.yml not found at ${dockerComposePath}`);
      }
      
      if (!options.key) {
        console.log(chalk.yellow('No wallet private key provided. Using a random key for testing.'));
        console.log(chalk.red('Warning: This will not work in production!'));
        options.key = utils.generateRandomPrivateKey();
      }
      
      // Verify Oyster CLI is installed
      console.log(chalk.yellow('Verifying Oyster CLI installation...'));
      const cliInstalled = await deployment.verifyOysterCli();
      
      if (!cliInstalled) {
        console.log(chalk.yellow('Oyster CLI not found. Installing...'));
        await deployment.installOysterCli();
      }
      
      // Deploy CVM
      console.log(chalk.yellow('Deploying CVM...'));
      const deploymentResult = await deployment.deployCvm({
        walletPrivateKey: options.key,
        durationInMinutes: parseInt(options.duration, 10),
        dockerComposePath,
        arch: options.arch
      });
      
      if (deploymentResult.success) {
        console.log(chalk.green('Successfully deployed application to Marlin Oyster CVM'));
        console.log(chalk.yellow('Deployment details:'));
        console.log('  Enclave IP:', chalk.cyan(deploymentResult.ip));
        console.log('  Digest:', chalk.cyan(deploymentResult.digest));
        console.log('  Duration:', chalk.cyan(`${options.duration} minutes`));
        
        // Save deployment details to a file
        const deploymentDetailsPath = path.join(resolvedDeployPath, 'deployment-details.json');
        fs.writeFileSync(deploymentDetailsPath, JSON.stringify(deploymentResult, null, 2));
        console.log(chalk.yellow(`Deployment details saved to ${deploymentDetailsPath}`));
        
        console.log(chalk.yellow('Next steps:'));
        console.log('  1. Verify the deployment using:');
        console.log('     ', chalk.cyan(`oyster-cvm verify --enclave-ip ${deploymentResult.ip} --user-data ${deploymentResult.digest} --pcr-preset base/blue/v1.0.0/${options.arch}`));
        console.log('  2. Access the API at:');
        console.log('     ', chalk.cyan(`http://${deploymentResult.ip}:3000`));
      } else {
        console.error(chalk.red('Deployment failed:'), deploymentResult.error);
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error deploying application:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);
