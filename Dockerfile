FROM node:20-alpine

WORKDIR /app

# Install ping utility for ICMP monitoring
RUN apk add --no-cache iputils

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Create writable directories
RUN mkdir -p ./src/public/uploads ./src/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/public/data >/dev/null || exit 1

# Start the application
CMD ["node", "src/server/index.js"]
