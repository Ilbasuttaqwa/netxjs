# AFMS Testing Environment Setup Script
# Script untuk mempersiapkan lingkungan testing fingerprint scanner dan dependencies

Write-Host "=== AFMS Testing Environment Setup ===" -ForegroundColor Green
Write-Host "Mempersiapkan lingkungan testing untuk AFMS Fingerprint System" -ForegroundColor Yellow
Write-Host ""

# Function untuk logging
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path "test-environment.log" -Value $logMessage
}

# Function untuk check service status
function Test-ServiceStatus {
    param(
        [string]$ServiceName,
        [string]$DisplayName
    )
    try {
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service) {
            if ($service.Status -eq "Running") {
                Write-Log "✅ $DisplayName is running" "SUCCESS"
                return $true
            } else {
                Write-Log "⚠️ $DisplayName is installed but not running" "WARNING"
                return $false
            }
        } else {
            Write-Log "❌ $DisplayName is not installed" "ERROR"
            return $false
        }
    } catch {
        Write-Log "❌ Error checking $DisplayName : $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Function untuk check port availability
function Test-PortConnection {
    param(
        [string]$ComputerName,
        [int]$Port,
        [string]$Description
    )
    try {
        $connection = Test-NetConnection -ComputerName $ComputerName -Port $Port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Log "✅ $Description ($ComputerName:$Port) is accessible" "SUCCESS"
            return $true
        } else {
            Write-Log "❌ $Description ($ComputerName:$Port) is not accessible" "ERROR"
            return $false
        }
    } catch {
        Write-Log "❌ Error testing $Description : $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Function untuk check fingerprint device
function Test-FingerprintDevice {
    param(
        [string]$DeviceIP = "192.168.1.100",
        [int]$DevicePort = 4370
    )
    
    Write-Log "Testing Fingerprint Device Connection..." "INFO"
    
    # Test basic connectivity
    $pingResult = Test-Connection -ComputerName $DeviceIP -Count 2 -Quiet
    if ($pingResult) {
        Write-Log "✅ Fingerprint device ($DeviceIP) is reachable via ping" "SUCCESS"
        
        # Test specific port
        $portTest = Test-PortConnection -ComputerName $DeviceIP -Port $DevicePort -Description "Fingerprint Device"
        return $portTest
    } else {
        Write-Log "❌ Fingerprint device ($DeviceIP) is not reachable" "ERROR"
        return $false
    }
}

# Function untuk check database connection
function Test-DatabaseConnection {
    Write-Log "Testing Database Connection..." "INFO"
    
    try {
        # Check if MySQL/MariaDB is running
        $mysqlRunning = Test-ServiceStatus -ServiceName "MySQL*" -DisplayName "MySQL/MariaDB"
        
        if (-not $mysqlRunning) {
            # Try alternative service names
            $mysqlRunning = Test-ServiceStatus -ServiceName "MariaDB*" -DisplayName "MariaDB"
        }
        
        # Test database port
        $dbPortTest = Test-PortConnection -ComputerName "localhost" -Port 3306 -Description "Database Server"
        
        return ($mysqlRunning -and $dbPortTest)
    } catch {
        Write-Log "❌ Error testing database connection: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Function untuk check web services
function Test-WebServices {
    Write-Log "Testing Web Services..." "INFO"
    
    $results = @{}
    
    # Test NextJS Frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3002" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ NextJS Frontend is running (Port 3002)" "SUCCESS"
            $results.NextJS = $true
        } else {
            Write-Log "⚠️ NextJS Frontend responded with status: $($response.StatusCode)" "WARNING"
            $results.NextJS = $false
        }
    } catch {
        Write-Log "❌ NextJS Frontend is not accessible (Port 3002)" "ERROR"
        $results.NextJS = $false
    }
    
    # Test Laravel API
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Log "✅ Laravel API is running (Port 8001)" "SUCCESS"
            $results.Laravel = $true
        } else {
            Write-Log "⚠️ Laravel API responded with status: $($response.StatusCode)" "WARNING"
            $results.Laravel = $false
        }
    } catch {
        Write-Log "❌ Laravel API is not accessible (Port 8001)" "ERROR"
        $results.Laravel = $false
    }
    
    return $results
}

# Function untuk check required files
function Test-RequiredFiles {
    Write-Log "Checking Required Files..." "INFO"
    
    $requiredFiles = @(
        "docker-compose.yml",
        "package.json",
        "laravel-api/composer.json",
        "laravel-api/.env.example",
        "prisma/schema.prisma",
        "nginx/nginx.conf"
    )
    
    $allFilesExist = $true
    
    foreach ($file in $requiredFiles) {
        $fullPath = Join-Path $PWD $file
        if (Test-Path $fullPath) {
            Write-Log "✅ $file exists" "SUCCESS"
        } else {
            Write-Log "❌ $file is missing" "ERROR"
            $allFilesExist = $false
        }
    }
    
    return $allFilesExist
}

# Function untuk check Node.js dependencies
function Test-NodeDependencies {
    Write-Log "Checking Node.js Dependencies..." "INFO"
    
    try {
        # Check if node_modules exists
        if (Test-Path "node_modules") {
            Write-Log "✅ node_modules directory exists" "SUCCESS"
            
            # Check key dependencies
            $keyDeps = @("next", "react", "@prisma/client", "typescript")
            $allDepsExist = $true
            
            foreach ($dep in $keyDeps) {
                $depPath = Join-Path "node_modules" $dep
                if (Test-Path $depPath) {
                    Write-Log "✅ $dep is installed" "SUCCESS"
                } else {
                    Write-Log "❌ $dep is missing" "ERROR"
                    $allDepsExist = $false
                }
            }
            
            return $allDepsExist
        } else {
            Write-Log "❌ node_modules directory not found. Run 'npm install'" "ERROR"
            return $false
        }
    } catch {
        Write-Log "❌ Error checking Node.js dependencies: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Function untuk check Laravel dependencies
function Test-LaravelDependencies {
    Write-Log "Checking Laravel Dependencies..." "INFO"
    
    try {
        $vendorPath = "laravel-api/vendor"
        if (Test-Path $vendorPath) {
            Write-Log "✅ Laravel vendor directory exists" "SUCCESS"
            return $true
        } else {
            Write-Log "❌ Laravel vendor directory not found. Run 'composer install' in laravel-api directory" "ERROR"
            return $false
        }
    } catch {
        Write-Log "❌ Error checking Laravel dependencies: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# Function untuk generate test environment report
function Generate-TestReport {
    param(
        [hashtable]$Results
    )
    
    Write-Host ""
    Write-Host "=== TESTING ENVIRONMENT REPORT ===" -ForegroundColor Cyan
    Write-Host ""
    
    $overallStatus = $true
    
    foreach ($key in $Results.Keys) {
        $status = if ($Results[$key]) { "✅ PASS" } else { "❌ FAIL" }
        $color = if ($Results[$key]) { "Green" } else { "Red" }
        
        Write-Host "$key : $status" -ForegroundColor $color
        
        if (-not $Results[$key]) {
            $overallStatus = $false
        }
    }
    
    Write-Host ""
    if ($overallStatus) {
        Write-Host "🎉 OVERALL STATUS: READY FOR TESTING" -ForegroundColor Green
        Write-Log "Environment is ready for fingerprint testing" "SUCCESS"
    } else {
        Write-Host "⚠️ OVERALL STATUS: NEEDS ATTENTION" -ForegroundColor Yellow
        Write-Log "Environment needs attention before testing" "WARNING"
    }
    
    Write-Host ""
    Write-Host "Log file: test-environment.log" -ForegroundColor Gray
}

# Main execution
try {
    Write-Log "Starting AFMS Testing Environment Setup" "INFO"
    
    # Initialize results
    $testResults = @{}
    
    # Run all tests
    Write-Host "1. Checking Required Files..." -ForegroundColor Yellow
    $testResults["Required Files"] = Test-RequiredFiles
    
    Write-Host ""
    Write-Host "2. Checking Node.js Dependencies..." -ForegroundColor Yellow
    $testResults["Node.js Dependencies"] = Test-NodeDependencies
    
    Write-Host ""
    Write-Host "3. Checking Laravel Dependencies..." -ForegroundColor Yellow
    $testResults["Laravel Dependencies"] = Test-LaravelDependencies
    
    Write-Host ""
    Write-Host "4. Checking Database Connection..." -ForegroundColor Yellow
    $testResults["Database Connection"] = Test-DatabaseConnection
    
    Write-Host ""
    Write-Host "5. Checking Web Services..." -ForegroundColor Yellow
    $webResults = Test-WebServices
    $testResults["NextJS Frontend"] = $webResults.NextJS
    $testResults["Laravel API"] = $webResults.Laravel
    
    Write-Host ""
    Write-Host "6. Checking Fingerprint Device..." -ForegroundColor Yellow
    # Read device IP from environment or use default
    $deviceIP = if ($env:FINGERPRINT_DEVICE_IP) { $env:FINGERPRINT_DEVICE_IP } else { "192.168.1.100" }
    $devicePort = if ($env:FINGERPRINT_DEVICE_PORT) { [int]$env:FINGERPRINT_DEVICE_PORT } else { 4370 }
    $testResults["Fingerprint Device"] = Test-FingerprintDevice -DeviceIP $deviceIP -DevicePort $devicePort
    
    # Generate final report
    Generate-TestReport -Results $testResults
    
    Write-Log "AFMS Testing Environment Setup completed" "INFO"
    
} catch {
    Write-Log "Critical error during environment setup: $($_.Exception.Message)" "ERROR"
    Write-Host "❌ Critical error occurred. Check test-environment.log for details." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Fix any failed checks above" -ForegroundColor White
Write-Host "2. Run 'npm run dev' to start NextJS frontend" -ForegroundColor White
Write-Host "3. Run 'php artisan serve --port=8001' in laravel-api directory" -ForegroundColor White
Write-Host "4. Configure fingerprint device IP in .env file" -ForegroundColor White
Write-Host "5. Run fingerprint CRUD tests" -ForegroundColor White
Write-Host ""