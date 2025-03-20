FROM node:18-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY ./app/package.json .
RUN npm install

# Copy application files
COPY ./app .

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]