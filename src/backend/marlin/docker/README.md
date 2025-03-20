# 4g3n7 Marlin CVM Docker Image

This directory contains the configuration files needed to build a Docker image for deploying 4g3n7 applications to Marlin Oyster CVMs.

## Files

- `Dockerfile`: Defines the container image with all necessary components
- `setup.sh`: Initialization script that runs when the container starts
- `supervisord.conf`: Configuration for process management inside the container
- `docker-compose.yml`: Defines the services for local testing and deployment
- `app/`: Contains the 4g3n7 agent application code

## Building the Image

To build the Docker image:

```bash
docker build -t 4g3n7-marlin-cvm:latest --build-arg TARGETARCH=arm64 .
```

Replace `arm64` with `amd64` if targeting that architecture.

## Local Testing

For local testing before deploying to a Marlin Oyster CVM:

```bash
docker-compose up
```

## Deployment to Marlin Oyster

Deploy to Marlin Oyster using the oyster-cvm CLI:

```bash
oyster-cvm deploy --wallet-private-key <key> --duration-in-minutes 60 --docker-compose docker-compose.yml
```

## Security Features

- All sensitive operations occur within the Trusted Execution Environment (TEE)
- Communication is secured through authenticated tunnels
- Attestation verification ensures code integrity
- Hardware-based encryption protects data confidentiality