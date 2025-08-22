# Docker Rebuild Script for AFMS (PowerShell)
# This script rebuilds the Docker containers with proper CSS and static file handling

Write-Host "🔄 Rebuilding AFMS Docker containers..." -ForegroundColor Cyan

# Stop existing containers
Write-Host "⏹️  Stopping existing containers..." -ForegroundColor Yellow
docker-compose down

# Remove existing images to force rebuild
Write-Host "🗑️  Removing existing images..." -ForegroundColor Yellow
docker-compose down --rmi all --volumes --remove-orphans

# Clear Docker build cache
Write-Host "🧹 Clearing Docker build cache..." -ForegroundColor Yellow
docker builder prune -f

# Rebuild containers
Write-Host "🔨 Building new containers..." -ForegroundColor Yellow
docker-compose build --no-cache

# Start containers
Write-Host "🚀 Starting containers..." -ForegroundColor Green
docker-compose up -d

# Wait for containers to be ready
Write-Host "⏳ Waiting for containers to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check container status
Write-Host "📊 Container status:" -ForegroundColor Cyan
docker-compose ps

# Check logs for any errors
Write-Host "📋 Recent logs:" -ForegroundColor Cyan
docker-compose logs --tail=20

# Test the application
Write-Host "🧪 Testing application..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10
    Write-Host "Health check: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Health check: Failed - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "✅ Rebuild complete!" -ForegroundColor Green
Write-Host "🌐 Application should be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📊 To view logs: docker-compose logs -f" -ForegroundColor Gray
Write-Host "🔍 To debug: docker-compose exec app sh" -ForegroundColor Gray

# Pause to keep window open
Write-Host 'Press any key to continue...' -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')