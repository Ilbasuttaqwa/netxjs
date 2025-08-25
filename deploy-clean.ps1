# AFMS Clean Deployment Script for Neva Cloud (PowerShell)
# This script will clean up old files and deploy fresh application

param(
    [string]$ServerHost = "afms.my.id",
    [string]$ServerUser = "root",
    [string]$DeployPath = "/var/www/afms",
    [string]$BackupPath = "/var/backups/afms"
)

# Colors for output
$Red = "`e[31m"
$Green = "`e[32m"
$Yellow = "`e[33m"
$Reset = "`e[0m"

function Write-Info {
    param([string]$Message)
    Write-Host "${Green}[INFO]${Reset} $Message"
}

function Write-Warn {
    param([string]$Message)
    Write-Host "${Yellow}[WARN]${Reset} $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Host "${Red}[ERROR]${Reset} $Message"
}

function Test-ServerConnection {
    Write-Info "Checking server connectivity..."
    try {
        $result = ssh -o ConnectTimeout=10 "$ServerUser@$ServerHost" "echo 'Server accessible'" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Server is accessible"
            return $true
        } else {
            Write-Error "Cannot connect to server $ServerHost"
            return $false
        }
    } catch {
        Write-Error "Cannot connect to server $ServerHost"
        return $false
    }
}

function Backup-CurrentDeployment {
    Write-Info "Creating backup of current deployment..."
    $backupScript = @'
if [ -d "/var/www/afms" ]; then
    mkdir -p /var/backups/afms
    BACKUP_NAME="afms-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r /var/www/afms "/var/backups/afms/$BACKUP_NAME"
    echo "Backup created: /var/backups/afms/$BACKUP_NAME"
else
    echo "No existing deployment found to backup"
fi
'@
    
    ssh "$ServerUser@$ServerHost" $backupScript
}

function Remove-OldFiles {
    Write-Info "Cleaning up old files on server..."
    $cleanupScript = @'
# Stop and remove old containers
if command -v docker-compose >/dev/null 2>&1; then
    cd /var/www/afms 2>/dev/null || true
    docker-compose down --remove-orphans 2>/dev/null || true
fi

# Remove old application files
rm -rf /var/www/afms/*
rm -rf /var/www/afms/.*

# Clean Docker system
docker system prune -af --volumes 2>/dev/null || true

echo "Old files cleaned successfully"
'@
    
    ssh "$ServerUser@$ServerHost" $cleanupScript
}

function Send-ApplicationFiles {
    Write-Info "Uploading new application files..."
    
    # Create deployment directory
    ssh "$ServerUser@$ServerHost" "mkdir -p $DeployPath"
    
    # Check if rsync is available, otherwise use scp
    if (Get-Command rsync -ErrorAction SilentlyContinue) {
        Write-Info "Using rsync for file transfer..."
        rsync -avz --progress `
            --exclude='.git' `
            --exclude='node_modules' `
            --exclude='.next' `
            --exclude='*.log' `
            --exclude='.env.local' `
            ./ "${ServerUser}@${ServerHost}:${DeployPath}/"
    } else {
        Write-Info "Using scp for file transfer..."
        # Create a temporary archive
        $tempFile = "afms-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
        
        # Create tar archive excluding unnecessary files
        tar -czf $tempFile --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='*.log' --exclude='.env.local' .
        
        # Upload archive
        scp $tempFile "${ServerUser}@${ServerHost}:${DeployPath}/"
        
        # Extract on server
        ssh "$ServerUser@$ServerHost" "cd $DeployPath && tar -xzf $tempFile && rm $tempFile"
        
        # Clean up local temp file
        Remove-Item $tempFile
    }
    
    Write-Info "Files uploaded successfully"
}

function Deploy-Application {
    Write-Info "Deploying application on server..."
    $deployScript = @'
cd /var/www/afms

# Set proper permissions
chown -R www-data:www-data .
chmod -R 755 .

# Build and start containers
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Check service health
docker-compose ps

echo "Deployment completed successfully"
'@
    
    ssh "$ServerUser@$ServerHost" $deployScript
}

function Test-Deployment {
    Write-Info "Verifying deployment..."
    
    # Check if site is accessible
    try {
        $response = Invoke-WebRequest -Uri "https://$ServerHost/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Info "✅ Site is accessible at https://$ServerHost"
        } else {
            Write-Warn "⚠️  Site health check returned status: $($response.StatusCode)"
        }
    } catch {
        Write-Warn "⚠️  Site health check failed, but deployment may still be starting"
    }
    
    # Show container status
    Write-Info "Container status:"
    ssh "$ServerUser@$ServerHost" "cd $DeployPath && docker-compose ps"
}

function Start-CleanDeployment {
    Write-Info "🚀 Starting AFMS Clean Deployment to Neva Cloud..."
    
    if (-not (Test-ServerConnection)) {
        exit 1
    }
    
    try {
        Backup-CurrentDeployment
        Remove-OldFiles
        Send-ApplicationFiles
        Deploy-Application
        Test-Deployment
        
        Write-Info "🎉 Clean deployment completed successfully!"
        Write-Info "Your application is now available at: https://$ServerHost"
    } catch {
        Write-Error "Deployment failed: $($_.Exception.Message)"
        exit 1
    }
}

# Run main deployment
Start-CleanDeployment