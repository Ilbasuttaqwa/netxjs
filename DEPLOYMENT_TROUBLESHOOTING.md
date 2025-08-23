# AFMS Deployment Troubleshooting Guide

Panduan untuk mengatasi masalah deployment AFMS ke VPS DomaiNesia.

## 🚨 Error yang Sering Terjadi

### 1. "cp: cannot stat '.env.domainesia': No such file or directory"

**Penyebab:** File environment tidak ditemukan di server.

**Solusi:**
```bash
# Pastikan Anda berada di direktori project yang benar
cd /opt/afms

# Cek file yang tersedia
ls -la *.env*
ls -la laravel-api/.env*

# Gunakan script deployment otomatis
chmod +x deploy-setup.sh
./deploy-setup.sh
```

### 2. "no configuration file provided: not found"

**Penyebab:** Docker Compose tidak menemukan file konfigurasi.

**Solusi:**
```bash
# Pastikan file docker-compose.yml ada
ls -la docker-compose.yml

# Jika tidak ada, clone ulang repository
git pull origin master

# Atau jalankan dengan path lengkap
docker-compose -f docker-compose.yml up -d --build
```

### 3. Database Connection Error

**Penyebab:** Password database tidak sesuai antara file environment dan docker-compose.

**Solusi:**
```bash
# Update password di semua file
# 1. laravel-api/.env
DB_PASSWORD=your_secure_password

# 2. .env.local
DATABASE_URL=postgresql://postgres:your_secure_password@postgres:5432/afms_database

# 3. docker-compose.yml
POSTGRES_PASSWORD=your_secure_password
DB_PASSWORD=your_secure_password
```

### 4. Port Already in Use

**Penyebab:** Port sudah digunakan oleh service lain.

**Solusi:**
```bash
# Cek port yang digunakan
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000
sudo netstat -tulpn | grep :5432

# Stop service yang menggunakan port
sudo systemctl stop apache2  # Jika Apache menggunakan port 80
sudo systemctl stop nginx    # Jika Nginx menggunakan port 80

# Atau ubah port di docker-compose.yml
ports:
  - "3001:3000"  # Ubah port eksternal
  - "8001:80"    # Ubah port eksternal
```

## 🔧 Langkah Deployment yang Benar

### Step 1: Persiapan Server
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout dan login ulang untuk apply group changes
exit
```

### Step 2: Clone Project
```bash
# Clone ke direktori yang tepat
cd /opt
sudo git clone https://github.com/Ilbasuttaqwa/afmsnextj.git afms
sudo chown -R $USER:$USER /opt/afms
cd /opt/afms
```

### Step 3: Setup Environment
```bash
# Gunakan script otomatis
chmod +x deploy-setup.sh
./deploy-setup.sh

# Atau manual:
cp laravel-api/.env.example laravel-api/.env
cp .env.domainesia .env.local

# Edit file sesuai kebutuhan
nano laravel-api/.env
nano .env.local
nano docker-compose.yml
```

### Step 4: Deploy
```bash
# Build dan jalankan containers
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Tunggu containers siap
sleep 30

# Jalankan migrasi
docker-compose exec laravel-api php artisan migrate --force
docker-compose exec nextjs npx prisma migrate deploy
```

## 🔍 Debugging Commands

### Cek Status Containers
```bash
# Status semua containers
docker-compose ps

# Logs semua services
docker-compose logs

# Logs service tertentu
docker-compose logs nextjs
docker-compose logs laravel-api
docker-compose logs postgres
```

### Cek Koneksi Database
```bash
# Masuk ke container PostgreSQL
docker-compose exec postgres psql -U postgres -d afms_database

# Test koneksi dari Laravel
docker-compose exec laravel-api php artisan tinker
# Dalam tinker:
# DB::connection()->getPdo();
```

### Cek File Environment
```bash
# Cek isi file .env Laravel
docker-compose exec laravel-api cat .env

# Cek isi file .env Next.js
cat .env.local

# Cek konfigurasi Docker Compose
cat docker-compose.yml
```

## 🌐 Setup Domain dan SSL

### Update Environment untuk Production
```bash
# Update laravel-api/.env
APP_URL=https://api.afms.my.id
CORS_ALLOWED_ORIGINS=https://afms.my.id
SANCTUM_STATEFUL_DOMAINS=afms.my.id

# Update .env.local
NEXT_PUBLIC_APP_URL=https://afms.my.id
NEXT_PUBLIC_API_URL=https://api.afms.my.id
NEXTAUTH_URL=https://afms.my.id
```

### Setup Nginx Reverse Proxy
```bash
# Install Nginx
sudo apt install nginx -y

# Konfigurasi untuk afms.my.id
sudo nano /etc/nginx/sites-available/afms.my.id

# Konfigurasi untuk api.afms.my.id
sudo nano /etc/nginx/sites-available/api.afms.my.id

# Enable sites
sudo ln -s /etc/nginx/sites-available/afms.my.id /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.afms.my.id /etc/nginx/sites-enabled/

# Test dan restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Setup SSL dengan Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL certificates
sudo certbot --nginx -d afms.my.id -d api.afms.my.id

# Setup auto-renewal
sudo crontab -e
# Tambahkan:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📞 Bantuan Lebih Lanjut

Jika masih mengalami masalah:

1. **Cek logs detail:**
   ```bash
   docker-compose logs -f --tail=100
   ```

2. **Restart semua services:**
   ```bash
   docker-compose restart
   ```

3. **Rebuild dari awal:**
   ```bash
   docker-compose down --volumes --remove-orphans
   docker system prune -a
   ./deploy-setup.sh
   ```

4. **Cek resource server:**
   ```bash
   htop
   df -h
   free -m
   ```

5. **Test konektivitas:**
   ```bash
   curl -I http://localhost:3000
   curl -I http://localhost:8000/api/health
   ```