#!/bin/bash

# =============================================================================
# AFMS Configuration Validation Script
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_status "Starting AFMS configuration validation..."

# Check if required files exist
print_status "Checking required files..."

required_files=(
    "docker-compose.yml"
    "nginx/nginx.conf"
    "frontend/Dockerfile"
    "backend/Dockerfile"
    "backend/.env.example"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        print_success "Found: $file"
    else
        print_error "Missing: $file"
    fi
done

# Check Docker Compose syntax
print_status "Validating Docker Compose configuration..."
if docker-compose config > /dev/null 2>&1; then
    print_success "Docker Compose configuration is valid"
else
    print_error "Docker Compose configuration has errors"
fi

# Check environment variables in docker-compose.yml
print_status "Checking environment variables..."
if grep -q "http://" docker-compose.yml; then
    print_success "HTTP URLs configured correctly"
else
    print_warning "Check URL configurations"
fi

# Check Nginx configuration syntax (basic)
print_status "Basic Nginx configuration check..."
if grep -q "server_name" nginx/nginx.conf && grep -q "location" nginx/nginx.conf; then
    print_success "Nginx configuration structure looks good"
else
    print_error "Nginx configuration may have issues"
fi

# Check for CORS configuration
print_status "Checking CORS configuration..."
if grep -q "Access-Control-Allow-Origin" nginx/nginx.conf; then
    print_success "CORS headers configured"
else
    print_warning "CORS headers not found"
fi

# Check backend environment example
print_status "Checking backend environment configuration..."
if grep -q "CORS_ALLOWED_ORIGINS" backend/.env.example; then
    print_success "CORS configuration found in .env.example"
else
    print_warning "CORS configuration missing in .env.example"
fi

print_status "Configuration validation completed!"
print_status "Review any warnings or errors above before deployment."