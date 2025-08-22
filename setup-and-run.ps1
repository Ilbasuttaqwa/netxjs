# PowerShell script untuk setup dan menjalankan AFMS dengan Google OAuth dan Ngrok

Write-Host "=== AFMS Setup dan Run Script ===" -ForegroundColor Green
Write-Host ""

# Function untuk check apakah command tersedia
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (!(Test-Command "node")) {
    Write-Host "Error: Node.js tidak ditemukan. Install Node.js terlebih dahulu." -ForegroundColor Red
    exit 1
}

if (!(Test-Command "npm")) {
    Write-Host "Error: npm tidak ditemukan. Install npm terlebih dahulu." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Node.js dan npm tersedia" -ForegroundColor Green

# Install dependencies
Write-Host "\nInstalling dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "✓ Dependencies berhasil diinstall" -ForegroundColor Green
} catch {
    Write-Host "Error: Gagal menginstall dependencies" -ForegroundColor Red
    exit 1
}

# Check environment file
if (!(Test-Path ".env")) {
    Write-Host "\nWarning: File .env tidak ditemukan. Copying dari .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ File .env dibuat dari template" -ForegroundColor Green
    Write-Host "\nIMPORTANT: Silakan update file .env dengan token dan konfigurasi yang benar:" -ForegroundColor Red
    Write-Host "- GOOGLE_CLIENT_ID" -ForegroundColor Red
    Write-Host "- GOOGLE_CLIENT_SECRET" -ForegroundColor Red
    Write-Host "- NGROK_AUTH_TOKEN" -ForegroundColor Red
    Write-Host "\nTekan Enter untuk melanjutkan setelah update .env..." -ForegroundColor Yellow
    Read-Host
}

# Build aplikasi
Write-Host "\nBuilding aplikasi..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✓ Build berhasil" -ForegroundColor Green
} catch {
    Write-Host "Error: Build gagal" -ForegroundColor Red
    exit 1
}

# Check ngrok
if (Test-Command "ngrok") {
    Write-Host "\n✓ Ngrok tersedia" -ForegroundColor Green
    
    # Ask user if they want to start ngrok
    $startNgrok = Read-Host "\nApakah Anda ingin menjalankan ngrok tunnel? (y/n)"
    
    if ($startNgrok -eq "y" -or $startNgrok -eq "Y") {
        Write-Host "\nStarting ngrok tunnel..." -ForegroundColor Blue
        
        # Start ngrok in background
        Start-Process -FilePath "ngrok" -ArgumentList "start --config ngrok.yml afms-app" -WindowStyle Minimized
        
        Write-Host "✓ Ngrok tunnel started" -ForegroundColor Green
        Write-Host "Ngrok web interface: http://localhost:4040" -ForegroundColor Cyan
        
        # Wait a bit for ngrok to start
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "\nWarning: Ngrok tidak ditemukan. Aplikasi hanya akan berjalan di localhost." -ForegroundColor Yellow
    Write-Host "Install ngrok dari https://ngrok.com/download untuk public access" -ForegroundColor Yellow
}

# Start aplikasi
Write-Host "\nStarting AFMS aplikasi..." -ForegroundColor Green
Write-Host "Aplikasi akan berjalan di: http://localhost:3000" -ForegroundColor Cyan
Write-Host "\nTekan Ctrl+C untuk menghentikan aplikasi" -ForegroundColor Yellow
Write-Host ""

# Start the application
npm start