# Deploy AFMS Application to SSH Server
# Target: root@202.155.95.3

Param(
    [string]$ServerIP = "202.155.95.3",
    [string]$Username = "root",
    [string]$ProjectPath = "/var/www/afms"
)

# Colors for output
$Green = "Green"
$Red = "Red"
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

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

# Check if SCP is available
Write-Status "Checking SCP availability..."
try {
    scp 2>$null
    Write-Success "SCP is available"
} catch {
    Write-Error "SCP is not available. Please install OpenSSH client."
    exit 1
}

# Create deployment package
Write-Status "Creating deployment package..."
$TempDir = "$env:TEMP\afms-deploy"
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Copy essential files
$FilesToCopy = @(
    "docker-compose.yml",
    "Dockerfile",
    "nginx.conf",
    "deploy.sh",
    "generate-ssl.sh",
    "test-deployment.sh",
    "DEPLOYMENT-GUIDE-VPS-UBUNTU.md",
    "package.json",
    "next.config.js",
    "tailwind.config.js",
    "tsconfig.json",
    "postcss.config.js",
    ".dockerignore",
    ".gitignore"
)

$FoldersToSync = @(
    "components",
    "contexts",
    "hooks",
    "lib",
    "middleware",
    "pages",
    "public",
    "styles",
    "types",
    "utils",
    "laravel-api",
    "prisma"
)

Write-Status "Copying files to temporary directory..."
foreach ($file in $FilesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file $TempDir -Force
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Warning "File not found: $file"
    }
}

foreach ($folder in $FoldersToSync) {
    if (Test-Path $folder) {
        Copy-Item $folder $TempDir -Recurse -Force
        Write-Host "  ✓ $folder/" -ForegroundColor Green
    } else {
        Write-Warning "Folder not found: $folder"
    }
}

# Create archive
Write-Status "Creating deployment archive..."
$ArchivePath = "$env:TEMP\afms-deploy.tar.gz"
if (Test-Path $ArchivePath) {
    Remove-Item $ArchivePath -Force
}

# Use tar to create archive (available in Windows 10+)
try {
    Set-Location $TempDir
    tar -czf $ArchivePath *
    Set-Location $PSScriptRoot
    Write-Success "Archive created: $ArchivePath"
} catch {
    Write-Error "Failed to create archive. Please install tar or use WSL."
    exit 1
}

# Upload to server
Write-Status "Uploading to server $Username@$ServerIP..."
try {
    # Create project directory on server
    ssh "${Username}@${ServerIP}" "mkdir -p $ProjectPath"
    
    # Upload archive
    scp $ArchivePath "${Username}@${ServerIP}:${ProjectPath}/afms-deploy.tar.gz"
    
    Write-Success "Upload completed successfully!"
} catch {
    Write-Error "Failed to upload to server. Please check SSH connection."
    exit 1
}

# Extract and setup on server
Write-Status "Extracting and setting up on server..."
try {
    ssh "${Username}@${ServerIP}" @"
        cd $ProjectPath
        tar -xzf afms-deploy.tar.gz
        rm afms-deploy.tar.gz
        chmod +x *.sh
        echo 'Files extracted successfully!'
        ls -la
"@
    Write-Success "Setup completed on server!"
} catch {
    Write-Error "Failed to setup on server."
    exit 1
}

# Cleanup
Write-Status "Cleaning up temporary files..."
Remove-Item $TempDir -Recurse -Force
Remove-Item $ArchivePath -Force

Write-Success "Deployment package uploaded successfully!"
Write-Status "Next steps:"
Write-Host "  1. SSH to server: ssh $Username@$ServerIP" -ForegroundColor Yellow
Write-Host "  2. Navigate to project: cd $ProjectPath" -ForegroundColor Yellow
Write-Host "  3. Run deployment: ./deploy.sh" -ForegroundColor Yellow
Write-Host "  4. Test deployment: ./test-deployment.sh" -ForegroundColor Yellow

Write-Host "\nTo connect to server now, run:" -ForegroundColor Green
Write-Host "ssh $Username@$ServerIP" -ForegroundColor Cyan