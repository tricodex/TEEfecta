#!/bin/bash

# Script to build and run the 4g3n7 agent in local development mode

set -e

echo "Building 4g3n7 local development environment..."
docker-compose build

echo "Starting 4g3n7 agent in local development mode..."
docker-compose up -d

echo "4g3n7 agent is now running at http://localhost:3000"
echo ""
echo "Test endpoints:"
echo "  - Health check: curl http://localhost:3000/health"
echo "  - Create trade: curl -X POST http://localhost:3000/api/trades -H \"Content-Type: application/json\" -d '{\"asset\":\"ETH\", \"amount\":\"0.1\", \"action\":\"buy\", \"user\":\"alice\"}'"
echo "  - Get trades: curl http://localhost:3000/api/trades?user=alice"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
