# Use the official Node.js 22 LTS image
FROM node:22-alpine

# Install system dependencies for healthcheck and Prisma
# Update package index and install with retry logic
RUN apk update && \
    apk add --no-cache \
    curl \
    openssl-dev \
    libc6-compat \
    ca-certificates || \
    (sleep 5 && apk update && apk add --no-cache curl openssl-dev libc6-compat ca-certificates)

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for Prisma)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma migrate deploy
RUN npx prisma generate

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
# Prisma migrate deploy runs as part of startup
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
