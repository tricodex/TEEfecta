# Auto Trader Marlin CVM Deployment Guide

This guide details the steps required to deploy the Auto Trader application on Marlin CVM (Confidential Virtual Machine) for secure, private operations.

## Prerequisites

Before proceeding with the deployment, ensure you have:

- Marlin CLI tools installed (`oyster-eif` and `oyster-cvm`)
- A wallet with ETH/USDC for deployment costs
- Docker installed for building the image
- Git repository cloned locally

## Step 1: Build the Docker Image

```bash
# Navigate to the auto-trader directory
cd /path/to/TEEfecta/mono/src/backend/coinbase/auto-trader

# Build the Docker image
docker build -t auto-trader:latest .
```

## Step 2: Create the EIF (Encrypted Image Format)

```bash
# Export the Docker image to a tarball
docker save auto-trader:latest > auto-trader.tar

# Generate the EIF file using oyster-eif
oyster-eif build -i auto-trader.tar -o auto-trader.eif --memory-size 4096 --cpu-count 2
```

## Step 3: Upload the EIF to a Storage Service

```bash
# Upload to Pinata (IPFS)
oyster-eif upload auto-trader.eif --pinata-jwt YOUR_PINATA_JWT

# This will output a CID that will be used in the next step
# Example output: CID: QmXyZ123AbC...
```

## Step 4: Deploy the EIF to Marlin CVM

```bash
# Deploy using oyster-cvm
oyster-cvm deploy --eif-cid QmXyZ123AbC... --wallet-private-key YOUR_PRIVATE_KEY
```

This command will:
1. Create a CVM instance on Marlin
2. Deploy your EIF to the instance
3. Provide you with an IP address and other connection details

## Step 5: Configure Environment Variables

Create a `.env` file for your Marlin deployment:

```
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
MOCK_TRADE=true  # Set to false for real trading
AUTONOMOUS_TRADING=false
RECALL_NETWORK_API_KEY=your_recall_api_key
WEB_SEARCH_API_KEY=your_web_search_api_key
```

Use Marlin's secure environment variable injection:

```bash
oyster-cvm config set-env --instance-id YOUR_INSTANCE_ID --env-file .env
```

## Step 6: Verify Attestation

Marlin CVM provides attestation to verify the integrity of your enclave:

```bash
# Get attestation for your instance
oyster-cvm attestation get --instance-id YOUR_INSTANCE_ID

# Verify PCR values
oyster-cvm attestation verify --instance-id YOUR_INSTANCE_ID
```

## Step 7: Access Your Deployed Application

Once deployed, you can access your Auto Trader API at:

```
https://YOUR_INSTANCE_IP:3000/api/agent/status
```

Use the following command to test the connection:

```bash
curl -k https://YOUR_INSTANCE_IP:3000/api/agent/status
```

## Step 8: Setup Secure Key Management

For secure key management within the CVM:

```bash
# Generate keys within the secure enclave
oyster-cvm exec --instance-id YOUR_INSTANCE_ID --command "node /app/scripts/generate-keys.js"

# Verify keys were created
oyster-cvm exec --instance-id YOUR_INSTANCE_ID --command "ls -la /app/data/keys"
```

## Step 9: Monitoring and Logs

Monitor your application using Marlin's logging tools:

```bash
# View logs
oyster-cvm logs --instance-id YOUR_INSTANCE_ID

# Stream logs in real-time
oyster-cvm logs --instance-id YOUR_INSTANCE_ID --follow
```

## Step 10: Scaling and Management

For production deployments, consider:

```bash
# Scale your deployment
oyster-cvm scale --instance-id YOUR_INSTANCE_ID --replicas 3

# Setup load balancing (if available)
oyster-cvm loadbalancer create --instance-ids YOUR_INSTANCE_ID_1,YOUR_INSTANCE_ID_2
```

## Security Considerations

When deploying on Marlin CVM:

1. **PCR Validation**: Always verify PCR values after deployment to ensure integrity
2. **Secure Key Management**: Never expose private keys outside the enclave
3. **Network Security**: Use the built-in encrypted communication channels
4. **Authentication**: Implement proper authentication for your API endpoints
5. **Audit Logs**: Regularly review audit logs for any suspicious activities

## Troubleshooting

### Common Issues and Solutions

1. **Deployment Failure**
   ```bash
   # Verify EIF file integrity
   oyster-eif validate auto-trader.eif
   
   # Check deployment logs
   oyster-cvm logs --instance-id YOUR_INSTANCE_ID --deployment
   ```

2. **Connection Issues**
   ```bash
   # Verify network configuration
   oyster-cvm network status --instance-id YOUR_INSTANCE_ID
   
   # Test connection
   curl -v -k https://YOUR_INSTANCE_IP:3000/health
   ```

3. **Authentication Failed**
   ```bash
   # Check environment variables
   oyster-cvm config get-env --instance-id YOUR_INSTANCE_ID
   
   # Restart instance if needed
   oyster-cvm restart --instance-id YOUR_INSTANCE_ID
   ```

## Cost Estimation

Deploying on Marlin CVM incurs costs based on:

- **Compute Resources**: $0.XX per hour per CPU/GB RAM
- **Storage**: $0.XX per GB per month
- **Network Egress**: $0.XX per GB
- **Transaction Fees**: ETH gas fees for deployment

Estimate for a standard deployment (2 CPU, 4GB RAM):
- **Monthly Cost**: ~$XX-$XXX depending on usage

## Conclusion

Your Auto Trader application is now securely deployed on Marlin CVM. The application operates in a confidential computing environment, protecting sensitive data and trade strategies from unauthorized access. Regular monitoring and updates are recommended to maintain security and performance.

For additional assistance, contact Marlin Protocol support or refer to their documentation at [docs.marlin.org](https://docs.marlin.org/).
