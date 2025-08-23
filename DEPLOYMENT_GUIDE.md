# Panduan Deployment AFMS ke VPS DomaiNesia

Panduan lengkap untuk deploy aplikasi AFMS (Next.js + Laravel API) menggunakan Docker ke VPS DomaiNesia.

## Prerequisites

### 1. VPS Requirements
- VPS dengan minimal 2GB RAM, 2 CPU cores
- Ubuntu 20.04 LTS atau lebih baru
- Domain yang sudah pointing ke IP VPS
- SSL Certificate (Let's Encrypt)

### 2. Software yang Diperlukan
- Docker & Docker Compose
- Git
- Nginx (untuk SSL termination)
- Certbot (untuk SSL certificate)

## Step 1: Persiapan VPS

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

# Logout and login again
exit
```

### 1.3 Install Git dan Tools
```bash
sudo apt install git nginx certbot python3-certbot-nginx -y
```

## Step 2: Clone dan Setup Project

### 2.1 Clone Repository
```bash
cd /opt
sudo git clone https://github.com/your-username/afmsnextjs.git
sudo chown -R $USER:$USER /opt/afmsnextjs
cd /opt/afmsnextjs
```

### 2.2 Setup Environment Variables

#### 2.2.1 Update docker-compose.yml
Ganti placeholder domain di `docker-compose.yml`:
```bash
sed -i 's/yourdomain.com/your-actual-domain.com/g' docker-compose.yml
```

#### 2.2.2 Update nginx.conf
Ganti placeholder domain di `nginx.conf`:
```bash
sed -i 's/yourdomain.com/your-actual-domain.com/g' nginx.conf
sed -i 's/api.yourdomain.com/api.your-actual-domain.com/g' nginx.conf
```

#### 2.2.3 Setup Laravel .env
Update file `laravel-api/.env`:
```bash
# Generate APP_KEY
APP_KEY=$(openssl rand -base64 32)
sed -i "s/APP_KEY=.*/APP_KEY=base64:$APP_KEY/" laravel-api/.env

# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -base64 64)
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" laravel-api/.env

# Update domain
sed -i 's/yourdomain.com/your-actual-domain.com/g' laravel-api/.env
sed -i 's/api.yourdomain.com/api.your-actual-domain.com/g' laravel-api/.env
```

#### 2.2.4 Setup Next.js Environment
Buat file `.env.production`:
```bash
cat > .env.production << EOF
NEXT_PUBLIC_APP_URL=https://your-actual-domain.com
NEXTAUTH_URL=https://your-actual-domain.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_FINGERPRINT_ENABLED=true
NEXT_PUBLIC_FINGERPRINT_REALTIME=true
NEXT_PUBLIC_LARAVEL_API_URL=https://api.your-actual-domain.com
DATABASE_URL=postgresql://afms_user:afms_secure_password_2024@postgres:5432/afms_database
EOF
```

## Step 3: Setup SSL Certificate

### 3.1 Setup Nginx untuk Domain Verification
```bash
sudo tee /etc/nginx/sites-available/afms-temp << EOF
server {
    listen 80;
    server_name your-actual-domain.com api.your-actual-domain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/afms-temp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 3.2 Generate SSL Certificate
```bash
sudo certbot --nginx -d your-actual-domain.com -d api.your-actual-domain.com
```

### 3.3 Setup Nginx Production Config
```bash
sudo tee /etc/nginx/sites-available/afms-production << EOF
upstream docker_nginx {
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name your-actual-domain.com api.your-actual-domain.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-actual-domain.com api.your-actual-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-actual-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-actual-domain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://docker_nginx;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

sudo rm /etc/nginx/sites-enabled/afms-temp
sudo ln -s /etc/nginx/sites-available/afms-production /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Step 4: Deploy Application

### 4.1 Build dan Start Containers
```bash
cd /opt/afmsnextjs

# Build images
docker-compose build --no-cache

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 4.2 Setup Database
```bash
# Wait for database to be ready
sleep 30

# Run migrations
docker-compose exec laravel-api php artisan migrate --force

# Seed database (optional)
docker-compose exec laravel-api php artisan db:seed --force

# Clear and cache config
docker-compose exec laravel-api php artisan config:cache
docker-compose exec laravel-api php artisan route:cache
docker-compose exec laravel-api php artisan view:cache
```

## Step 5: Monitoring dan Maintenance

### 5.1 Setup Log Rotation
```bash
sudo tee /etc/logrotate.d/docker-afms << EOF
/opt/afmsnextjs/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF
```

### 5.2 Setup Systemd Service
```bash
sudo tee /etc/systemd/system/afms.service << EOF
[Unit]
Description=AFMS Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/afmsnextjs
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable afms.service
```

### 5.3 Setup Auto SSL Renewal
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx
```

## Step 6: Backup Strategy

### 6.1 Database Backup Script
```bash
sudo tee /opt/afmsnextjs/backup-db.sh << EOF
#!/bin/bash
BACKUP_DIR="/opt/afmsnextjs/backups"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR

# Backup PostgreSQL
docker-compose exec -T postgres pg_dump -U afms_user afms_database > \$BACKUP_DIR/db_\$DATE.sql

# Keep only last 7 days
find \$BACKUP_DIR -name "db_*.sql" -mtime +7 -delete

echo "Database backup completed: db_\$DATE.sql"
EOF

chmod +x /opt/afmsnextjs/backup-db.sh

# Setup daily backup
sudo crontab -e
# Add this line:
0 2 * * * /opt/afmsnextjs/backup-db.sh
```

## Step 7: Troubleshooting

### 7.1 Check Logs
```bash
# Application logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f nextjs
docker-compose logs -f laravel-api
docker-compose logs -f postgres
docker-compose logs -f redis

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 7.2 Common Issues

#### Database Connection Issues
```bash
# Check database status
docker-compose exec postgres pg_isready -U afms_user

# Reset database
docker-compose down
docker volume rm afmsnextjs_postgres_data
docker-compose up -d
```

#### SSL Issues
```bash
# Test SSL
sudo certbot certificates
sudo nginx -t

# Renew SSL
sudo certbot renew --dry-run
```

#### Performance Issues
```bash
# Check resource usage
docker stats

# Restart services
docker-compose restart

# Update and rebuild
git pull
docker-compose build --no-cache
docker-compose up -d
```

## Step 8: Security Checklist

- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] SSH key authentication enabled
- [ ] Regular security updates
- [ ] Strong database passwords
- [ ] SSL certificate auto-renewal
- [ ] Regular backups
- [ ] Log monitoring
- [ ] Rate limiting configured
- [ ] CORS properly configured

## Maintenance Commands

```bash
# Update application
cd /opt/afmsnextjs
git pull
docker-compose build --no-cache
docker-compose up -d

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Backup database
./backup-db.sh

# Check SSL status
sudo certbot certificates

# Monitor resources
docker stats
df -h
free -h
```

## Support

Jika mengalami masalah:
1. Periksa logs aplikasi dan Nginx
2. Pastikan semua environment variables sudah benar
3. Verifikasi SSL certificate masih valid
4. Check resource usage VPS
5. Restart services jika diperlukan

---

**Catatan Penting:**
- Ganti `your-actual-domain.com` dengan domain sebenarnya
- Pastikan DNS sudah pointing ke IP VPS
- Backup database secara berkala
- Monitor resource usage VPS
- Update security patches secara rutin