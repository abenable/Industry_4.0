# Use the official Node.js 22 LTS image
FROM node:22-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 5000

# Health check (fixed port to match EXPOSE)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
