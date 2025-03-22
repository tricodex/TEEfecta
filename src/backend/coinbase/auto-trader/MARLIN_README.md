# Auto Trader Marlin CVM Deployment

This directory contains tools and documentation for deploying the Auto Trader application on Marlin CVM (Confidential Virtual Machine) for enhanced security and privacy.

## What is Marlin CVM?

Marlin CVM (Confidential Virtual Machine) is a trusted execution environment that allows running applications in a secure enclave. This provides:

- **Data Privacy**: Your trading strategies and portfolio data remain confidential
- **Code Integrity**: Verifiable execution guarantees your code runs as intended
- **Secure Computation**: Sensitive operations like key management are protected
- **Attestation**: Cryptographic proof of the running application's integrity

## Deployment Files

This directory contains the following files related to Marlin CVM deployment:

- `MARLIN_DEPLOYMENT.md`: Comprehensive guide for deploying on Marlin CVM
- `deploy-marlin.sh`: Automation script for building and deploying the application
- `verify-attestation.sh`: Script for verifying attestation of deployed instances
- `marlin.env.template`: Template for environment variables required by the application
- `ARCHITECTURE.db`: Detailed architecture documentation

## Quick Start

1. **Prepare Environment**

   ```bash
   # Copy environment template
   cp marlin.env.template .env
   
   # Edit .env with your API keys and configuration
   nano .env
   ```

2. **Deploy Application**

   ```bash
   # Run deployment script
   ./deploy-marlin.sh
   ```

3. **Verify Attestation**

   ```bash
   # Verify deployed instance
   ./verify-attestation.sh --instance-id YOUR_INSTANCE_ID
   ```

## Security Considerations

When deploying on Marlin CVM:

1. **API Keys**: Store securely within the TEE environment
2. **Environment Variables**: Never expose sensitive data in logs or API responses
3. **Attestation**: Regularly verify attestation to ensure enclave integrity
4. **Key Management**: Generate keys within the secure enclave

## Resources

- [Marlin Protocol Documentation](https://docs.marlin.org/)
- [Confidential Computing Consortium](https://confidentialcomputing.io/)
- [TEE Best Practices](https://github.com/Trusted-Execution-Environment/docs)

## Support

For issues with the Auto Trader application deployment, please file an issue in the repository.

For Marlin CVM specific issues, contact Marlin Protocol support at support@marlin.org. 