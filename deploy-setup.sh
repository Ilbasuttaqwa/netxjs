#!/bin/bash

# AFMS Deployment Setup Script for DomaiNesia VPS
# This script sets up the environment files and starts the Docker containers

echo "🚀 AFMS Deployment Setup for DomaiNesia VPS"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Setup Laravel API environment
echo "📝 Setting up Laravel API environment..."
if [ -f "laravel-api/.env.example" ]; then
    cp laravel-api/.env.example laravel-api/.env
    echo "✅ Laravel .env created from .env.example"
else
    echo "❌ Error: laravel-api/.env.example not found"
    exit 1
fi

# Setup Next.js environment
echo "📝 Setting up Next.js environment..."
if [ -f ".env.domainesia" ]; then
    cp .env.domainesia .env.local
    echo "✅ Next.js .env.local created from .env.domainesia"
elif [ -f ".env.example" ]; then
    cp .env.example .env.local
    echo "✅ Next.js .env.local created from .env.example"
else
    echo "❌ Error: No environment template found"
    exit 1
fi

# Generate Laravel APP_KEY
echo "🔑 Generating Laravel APP_KEY..."
APP_KEY=$(openssl rand -base64 32)
sed -i "s/APP_KEY=.*/APP_KEY=base64:$APP_KEY/" laravel-api/.env
echo "✅ Laravel APP_KEY generated"

# Generate JWT_SECRET
echo "🔑 Generating JWT_SECRET..."
JWT_SECRET=$(openssl rand -base64 64)
echo "JWT_SECRET=$JWT_SECRET" >> laravel-api/.env
echo "✅ JWT_SECRET generated"

# Update database password in both files
echo "🔐 Please enter a secure database password:"
read -s DB_PASSWORD

# Update Laravel .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" laravel-api/.env
echo "✅ Laravel database password updated"

# Update Next.js .env.local
sed -i "s/afms_secure_password_2024/$DB_PASSWORD/" .env.local
echo "✅ Next.js database password updated"

# Update docker-compose.yml
echo "🐳 Updating docker-compose.yml..."
sed -i "s/POSTGRES_PASSWORD=password/POSTGRES_PASSWORD=$DB_PASSWORD/" docker-compose.yml
sed -i "s/DB_PASSWORD=password/DB_PASSWORD=$DB_PASSWORD/" docker-compose.yml
sed -i "s/postgresql:\/\/postgres:password/postgresql:\/\/postgres:$DB_PASSWORD/" docker-compose.yml
echo "✅ Docker compose updated"

# Build and start containers
echo "🔨 Building and starting Docker containers..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

echo "⏳ Waiting for containers to start..."
sleep 30

# Check container status
echo "📊 Container status:"
docker-compose ps

# Run Laravel migrations
echo "🗄️ Running Laravel migrations..."
docker-compose exec -T laravel-api php artisan migrate --force
docker-compose exec -T laravel-api php artisan config:cache
docker-compose exec -T laravel-api php artisan route:cache

# Run Prisma migrations
echo "🗄️ Running Prisma migrations..."
docker-compose exec -T nextjs npx prisma migrate deploy
docker-compose exec -T nextjs npx prisma generate

echo "✅ Deployment setup complete!"
echo "🌐 Your application should be available at:"
echo "   - Frontend: http://localhost:3000"
echo "   - API: http://localhost:8000"
echo "   - Database: localhost:5432"
echo ""
echo "📋 Next steps:"
echo "   1. Configure your domain DNS to point to this server"
echo "   2. Setup SSL certificates with Let's Encrypt"
echo "   3. Configure Nginx reverse proxy for production"
echo "   4. Update .env files with your actual domain names"
echo ""
echo "📊 To monitor logs: docker-compose logs -f"
echo "🔧 To restart: docker-compose restart"