# AFMS Production Deployment Guide

Panduan lengkap untuk deploy aplikasi AFMS (Attendance & Fingerprint Management System) ke VPS cloud.

## Prerequisites

### Server Requirements
- VPS dengan minimal 2GB RAM, 2 CPU cores
- Ubuntu 20.04 LTS atau lebih baru
- Domain name yang sudah dikonfigurasi (afms.my.id)
- Port 80, 443, dan 22 terbuka

### Software Requirements
- Docker Engine 20.10+
- Docker Compose v2.0+
- Git
- Nginx (optional, sudah termasuk dalam container)

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw
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

### 1.3 Configure Firewall
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## Step 2: Application Deployment

### 2.1 Clone Repository
```bash
cd /opt
sudo git clone https://github.com/your-username/afmsnextj.git
sudo chown -R $USER:$USER /opt/afmsnextj
cd /opt/afmsnextj
```

### 2.2 Environment Configuration

#### Update Production URLs
Edit `docker-compose.yml` dan ubah URL berikut:
```yaml
# Ganti localhost dengan domain production
- NEXT_PUBLIC_API_URL=https://api.afms.my.id/api
- NEXT_PUBLIC_APP_URL=https://afms.my.id
- NEXTAUTH_URL=https://afms.my.id
- APP_URL=https://api.afms.my.id
- CLOUD_SERVER_URL=https://api.afms.my.id
```

#### Update Security Settings
```yaml
# Enable HTTPS security
- SECURE_COOKIES=true
- SAME_SITE_COOKIES=strict
- HTTPS_ONLY=true
```

### 2.3 SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install -y certbot

# Stop any running containers
docker-compose down

# Obtain certificate
sudo certbot certonly --standalone -d afms.my.id -d www.afms.my.id

# Copy certificates to project
sudo cp /etc/letsencrypt/live/afms.my.id/fullchain.pem ./nginx/ssl/afms.my.id.crt
sudo cp /etc/letsencrypt/live/afms.my.id/privkey.pem ./nginx/ssl/afms.my.id.key
sudo chown $USER:$USER ./nginx/ssl/*
```

#### Option B: Self-Signed Certificate (Development)
```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./nginx/ssl/afms.my.id.key \
  -out ./nginx/ssl/afms.my.id.crt \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=AFMS/CN=afms.my.id"
```

### 2.4 Build and Deploy
```bash
# Build images
docker-compose build --no-cache

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

## Step 3: Database Setup

### 3.1 Run Migrations
```bash
# Laravel migrations
docker-compose exec laravel-api php artisan migrate --force

# Prisma migrations (if needed)
docker-compose exec nextjs npx prisma migrate deploy
```

### 3.2 Seed Initial Data
```bash
# Laravel seeders
docker-compose exec laravel-api php artisan db:seed --force

# Create admin user
docker-compose exec laravel-api php artisan make:admin
```

## Step 4: Domain Configuration

### 4.1 DNS Settings
Konfigurasi DNS records di domain provider:
```
Type    Name    Value               TTL
A       @       YOUR_SERVER_IP      300
A       www     YOUR_SERVER_IP      300
A       api     YOUR_SERVER_IP      300
CNAME   *       afms.my.id          300
```

### 4.2 Verify Domain
```bash
# Test domain resolution
nslookup afms.my.id
nslookup api.afms.my.id

# Test HTTP/HTTPS access
curl -I http://afms.my.id
curl -I https://afms.my.id
```

## Step 5: Monitoring & Maintenance

### 5.1 Health Checks
```bash
# Check all services
docker-compose ps

# Check logs
docker-compose logs nginx
docker-compose logs laravel-api
docker-compose logs nextjs

# Check resource usage
docker stats
```

### 5.2 Backup Strategy
```bash
# Database backup
docker-compose exec postgres pg_dump -U afms_user afms_database > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf afms_backup_$(date +%Y%m%d).tar.gz /opt/afmsnextj
```

### 5.3 SSL Certificate Renewal
```bash
# Auto-renewal with cron
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx" | sudo crontab -
```

## Step 6: Security Hardening

### 6.1 System Security
```bash
# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Install fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 6.2 Docker Security
```bash
# Limit container resources
# Add to docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

## Step 7: Performance Optimization

### 7.1 Enable Caching
```bash
# Laravel optimization
docker-compose exec laravel-api php artisan config:cache
docker-compose exec laravel-api php artisan route:cache
docker-compose exec laravel-api php artisan view:cache
```

### 7.2 Database Optimization
```bash
# PostgreSQL tuning
docker-compose exec postgres psql -U afms_user -d afms_database -c "ANALYZE;"
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker-compose logs [service-name]
   docker-compose down && docker-compose up -d
   ```

2. **SSL Certificate errors**
   ```bash
   # Check certificate validity
   openssl x509 -in ./nginx/ssl/afms.my.id.crt -text -noout
   
   # Test SSL configuration
   docker-compose exec nginx nginx -t
   ```

3. **Database connection issues**
   ```bash
   # Check database connectivity
   docker-compose exec laravel-api php artisan tinker
   # In tinker: DB::connection()->getPdo();
   ```

4. **API not accessible**
   ```bash
   # Check nginx configuration
   docker-compose exec nginx cat /etc/nginx/conf.d/afms.my.id.conf
   
   # Test API endpoint
   curl -I https://api.afms.my.id/api/health
   ```

### Log Locations
- Nginx: `docker-compose logs nginx`
- Laravel: `docker-compose logs laravel-api`
- Next.js: `docker-compose logs nextjs`
- PostgreSQL: `docker-compose logs postgres`
- Redis: `docker-compose logs redis`

## Maintenance Commands

```bash
# Update application
cd /opt/afmsnextj
git pull origin main
docker-compose build --no-cache
docker-compose up -d

# Clean up Docker
docker system prune -f
docker volume prune -f

# Restart services
docker-compose restart

# Scale services (if needed)
docker-compose up -d --scale nextjs=2
```

## Support

Untuk bantuan lebih lanjut:
- Check logs: `docker-compose logs -f`
- Monitor resources: `docker stats`
- Health checks: `curl https://afms.my.id/health`

---

**Note**: Pastikan untuk mengganti semua placeholder (YOUR_SERVER_IP, domain, passwords) dengan nilai yang sesuai untuk environment production Anda.