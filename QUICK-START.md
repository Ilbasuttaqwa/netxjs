# 🚀 AFMS Quick Start Guide

Panduan super cepat untuk deploy AFMS dalam 5 menit!

## ⚡ Quick Setup (5 Menit)

### 1. Install Docker (Jika belum ada)
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Windows: Download Docker Desktop dari docker.com
```

### 2. Clone & Setup
```bash
git clone https://github.com/your-username/netxjs.git
cd netxjs
cp .env.production .env
```

### 3. Edit Environment (PENTING!)
```bash
nano .env  # Linux/Mac
# atau
notepad .env  # Windows
```

**Yang WAJIB diganti di .env:**
- `JWT_SECRET` → Random string 32+ karakter
- `NEXTAUTH_SECRET` → Random string 32+ karakter  
- `your-server-ip-or-domain.com` → IP/domain server Anda
- `API_SECRET_TOKEN` → Random string 32+ karakter

### 4. Deploy!
```bash
# Linux/Mac
chmod +x deploy.sh
./deploy.sh

# Windows PowerShell
.\deploy.ps1
```

### 5. Akses Aplikasi
- **Frontend**: http://your-server-ip:3000
- **API**: http://your-server-ip:8000

## 🔧 Perintah Cepat

```bash
# Lihat status
docker-compose -f docker-compose.production.yml ps

# Lihat logs
docker-compose -f docker-compose.production.yml logs -f

# Restart
docker-compose -f docker-compose.production.yml restart

# Stop
docker-compose -f docker-compose.production.yml down

# Update aplikasi
git pull && ./deploy.sh
```

## 🆘 Troubleshooting Cepat

**Port sudah digunakan?**
```bash
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000
```

**Container error?**
```bash
docker-compose -f docker-compose.production.yml logs [service-name]
```

**Database error?**
```bash
docker-compose -f docker-compose.production.yml restart mysql
docker-compose -f docker-compose.production.yml exec laravel-api php artisan migrate
```

## 📱 Default Login

Setelah seeding database:
- **Username**: admin@afms.com
- **Password**: password

---

**Butuh panduan lengkap?** Baca `PANDUAN-DEPLOYMENT.md`

**Selamat! AFMS sudah running! 🎉**