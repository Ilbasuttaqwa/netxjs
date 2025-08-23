# Panduan Deployment AFMS ke VPS DomaiNesia

Panduan lengkap untuk deploy aplikasi AFMS (Attendance & Fingerprint Management System) ke VPS DomaiNesia dengan Docker.

## Prasyarat

### 1. VPS Requirements
- VPS DomaiNesia dengan minimal 2GB RAM, 2 CPU cores
- Ubuntu 20.04 LTS atau 22.04 LTS
- Domain: `afms.my.id` dan `api.afms.my.id` sudah pointing ke IP VPS

### 2. Software yang Dibutuhkan
- Docker & Docker Compose
- Git
- Nginx (akan dijalankan dalam container)
- SSL Certificate (Let's Encrypt)

## Langkah 1: Persiapan VPS

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 1.3 Install Git dan Tools Lainnya
```bash
sudo apt install -y git curl wget nano htop
```

## Langkah 2: Clone dan Setup Project

### 2.1 Clone Repository
```bash
cd /opt
sudo git clone https://github.com/your-username/afms-project.git afms
sudo chown -R $USER:$USER /opt/afms
cd /opt/afms
```

### 2.2 Setup Environment Variables

#### Laravel API Environment
```bash
cp laravel-api/.env.example laravel-api/.env
nano laravel-api/.env
```

Update konfigurasi berikut:
```env
APP_NAME="AFMS API"
APP_ENV=production
APP_KEY=base64:$(openssl rand -base64 32)
APP_DEBUG=false
APP_URL=https://api.afms.my.id

# PostgreSQL Database
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=afms_database
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password-here

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# JWT
JWT_SECRET=$(openssl rand -base64 64)

# CORS
CORS_ALLOWED_ORIGINS=https://afms.my.id

# Security
SANCTUM_STATEFUL_DOMAINS=afms.my.id
SESSION_DOMAIN=.afms.my.id
```

#### Next.js Environment
```bash
cp .env.example .env.local
nano .env.local
```

Update konfigurasi:
```env
NODE_ENV=production
DATABASE_URL=postgresql://postgres:your-secure-password-here@postgres:5432/afms_database
NEXT_PUBLIC_API_URL=https://api.afms.my.id
JWT_SECRET=your-jwt-secret-key-here
```

### 2.3 Update docker-compose.yml untuk Production
```bash
nano docker-compose.yml
```

Pastikan environment variables sesuai:
```yaml
services:
  postgres:
    environment:
      - POSTGRES_PASSWORD=your-secure-password-here
  
  laravel-api:
    environment:
      - DB_PASSWORD=your-secure-password-here
  
  nextjs:
    environment:
      - DATABASE_URL=postgresql://postgres:your-secure-password-here@postgres:5432/afms_database
```

## Langkah 3: Setup SSL Certificate

### 3.1 Install Certbot
```bash
sudo apt install -y certbot
```

### 3.2 Generate SSL Certificate
```bash
# Stop any running web server
sudo systemctl stop apache2 nginx 2>/dev/null || true

# Generate certificates
sudo certbot certonly --standalone -d afms.my.id -d www.afms.my.id
sudo certbot certonly --standalone -d api.afms.my.id

# Create SSL directory
sudo mkdir -p /opt/afms/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/afms.my.id/fullchain.pem /opt/afms/ssl/afms.my.id.crt
sudo cp /etc/letsencrypt/live/afms.my.id/privkey.pem /opt/afms/ssl/afms.my.id.key
sudo cp /etc/letsencrypt/live/api.afms.my.id/fullchain.pem /opt/afms/ssl/api.afms.my.id.crt
sudo cp /etc/letsencrypt/live/api.afms.my.id/privkey.pem /opt/afms/ssl/api.afms.my.id.key

# Set permissions
sudo chown -R $USER:$USER /opt/afms/ssl
sudo chmod 600 /opt/afms/ssl/*.key
sudo chmod 644 /opt/afms/ssl/*.crt
```

### 3.3 Update Nginx Configuration untuk SSL
```bash
nano nginx.conf
```

Uncomment dan update SSL configuration:
```nginx
# SSL Configuration
server {
    listen 443 ssl http2;
    server_name afms.my.id www.afms.my.id;

    ssl_certificate /etc/nginx/ssl/afms.my.id.crt;
    ssl_certificate_key /etc/nginx/ssl/afms.my.id.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Same location blocks as HTTP version
    location / {
        proxy_pass http://nextjs_backend;
        # ... rest of configuration
    }
}

server {
    listen 443 ssl http2;
    server_name api.afms.my.id;

    ssl_certificate /etc/nginx/ssl/api.afms.my.id.crt;
    ssl_certificate_key /etc/nginx/ssl/api.afms.my.id.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Same location blocks as HTTP version
    location / {
        proxy_pass http://laravel_backend;
        # ... rest of configuration
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name afms.my.id www.afms.my.id api.afms.my.id;
    return 301 https://$server_name$request_uri;
}
```

## Langkah 4: Build dan Deploy

### 4.1 Build Images
```bash
cd /opt/afms

# Build all services
docker-compose build --no-cache
```

### 4.2 Start Services
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4.3 Setup Database
```bash
# Wait for PostgreSQL to be ready
sleep 30

# Run Laravel migrations
docker-compose exec laravel-api php artisan migrate --force

# Seed database (if needed)
docker-compose exec laravel-api php artisan db:seed --force

# Generate Laravel app key
docker-compose exec laravel-api php artisan key:generate --force

# Clear caches
docker-compose exec laravel-api php artisan config:cache
docker-compose exec laravel-api php artisan route:cache
docker-compose exec laravel-api php artisan view:cache

# Run Prisma migrations for Next.js
docker-compose exec nextjs npx prisma migrate deploy
docker-compose exec nextjs npx prisma generate
```

## Langkah 5: Verifikasi Deployment

### 5.1 Test Endpoints
```bash
# Test frontend
curl -I https://afms.my.id

# Test API
curl -I https://api.afms.my.id/api/health

# Test fingerprint endpoint
curl -X POST https://api.afms.my.id/api/fingerprint/push \
  -H "Content-Type: application/json" \
  -d '{"pin":"123","checktime":"2025-01-20 08:00:00","status":"IN"}'
```

### 5.2 Monitor Logs
```bash
# Monitor all services
docker-compose logs -f

# Monitor specific service
docker-compose logs -f nginx
docker-compose logs -f laravel-api
docker-compose logs -f nextjs
docker-compose logs -f postgres
```

## Langkah 6: Setup Auto-Renewal SSL

### 6.1 Create Renewal Script
```bash
sudo nano /opt/afms/renew-ssl.sh
```

```bash
#!/bin/bash

# Renew certificates
certbot renew --quiet

# Copy new certificates
cp /etc/letsencrypt/live/afms.my.id/fullchain.pem /opt/afms/ssl/afms.my.id.crt
cp /etc/letsencrypt/live/afms.my.id/privkey.pem /opt/afms/ssl/afms.my.id.key
cp /etc/letsencrypt/live/api.afms.my.id/fullchain.pem /opt/afms/ssl/api.afms.my.id.crt
cp /etc/letsencrypt/live/api.afms.my.id/privkey.pem /opt/afms/ssl/api.afms.my.id.key

# Set permissions
chown -R $USER:$USER /opt/afms/ssl
chmod 600 /opt/afms/ssl/*.key
chmod 644 /opt/afms/ssl/*.crt

# Reload nginx
cd /opt/afms
docker-compose exec nginx nginx -s reload
```

```bash
sudo chmod +x /opt/afms/renew-ssl.sh
```

### 6.2 Setup Cron Job
```bash
sudo crontab -e
```

Tambahkan:
```
0 3 * * * /opt/afms/renew-ssl.sh
```

## Langkah 7: Backup dan Monitoring

### 7.1 Setup Database Backup
```bash
sudo nano /opt/afms/backup-db.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/opt/afms/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U postgres afms_database > $BACKUP_DIR/afms_db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "afms_db_*.sql" -mtime +7 -delete
```

```bash
sudo chmod +x /opt/afms/backup-db.sh
```

Tambahkan ke crontab:
```
0 2 * * * /opt/afms/backup-db.sh
```

### 7.2 Setup Log Rotation
```bash
sudo nano /etc/logrotate.d/afms
```

```
/opt/afms/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

## Troubleshooting

### Common Issues

1. **Container tidak start**
   ```bash
   docker-compose logs [service-name]
   docker-compose down && docker-compose up -d
   ```

2. **Database connection error**
   ```bash
   # Check PostgreSQL status
   docker-compose exec postgres pg_isready -U postgres
   
   # Reset database
   docker-compose down -v
   docker-compose up -d
   ```

3. **SSL certificate issues**
   ```bash
   # Check certificate validity
   openssl x509 -in /opt/afms/ssl/afms.my.id.crt -text -noout
   
   # Renew manually
   sudo /opt/afms/renew-ssl.sh
   ```

4. **High memory usage**
   ```bash
   # Monitor resource usage
   docker stats
   
   # Restart services
   docker-compose restart
   ```

### Useful Commands

```bash
# View all containers
docker-compose ps

# Restart specific service
docker-compose restart [service-name]

# Update and redeploy
git pull
docker-compose build --no-cache
docker-compose up -d

# Clean up unused images
docker system prune -a

# Backup volumes
docker run --rm -v afms_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

## Endpoint Testing

### Frontend (https://afms.my.id)
- Login page: `https://afms.my.id/login`
- Dashboard: `https://afms.my.id/dashboard`
- Device config: `https://afms.my.id/device-config`

### API (https://api.afms.my.id)
- Health check: `GET https://api.afms.my.id/api/health`
- Fingerprint push: `POST https://api.afms.my.id/api/fingerprint/push`
- Authentication: `POST https://api.afms.my.id/api/auth/login`

## Security Checklist

- [ ] SSL certificates installed and working
- [ ] Strong database passwords
- [ ] JWT secrets generated
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] Regular backups scheduled
- [ ] Log monitoring setup
- [ ] Rate limiting configured
- [ ] CORS properly configured

## Support

Jika mengalami masalah:
1. Check logs: `docker-compose logs -f`
2. Verify configuration files
3. Test network connectivity
4. Check domain DNS settings
5. Verify SSL certificates

Selamat! AFMS sudah berhasil di-deploy ke VPS DomaiNesia. 🎉