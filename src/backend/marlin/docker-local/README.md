# 4g3n7 Local Development Environment

This directory contains a simplified version of the 4g3n7 agent for local development and testing without TEE components.

## Purpose

The simplified setup allows developers to:

1. Test and develop the core functionality without requiring a Marlin Oyster CVM
2. Run integration tests locally
3. Debug application logic without the complexity of TEE components

## How This Differs From Production

This local development environment:

- Does not include TEE-specific components (VSOCK, attestation, etc.)
- Uses mock data for enclave identities
- Exposes additional debugging endpoints
- Runs in a standard Docker container, not a secure enclave

## Running Locally

Build and run the container:

```bash
# Build the container
docker-compose build

# Run the container
docker-compose up
```

## Testing The API

Once running, you can test the API with curl:

```bash
# Health check
curl http://localhost:3000/health

# Create a trade
curl -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d '{"asset":"ETH", "amount":"0.1", "action":"buy", "user":"alice"}'

# Get trades for a user
curl http://localhost:3000/api/trades?user=alice
```

## Security Note

This local environment is for development purposes only and lacks the security guarantees provided by the Marlin Oyster Confidential VM. Do not use this for production or with sensitive data.