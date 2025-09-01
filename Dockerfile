# Multi-stage build for production optimization
FROM node:18-alpine AS deps

# Security: Update package index and install minimal dependencies
RUN apk update && apk upgrade && apk add --no-cache libc6-compat curl openssl openssl-dev && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies with security audit
RUN if [ -f package-lock.json ]; then npm ci --only=production --audit; else npm install --only=production --audit; fi && \
    npm cache clean --force

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Copy source code
COPY . .

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client and build the application
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

# Install minimal runtime dependencies
RUN apk update && apk upgrade && apk add --no-cache curl openssl && \
    rm -rf /var/cache/apk/* && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Security: Disable unnecessary features
ENV NEXT_SHARP=0
ENV NEXT_PRIVATE_STANDALONE=true

# Copy built application from builder stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set proper permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check with security timeout
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Set secure environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Security: Run as non-root user
USER nextjs

# Start the application
CMD ["node", "server.js"]