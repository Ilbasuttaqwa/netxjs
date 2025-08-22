# PowerShell script to start ngrok tunnel for AFMS application
# Make sure you have ngrok installed and configured

Write-Host "Starting ngrok tunnel for AFMS application..." -ForegroundColor Green

# Check if ngrok is installed
if (!(Get-Command "ngrok" -ErrorAction SilentlyContinue)) {
    Write-Host "Error: ngrok is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install ngrok from https://ngrok.com/download" -ForegroundColor Yellow
    exit 1
}

# Check if ngrok.yml exists
if (!(Test-Path "ngrok.yml")) {
    Write-Host "Error: ngrok.yml configuration file not found" -ForegroundColor Red
    Write-Host "Please make sure ngrok.yml is in the current directory" -ForegroundColor Yellow
    exit 1
}

# Start ngrok with configuration
Write-Host "Starting ngrok tunnel..." -ForegroundColor Blue
ngrok start --config ngrok.yml afms-app