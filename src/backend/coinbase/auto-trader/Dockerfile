FROM oven/bun:1.0.22

WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install

# Copy application code
COPY . .

# Create data directory for wallet storage
RUN mkdir -p data/wallets

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3222
ENV ENABLE_AGENTKIT=true
ENV ENABLE_COLLABORATION=true
ENV USE_MOCK_WALLET=false
ENV USE_MOCK_SEARCH=false
ENV PREFERRED_LLM_PROVIDER=gemini
ENV CDP_NETWORK_ID=base-sepolia
# Configure Recall to use in-memory storage if no env.export exists
ENV RECALL_MEMORY_MODE=in-memory
# Configure CORS to allow connections from any origin (you should restrict this in production)
ENV CORS_ALLOW_ORIGIN=*

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nodejsuser

# Set proper permissions
RUN chown -R nodejsuser:nodejs /app
USER nodejsuser

# Expose port
EXPOSE 3222

# Set startup command
CMD ["bun", "run", "src/index.ts"] 