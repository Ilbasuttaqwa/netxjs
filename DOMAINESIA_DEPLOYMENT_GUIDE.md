# Panduan Deployment AFMS di DomaiNesia Cloud VPS

## Overview
Panduan ini menjelaskan cara deploy aplikasi AFMS (Attendance & Fingerprint Management System) di DomaiNesia Cloud VPS dengan konfigurasi optimal untuk production.

## Mengapa DomaiNesia Cloud VPS?

<mcreference link="https://www.domainesia.com/cloud-hosting/" index="1">1</mcreference> DomaiNesia Cloud VPS mendukung berbagai bahasa pemrograman termasuk PHP, Python, Node.js, dan framework modern seperti Next.js yang dibutuhkan untuk aplikasi AFMS.

### Keunggulan DomaiNesia:
- **Developer Friendly**: Mendukung PHP (Laravel) dan Node.js (Next.js) <mcreference link="https://www.domainesia.com/cloud-hosting/" index="1">1</mcreference>
- **Infrastruktur Modern**: SSD NVMe, uptime 99.9% <mcreference link="https://www.domainesia.com/cloud-vps/" index="3">3</mcreference>
- **Support Lokal**: Tim support Indonesia yang responsif <mcreference link="https://www.domainesia.com/cloud-vps/" index="2">2</mcreference>
- **Harga Kompetitif**: Harga terjangkau dengan fitur lengkap <mcreference link="https://www.domainesia.com/cloud-vps/" index="2">2</mcreference>

## Rekomendasi Spesifikasi VPS

Untuk aplikasi AFMS dengan Next.js + Laravel + Database, rekomendasi minimal:

### Untuk Development/Testing:
- **CPU**: 2 vCPU
- **RAM**: 4GB
- **Storage**: 40GB SSD NVMe
- **Bandwidth**: Unlimited
- **Estimasi Harga**: ~Rp 200.000-300.000/bulan

### Untuk Production (Recommended):
- **CPU**: 4 vCPU
- **RAM**: 8GB
- **Storage**: 80GB SSD NVMe
- **Bandwidth**: Unlimited
- **Estimasi Harga**: ~Rp 400.000-600.000/bulan

### Untuk High Traffic:
- **CPU**: 8 vCPU
- **RAM**: 16GB
- **Storage**: 160GB SSD NVMe
- **Bandwidth**: Unlimited
- **Estimasi Harga**: ~Rp 800.000-1.200.000/bulan

## Langkah-langkah Deployment

### 1. Persiapan VPS

#### Order Cloud VPS DomaiNesia
1. Kunjungi [DomaiNesia Cloud VPS](https://www.domainesia.com/cloud-vps/)
2. Pilih spesifikasi sesuai kebutuhan
3. Pilih OS: **Ubuntu 22.04 LTS** (recommended)
4. Selesaikan pembayaran

#### Setup Awal Server
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PHP 8.2
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update
sudo apt install -y php8.2 php8.2-fpm php8.2-mysql php8.2-pgsql php8.2-xml php8.2-curl php8.2-mbstring php8.2-zip php8.2-gd php8.2-bcmath

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Nginx
sudo apt install -y nginx

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install PM2 untuk Node.js process management
sudo npm install -g pm2
```

### 2. Setup Database

#### PostgreSQL (untuk Next.js)
```bash
# Switch ke user postgres
sudo -u postgres psql

# Buat database dan user
CREATE DATABASE afms_nextjs;
CREATE USER afms_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE afms_nextjs TO afms_user;
\q
```

#### MySQL (untuk Laravel API)
```bash
# Login ke MySQL
sudo mysql -u root -p

# Buat database dan user
CREATE DATABASE afms_laravel;
CREATE USER 'afms_laravel'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON afms_laravel.* TO 'afms_laravel'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Deploy Laravel API

```bash
# Clone repository
cd /var/www
sudo git clone https://github.com/your-repo/afms.git
sudo chown -R www-data:www-data afms
cd afms/laravel-api

# Install dependencies
composer install --optimize-autoloader --no-dev

# Setup environment
cp .env.production .env

# Edit .env file dengan konfigurasi database
sudo nano .env

# Generate key dan setup
php artisan key:generate
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations dan seeders
php artisan migrate --force
php artisan db:seed --force

# Set permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### 4. Deploy Next.js Frontend

```bash
# Masuk ke direktori Next.js
cd /var/www/afms

# Install dependencies
npm ci --only=production

# Setup environment
cp .env.production .env.local

# Edit environment variables
nano .env.local

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build aplikasi
npm run build

# Setup PM2
pm2 start npm --name "afms-nextjs" -- start
pm2 save
pm2 startup
```

### 5. Konfigurasi Nginx

#### Buat konfigurasi untuk Laravel API
```bash
sudo nano /etc/nginx/sites-available/afms-api
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /var/www/afms/laravel-api/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

#### Buat konfigurasi untuk Next.js
```bash
sudo nano /etc/nginx/sites-available/afms-frontend
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Aktifkan konfigurasi
```bash
sudo ln -s /etc/nginx/sites-available/afms-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/afms-frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL dengan Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate SSL certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# Setup auto-renewal
sudo crontab -e
# Tambahkan: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 7. Setup Monitoring dan Backup

#### Setup log rotation
```bash
sudo nano /etc/logrotate.d/afms
```

```
/var/www/afms/laravel-api/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0644 www-data www-data
}
```

#### Setup backup script
```bash
sudo nano /usr/local/bin/backup-afms.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/afms"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup databases
pg_dump -U afms_user afms_nextjs > $BACKUP_DIR/nextjs_$DATE.sql
mysqldump -u afms_laravel -p afms_laravel > $BACKUP_DIR/laravel_$DATE.sql

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/afms

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-afms.sh

# Setup cron untuk backup harian
sudo crontab -e
# Tambahkan: 0 2 * * * /usr/local/bin/backup-afms.sh
```

## Optimasi Performance

### 1. PHP-FPM Tuning
```bash
sudo nano /etc/php/8.2/fpm/pool.d/www.conf
```

```ini
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 35
pm.max_requests = 500
```

### 2. MySQL Tuning
```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

```ini
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
max_connections = 200
query_cache_size = 64M
```

### 3. Redis Configuration
```bash
sudo nano /etc/redis/redis.conf
```

```
maxmemory 1gb
maxmemory-policy allkeys-lru
```

## Security Checklist

- [ ] Update sistem secara berkala
- [ ] Setup firewall (UFW)
- [ ] Disable root SSH login
- [ ] Setup fail2ban
- [ ] Regular security audit
- [ ] Monitor log files
- [ ] Backup encryption

## Troubleshooting

### Common Issues:

1. **502 Bad Gateway**
   - Check PHP-FPM status: `sudo systemctl status php8.2-fpm`
   - Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

2. **Database Connection Error**
   - Verify database credentials in .env files
   - Check database service status

3. **Next.js Build Errors**
   - Check Node.js version compatibility
   - Verify environment variables
   - Check PM2 logs: `pm2 logs afms-nextjs`

## Support

Untuk bantuan teknis DomaiNesia:
- Live Chat: Available 24/7
- Ticket Support: <mcreference link="https://penasihathosting.com/review-domainesia/" index="3">3</mcreference> Response time rata-rata 30 menit
- Knowledge Base: Dokumentasi lengkap tersedia

## Estimasi Biaya Bulanan

| Komponen | Harga (IDR) |
|----------|-------------|
| Cloud VPS (4 vCPU, 8GB RAM) | 400.000 - 600.000 |
| Domain (.com) | 150.000/tahun |
| SSL Certificate | Gratis (Let's Encrypt) |
| **Total per bulan** | **~500.000** |

*Harga dapat berubah, cek website DomaiNesia untuk harga terkini dan promo yang tersedia.*

---

**Catatan**: Panduan ini dibuat berdasarkan konfigurasi optimal untuk aplikasi AFMS. Sesuaikan spesifikasi VPS dengan kebutuhan traffic dan budget Anda.