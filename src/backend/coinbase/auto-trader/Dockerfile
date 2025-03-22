FROM oven/bun:1.0.22

WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

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