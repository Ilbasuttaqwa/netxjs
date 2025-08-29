# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dependencies including OpenSSL for Prisma
RUN apk add --no-cache libc6-compat curl openssl openssl-dev

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with clean cache
RUN npm ci --only=production && npm cache clean --force

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Copy source code
COPY . .

# Generate Prisma client and build the application
RUN npx prisma generate
RUN npm run build

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy HTTPS server configuration
COPY server-https.js ./server-https.js

# Create SSL directory
RUN mkdir -p /app/ssl

# Set proper permissions
RUN chown -R nextjs:nodejs /app/ssl

# Set proper permissions
>>>>>>> Stashed changes
RUN chown -R nextjs:nodejs /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -k -f https://localhost:3443/api/health || exit 1

USER nextjs

# Expose ports
EXPOSE 3000
EXPOSE 3443

ENV PORT=3000
ENV HTTPS_PORT=3443
ENV HOSTNAME="0.0.0.0"

# Start the application with HTTPS server
CMD ["node", "server-https.js"]
