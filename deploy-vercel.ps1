# Script untuk deployment AFMS ke Vercel
# Pastikan Vercel CLI sudah terinstall: npm i -g vercel

Write-Host "🚀 Memulai deployment AFMS ke Vercel..." -ForegroundColor Green

# Check if vercel CLI is installed
if (!(Get-Command "vercel" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI tidak ditemukan. Install dengan: npm i -g vercel" -ForegroundColor Red
    exit 1
}

# Check if .env.local exists
if (!(Test-Path ".env.local")) {
    Write-Host "⚠️  File .env.local tidak ditemukan. Pastikan environment variables sudah dikonfigurasi di Vercel dashboard." -ForegroundColor Yellow
}

# Build project locally first
Write-Host "🔨 Building project locally..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build gagal. Perbaiki error terlebih dahulu." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build berhasil!" -ForegroundColor Green

# Deploy to Vercel
Write-Host "🚀 Deploying ke Vercel..." -ForegroundColor Blue
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment berhasil!" -ForegroundColor Green
    Write-Host "📋 Checklist setelah deployment:" -ForegroundColor Yellow
    Write-Host "   1. Pastikan environment variables sudah dikonfigurasi di Vercel dashboard"
    Write-Host "   2. Jalankan database migration jika diperlukan"
    Write-Host "   3. Test dashboard di: https://your-domain.vercel.app/dashboard"
    Write-Host "   4. Test admin dashboard di: https://your-domain.vercel.app/admin/dashboard"
    Write-Host "   5. Periksa function logs jika ada error"
} else {
    Write-Host "❌ Deployment gagal. Periksa error di atas." -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Deployment selesai!" -ForegroundColor Green