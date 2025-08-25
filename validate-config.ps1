# =============================================================================
# AFMS Configuration Validation Script (PowerShell)
# =============================================================================

Write-Host "Starting AFMS configuration validation..." -ForegroundColor Blue

# Check if required files exist
Write-Host "Checking required files..." -ForegroundColor Blue

$requiredFiles = @(
    "docker-compose.yml",
    "nginx\nginx.conf",
    "frontend\Dockerfile",
    "backend\Dockerfile",
    "backend\.env.example"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "[SUCCESS] Found: $file" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Missing: $file" -ForegroundColor Red
    }
}

# Check Docker Compose syntax
Write-Host "Validating Docker Compose configuration..." -ForegroundColor Blue
try {
    $output = docker-compose config 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Docker Compose configuration is valid" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Docker Compose configuration has errors" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Failed to validate Docker Compose configuration" -ForegroundColor Red
}

# Check environment variables in docker-compose.yml
Write-Host "Checking environment variables..." -ForegroundColor Blue
if (Select-String -Path "docker-compose.yml" -Pattern "http://" -Quiet) {
    Write-Host "[SUCCESS] HTTP URLs configured correctly" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Check URL configurations" -ForegroundColor Yellow
}

# Check Nginx configuration syntax (basic)
Write-Host "Basic Nginx configuration check..." -ForegroundColor Blue
if ((Select-String -Path "nginx\nginx.conf" -Pattern "server_name" -Quiet) -and 
    (Select-String -Path "nginx\nginx.conf" -Pattern "location" -Quiet)) {
    Write-Host "[SUCCESS] Nginx configuration structure looks good" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Nginx configuration may have issues" -ForegroundColor Red
}

# Check for CORS configuration
Write-Host "Checking CORS configuration..." -ForegroundColor Blue
if (Select-String -Path "nginx\nginx.conf" -Pattern "Access-Control-Allow-Origin" -Quiet) {
    Write-Host "[SUCCESS] CORS headers configured" -ForegroundColor Green
} else {
    Write-Host "[WARNING] CORS headers not found" -ForegroundColor Yellow
}

# Check backend environment example
Write-Host "Checking backend environment configuration..." -ForegroundColor Blue
if (Select-String -Path "backend\.env.example" -Pattern "CORS_ALLOWED_ORIGINS" -Quiet) {
    Write-Host "[SUCCESS] CORS configuration found in .env.example" -ForegroundColor Green
} else {
    Write-Host "[WARNING] CORS configuration missing in .env.example" -ForegroundColor Yellow
}

Write-Host "Configuration validation completed!" -ForegroundColor Blue
Write-Host "Review any warnings or errors above before deployment." -ForegroundColor Blue