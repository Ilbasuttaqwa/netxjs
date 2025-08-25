#!/bin/bash

# =============================================================================
# AFMS Simple Deployment Script
# Script untuk restart aplikasi setelah update
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
PROJECT_DIR="/var/www/afms"

print_status "Starting AFMS deployment..."

# Navigate to project directory
cd $PROJECT_DIR

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose down || true

# Remove old images to force rebuild
print_status "Cleaning up old images..."
docker system prune -f

# Build and start containers
print_status "Building and starting containers..."
docker-compose up -d --build

# Wait for containers to be healthy
print_status "Waiting for containers to be healthy..."
sleep 30

# Check container status
print_status "Checking container status..."
docker-compose ps

# Test application endpoints
print_status "Testing application endpoints..."

# Test frontend
if curl -f http://localhost:80 > /dev/null 2>&1; then
    print_success "Frontend is responding"
else
    print_error "Frontend is not responding"
fi

# Test API
if curl -f http://localhost:80/health > /dev/null 2>&1; then
    print_success "API is responding"
else
    print_error "API is not responding"
fi

print_success "Deployment completed!"
print_status "Application is running at:"
print_status "Frontend: http://202.155.95.3"
print_status "API: http://202.155.95.3/api"

print_status "To check logs, run: docker-compose logs -f"
print_status "To check status, run: docker-compose ps"