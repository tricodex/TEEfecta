#!/bin/bash
echo "=== 4g3n7 Attestation Custom Deployment ==="
docker-compose build
oyster-cvm build
oyster-cvm deploy
echo "Deployment process completed"
