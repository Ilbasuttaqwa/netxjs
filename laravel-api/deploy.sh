#!/bin/bash

# Laravel API Deployment Script
# This script handles the deployment of Laravel API to production

set -e

echo "🚀 Starting Laravel API Deployment..."

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "❌ Error: .env.production file not found!"
    echo "Please create .env.production with your production settings."
    exit 1
fi

# Copy production environment
echo "📋 Setting up production environment..."
cp .env.production .env

# Install dependencies
echo "📦 Installing Composer dependencies..."
composer install --no-dev --optimize-autoloader

# Generate application key if not set
echo "🔑 Generating application key..."
php artisan key:generate --force

# Clear and cache configurations
echo "🧹 Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Cache configurations for production
echo "⚡ Caching configurations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run database migrations
echo "🗄️ Running database migrations..."
php artisan migrate --force

# Seed database with initial data
echo "🌱 Seeding database..."
php artisan db:seed --force

# Set proper permissions
echo "🔒 Setting file permissions..."
chmod -R 755 storage
chmod -R 755 bootstrap/cache

# Create symbolic link for storage
echo "🔗 Creating storage link..."
php artisan storage:link

# Optimize for production
echo "⚡ Optimizing for production..."
php artisan optimize

echo "✅ Laravel API deployment completed successfully!"
echo "📊 Application is ready at: $(php artisan route:list --name=api.health --columns=uri | tail -n 1)"
echo "🔍 Check health endpoint: /api/health"

# Display important post-deployment notes
echo ""
echo "📝 Post-deployment checklist:"
echo "1. ✅ Verify database connection"
echo "2. ✅ Test API endpoints"
echo "3. ✅ Check fingerprint device connectivity"
echo "4. ✅ Verify NextJS integration"
echo "5. ✅ Monitor application logs"
echo ""
echo "🎉 Deployment completed!"