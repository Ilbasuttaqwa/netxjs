#!/bin/bash

# Docker Rebuild Script for AFMS
# This script rebuilds the Docker containers with proper CSS and static file handling

echo "🔄 Rebuilding AFMS Docker containers..."

# Stop existing containers
echo "⏹️  Stopping existing containers..."
docker-compose down

# Remove existing images to force rebuild
echo "🗑️  Removing existing images..."
docker-compose down --rmi all --volumes --remove-orphans

# Clear Docker build cache
echo "🧹 Clearing Docker build cache..."
docker builder prune -f

# Rebuild containers
echo "🔨 Building new containers..."
docker-compose build --no-cache

# Start containers
echo "🚀 Starting containers..."
docker-compose up -d

# Wait for containers to be ready
echo "⏳ Waiting for containers to be ready..."
sleep 30

# Check container status
echo "📊 Container status:"
docker-compose ps

# Check logs for any errors
echo "📋 Recent logs:"
docker-compose logs --tail=20

# Test the application
echo "🧪 Testing application..."
echo "Health check: $(curl -s http://localhost:3000/api/health || echo 'Failed')"

echo "✅ Rebuild complete!"
echo "🌐 Application should be available at: http://localhost:3000"
echo "📊 To view logs: docker-compose logs -f"
echo "🔍 To debug: docker-compose exec app sh"