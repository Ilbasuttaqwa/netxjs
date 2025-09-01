# AFMS SSL Deployment Script for Windows
# This script handles SSL certificate generation and deployment

param(
    [switch]$SkipSSL,
    [switch]$Force
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

Write-Host "🚀 Starting AFMS SSL Deployment..." -ForegroundColor $Blue

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop."
    exit 1
}

# Check if Docker Compose is available
try {
    docker-compose version | Out-Null
    Write-Success "Docker Compose is available"
} catch {
    Write-Error "Docker Compose is not available. Please install Docker Compose."
    exit 1
}

# Stop existing containers
Write-Status "Stopping existing containers..."
try {
    docker-compose -f docker-compose.production.yml down
} catch {
    Write-Warning "No existing containers to stop"
}

# Create SSL directories
Write-Status "Creating SSL directories..."
New-Item -ItemType Directory -Path "ssl\certs", "ssl\www", "ssl\private" -Force | Out-Null

# Start nginx for ACME challenge (if not skipping SSL)
if (-not $SkipSSL) {
    Write-Status "Starting nginx for ACME challenge..."
    docker-compose -f docker-compose.production.yml up -d nginx
    
    # Wait for nginx to be ready
    Write-Status "Waiting for nginx to be ready..."
    Start-Sleep -Seconds 10
    
    # Generate SSL certificate using certbot
    Write-Status "Generating SSL certificate..."
    $certbotCmd = @(
        "docker", "run", "--rm",
        "-v", "${PWD}\ssl\certs:/etc/letsencrypt",
        "-v", "${PWD}\ssl\www:/var/www/certbot",
        "certbot/certbot", "certonly",
        "--webroot",
        "--webroot-path=/var/www/certbot",
        "--email", "admin@cvtigaputraperkasa.id",
        "--agree-tos",
        "--no-eff-email"
    )
    
    if ($Force) {
        $certbotCmd += "--force-renewal"
    }
    
    $certbotCmd += @("-d", "cvtigaputraperkasa.id", "-d", "api.cvtigaputraperkasa.id")
    
    $certbotResult = & $certbotCmd[0] $certbotCmd[1..($certbotCmd.Length-1)]
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "SSL certificate generated successfully!"
    } else {
        Write-Error "Failed to generate SSL certificate"
        Write-Warning "Continuing with HTTP-only deployment..."
    }
    
    # Copy certificates to nginx ssl directory
    if (Test-Path "ssl\certs\live\cvtigaputraperkasa.id\fullchain.pem") {
        Write-Status "Copying SSL certificates..."
        Copy-Item "ssl\certs\live\cvtigaputraperkasa.id\fullchain.pem" "ssl\certs\cvtigaputraperkasa.id.crt"
        Copy-Item "ssl\certs\live\cvtigaputraperkasa.id\privkey.pem" "ssl\certs\cvtigaputraperkasa.id.key"
        Write-Success "SSL certificates copied successfully!"
    } else {
        Write-Warning "SSL certificates not found, creating self-signed certificates for testing..."
        
        # Create self-signed certificate using OpenSSL (if available) or PowerShell
        try {
            # Try OpenSSL first
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
                -keyout "ssl\certs\cvtigaputraperkasa.id.key" `
                -out "ssl\certs\cvtigaputraperkasa.id.crt" `
                -subj "/C=ID/ST=Jakarta/L=Jakarta/O=CV Tiga Putra Perkasa/CN=cvtigaputraperkasa.id"
        } catch {
            # Fallback to PowerShell certificate creation
            Write-Warning "OpenSSL not found, creating certificate with PowerShell..."
            $cert = New-SelfSignedCertificate -DnsName "cvtigaputraperkasa.id", "api.cvtigaputraperkasa.id" -CertStoreLocation "cert:\LocalMachine\My"
            $certPath = "ssl\certs\cvtigaputraperkasa.id.crt"
            $keyPath = "ssl\certs\cvtigaputraperkasa.id.key"
            
            # Export certificate
            Export-Certificate -Cert $cert -FilePath $certPath -Type CERT
            
            # Note: Private key export requires additional steps in PowerShell
            Write-Warning "Self-signed certificate created. Manual key extraction may be required."
        }
    }
    
    # Stop nginx
    Write-Status "Stopping nginx..."
    docker-compose -f docker-compose.production.yml stop nginx
}

# Start all services
Write-Status "Starting all services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
Write-Status "Waiting for services to be ready..."
Start-Sleep -Seconds 30

# Check service health
Write-Status "Checking service health..."

# Check PostgreSQL
try {
    docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U afms_user -d afms_database | Out-Null
    Write-Success "PostgreSQL is ready"
} catch {
    Write-Warning "PostgreSQL is not ready yet"
}

# Check Laravel API
try {
    docker-compose -f docker-compose.production.yml exec -T laravel-api php artisan --version | Out-Null
    Write-Success "Laravel API is ready"
    
    # Run database migrations
    Write-Status "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec -T laravel-api php artisan migrate --force
    
    # Seed database (optional)
    $seedChoice = Read-Host "Do you want to seed the database? (y/N)"
    if ($seedChoice -match "^[Yy]$") {
        Write-Status "Seeding database..."
        docker-compose -f docker-compose.production.yml exec -T laravel-api php artisan db:seed --force
    }
} catch {
    Write-Warning "Laravel API is not ready yet"
}

# Check Next.js
try {
    Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing | Out-Null
    Write-Success "Next.js is ready"
} catch {
    Write-Warning "Next.js is not ready yet"
}

# Check nginx
try {
    Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing | Out-Null
    Write-Success "Nginx is ready"
} catch {
    Write-Warning "Nginx is not ready yet"
}

# Display deployment status
Write-Status "Deployment Status:"
docker-compose -f docker-compose.production.yml ps

Write-Host ""
Write-Success "🎉 AFMS Deployment completed!"
Write-Host ""
Write-Status "Access URLs:"
Write-Host "  • Main Application: https://cvtigaputraperkasa.id"
Write-Host "  • API Endpoint: https://api.cvtigaputraperkasa.id"
Write-Host "  • HTTP (redirects to HTTPS): http://cvtigaputraperkasa.id"
Write-Host ""
Write-Status "Useful commands:"
Write-Host "  • View logs: docker-compose -f docker-compose.production.yml logs -f"
Write-Host "  • Restart services: docker-compose -f docker-compose.production.yml restart"
Write-Host "  • Stop services: docker-compose -f docker-compose.production.yml down"
Write-Host "  • Update application: git pull && docker-compose -f docker-compose.production.yml up -d --build"
Write-Host ""
Write-Status "SSL Certificate renewal (run monthly):"
Write-Host "  • docker run --rm -v `$(pwd)/ssl/certs:/etc/letsencrypt -v `$(pwd)/ssl/www:/var/www/certbot certbot/certbot renew"
Write-Host ""

if (Test-Path "ssl\certs\cvtigaputraperkasa.id.crt") {
    Write-Success "SSL is configured and ready!"
} else {
    Write-Warning "SSL configuration needs attention"
}