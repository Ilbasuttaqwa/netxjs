#!/bin/bash

# AFMS SSL Deployment Script
# This script handles SSL certificate generation and deployment

set -e

echo "🚀 Starting AFMS SSL Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Stop existing containers
print_status "Stopping existing containers..."
docker-compose -f docker-compose.production.yml down || true

# Create SSL directories
print_status "Creating SSL directories..."
mkdir -p ssl/certs ssl/www ssl/private
chmod 755 ssl/www

# Start nginx for ACME challenge
print_status "Starting nginx for ACME challenge..."
docker-compose -f docker-compose.production.yml up -d nginx

# Wait for nginx to be ready
print_status "Waiting for nginx to be ready..."
sleep 10

# Generate SSL certificate using certbot
print_status "Generating SSL certificate..."
docker run --rm \
    -v "$(pwd)/ssl/certs:/etc/letsencrypt" \
    -v "$(pwd)/ssl/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@cvtigaputraperkasa.id \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d cvtigaputraperkasa.id \
    -d api.cvtigaputraperkasa.id

if [ $? -eq 0 ]; then
    print_success "SSL certificate generated successfully!"
else
    print_error "Failed to generate SSL certificate"
    print_warning "Continuing with HTTP-only deployment..."
fi

# Copy certificates to nginx ssl directory
if [ -f "ssl/certs/live/cvtigaputraperkasa.id/fullchain.pem" ]; then
    print_status "Copying SSL certificates..."
    cp ssl/certs/live/cvtigaputraperkasa.id/fullchain.pem ssl/certs/cvtigaputraperkasa.id.crt
    cp ssl/certs/live/cvtigaputraperkasa.id/privkey.pem ssl/certs/cvtigaputraperkasa.id.key
    chmod 644 ssl/certs/cvtigaputraperkasa.id.crt
    chmod 600 ssl/certs/cvtigaputraperkasa.id.key
    print_success "SSL certificates copied successfully!"
else
    print_warning "SSL certificates not found, creating self-signed certificates for testing..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/certs/cvtigaputraperkasa.id.key \
        -out ssl/certs/cvtigaputraperkasa.id.crt \
        -subj "/C=ID/ST=Jakarta/L=Jakarta/O=CV Tiga Putra Perkasa/CN=cvtigaputraperkasa.id"
    chmod 644 ssl/certs/cvtigaputraperkasa.id.crt
    chmod 600 ssl/certs/cvtigaputraperkasa.id.key
fi

# Stop nginx
print_status "Stopping nginx..."
docker-compose -f docker-compose.production.yml stop nginx

# Start all services
print_status "Starting all services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check PostgreSQL
if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U afms_user -d afms_database > /dev/null 2>&1; then
    print_success "PostgreSQL is ready"
else
    print_warning "PostgreSQL is not ready yet"
fi

# Check Laravel API
if docker-compose -f docker-compose.production.yml exec -T laravel-api php artisan --version > /dev/null 2>&1; then
    print_success "Laravel API is ready"
    
    # Run database migrations
    print_status "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec -T laravel-api php artisan migrate --force
    
    # Seed database (optional)
    read -p "Do you want to seed the database? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Seeding database..."
        docker-compose -f docker-compose.production.yml exec -T laravel-api php artisan db:seed --force
    fi
else
    print_warning "Laravel API is not ready yet"
fi

# Check Next.js
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_success "Next.js is ready"
else
    print_warning "Next.js is not ready yet"
fi

# Check nginx
if curl -f http://localhost > /dev/null 2>&1; then
    print_success "Nginx is ready"
else
    print_warning "Nginx is not ready yet"
fi

# Display deployment status
print_status "Deployment Status:"
docker-compose -f docker-compose.production.yml ps

echo
print_success "🎉 AFMS Deployment completed!"
echo
print_status "Access URLs:"
echo "  • Main Application: https://cvtigaputraperkasa.id"
echo "  • API Endpoint: https://api.cvtigaputraperkasa.id"
echo "  • HTTP (redirects to HTTPS): http://cvtigaputraperkasa.id"
echo
print_status "Useful commands:"
echo "  • View logs: docker-compose -f docker-compose.production.yml logs -f"
echo "  • Restart services: docker-compose -f docker-compose.production.yml restart"
echo "  • Stop services: docker-compose -f docker-compose.production.yml down"
echo "  • Update application: git pull && docker-compose -f docker-compose.production.yml up -d --build"
echo
print_status "SSL Certificate renewal (run monthly):"
echo "  • docker run --rm -v \$(pwd)/ssl/certs:/etc/letsencrypt -v \$(pwd)/ssl/www:/var/www/certbot certbot/certbot renew"
echo

if [ -f "ssl/certs/cvtigaputraperkasa.id.crt" ]; then
    print_success "SSL is configured and ready!"
else
    print_warning "SSL configuration needs attention"
fi