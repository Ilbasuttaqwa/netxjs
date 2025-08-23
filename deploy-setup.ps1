# AFMS Deployment Setup Script for DomaiNesia VPS (PowerShell)
# This script sets up the environment files and starts the Docker containers

Write-Host "🚀 AFMS Deployment Setup for DomaiNesia VPS" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "docker-compose.yml")) {
    Write-Host "❌ Error: docker-compose.yml not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Setup Laravel API environment
Write-Host "📝 Setting up Laravel API environment..." -ForegroundColor Yellow
if (Test-Path "laravel-api\.env.example") {
    Copy-Item "laravel-api\.env.example" "laravel-api\.env"
    Write-Host "✅ Laravel .env created from .env.example" -ForegroundColor Green
} else {
    Write-Host "❌ Error: laravel-api\.env.example not found" -ForegroundColor Red
    exit 1
}

# Setup Next.js environment
Write-Host "📝 Setting up Next.js environment..." -ForegroundColor Yellow
if (Test-Path ".env.domainesia") {
    Copy-Item ".env.domainesia" ".env.local"
    Write-Host "✅ Next.js .env.local created from .env.domainesia" -ForegroundColor Green
} elseif (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env.local"
    Write-Host "✅ Next.js .env.local created from .env.example" -ForegroundColor Green
} else {
    Write-Host "❌ Error: No environment template found" -ForegroundColor Red
    exit 1
}

# Generate Laravel APP_KEY
Write-Host "🔑 Generating Laravel APP_KEY..." -ForegroundColor Yellow
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$APP_KEY = [Convert]::ToBase64String($bytes)
(Get-Content "laravel-api\.env") -replace "APP_KEY=.*", "APP_KEY=base64:$APP_KEY" | Set-Content "laravel-api\.env"
Write-Host "✅ Laravel APP_KEY generated" -ForegroundColor Green

# Generate JWT_SECRET
Write-Host "🔑 Generating JWT_SECRET..." -ForegroundColor Yellow
$jwtBytes = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($jwtBytes)
$JWT_SECRET = [Convert]::ToBase64String($jwtBytes)
Add-Content "laravel-api\.env" "JWT_SECRET=$JWT_SECRET"
Write-Host "✅ JWT_SECRET generated" -ForegroundColor Green

# Update database password
Write-Host "🔐 Please enter a secure database password:" -ForegroundColor Cyan
$DB_PASSWORD = Read-Host -AsSecureString
$DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))

# Update Laravel .env
(Get-Content "laravel-api\.env") -replace "DB_PASSWORD=.*", "DB_PASSWORD=$DB_PASSWORD_PLAIN" | Set-Content "laravel-api\.env"
Write-Host "✅ Laravel database password updated" -ForegroundColor Green

# Update Next.js .env.local
(Get-Content ".env.local") -replace "afms_secure_password_2024", "$DB_PASSWORD_PLAIN" | Set-Content ".env.local"
Write-Host "✅ Next.js database password updated" -ForegroundColor Green

# Update docker-compose.yml
Write-Host "🐳 Updating docker-compose.yml..." -ForegroundColor Yellow
(Get-Content "docker-compose.yml") -replace "POSTGRES_PASSWORD=password", "POSTGRES_PASSWORD=$DB_PASSWORD_PLAIN" | Set-Content "docker-compose.yml"
(Get-Content "docker-compose.yml") -replace "DB_PASSWORD=password", "DB_PASSWORD=$DB_PASSWORD_PLAIN" | Set-Content "docker-compose.yml"
(Get-Content "docker-compose.yml") -replace "postgresql://postgres:password", "postgresql://postgres:$DB_PASSWORD_PLAIN" | Set-Content "docker-compose.yml"
Write-Host "✅ Docker compose updated" -ForegroundColor Green

# Build and start containers
Write-Host "🔨 Building and starting Docker containers..." -ForegroundColor Yellow
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

Write-Host "⏳ Waiting for containers to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check container status
Write-Host "📊 Container status:" -ForegroundColor Cyan
docker-compose ps

# Run Laravel migrations
Write-Host "🗄️ Running Laravel migrations..." -ForegroundColor Yellow
docker-compose exec -T laravel-api php artisan migrate --force
docker-compose exec -T laravel-api php artisan config:cache
docker-compose exec -T laravel-api php artisan route:cache

# Run Prisma migrations
Write-Host "🗄️ Running Prisma migrations..." -ForegroundColor Yellow
docker-compose exec -T nextjs npx prisma migrate deploy
docker-compose exec -T nextjs npx prisma generate

Write-Host "✅ Deployment setup complete!" -ForegroundColor Green
Write-Host "🌐 Your application should be available at:" -ForegroundColor Cyan
Write-Host "   - Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   - API: http://localhost:8000" -ForegroundColor White
Write-Host "   - Database: localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Configure your domain DNS to point to this server" -ForegroundColor White
Write-Host "   2. Setup SSL certificates with Let's Encrypt" -ForegroundColor White
Write-Host "   3. Configure Nginx reverse proxy for production" -ForegroundColor White
Write-Host "   4. Update .env files with your actual domain names" -ForegroundColor White
Write-Host ""
Write-Host "📊 To monitor logs: docker-compose logs -f" -ForegroundColor Gray
Write-Host "🔧 To restart: docker-compose restart" -ForegroundColor Gray

Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')