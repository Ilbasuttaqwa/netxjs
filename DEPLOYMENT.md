# AFMS Production Deployment Guide

Panduan lengkap untuk deploy aplikasi AFMS (Attendance & Fingerprint Management System) ke VPS cloud.

## Prerequisites

### Server Requirements
- VPS dengan minimal 2GB RAM, 2 CPU cores
- Ubuntu 20.04 LTS atau lebih baru
- Domain name yang sudah dikonfigurasi (cvtigaputraperkasa.id)
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
sudo git clone https://github.com/your-username/netxjs.git
sudo chown -R $USER:$USER /opt/netxjs
cd /opt/netxjs
```

### 2.2 Environment Configuration

#### Update Production URLs
Edit `docker-compose.production.yml` dan ubah URL berikut:
```yaml
# Ganti localhost dengan domain production
- NEXT_PUBLIC_API_URL=https://api.cvtigaputraperkasa.id/api
- NEXT_PUBLIC_APP_URL=https://cvtigaputraperkasa.id
- NEXTAUTH_URL=https://cvtigaputraperkasa.id
- APP_URL=https://api.cvtigaputraperkasa.id
- CLOUD_SERVER_URL=https://api.cvtigaputraperkasa.id
```

#### Update Security Settings
```yaml
# Enable HTTPS security
- SECURE_COOKIES=true
- SAME_SITE_COOKIES=strict
- HTTPS_ONLY=true
```

### 2.3 SSL Certificate Setup

#### Option A: Automated SSL Setup (Recommended)
Use the provided deployment script that handles SSL certificate generation automatically:

```bash
# Make script executable
chmod +x deploy-ssl.sh

# Run SSL deployment
sudo ./deploy-ssl.sh
```

#### Option B: Manual SSL Setup (Alternative)
If you prefer manual setup:

```bash
# Create SSL directories
mkdir -p ssl/certs ssl/www ssl/private

# Start nginx for ACME challenge
docker-compose -f docker-compose.production.yml up -d nginx

# Generate SSL certificate using webroot method
docker run --rm \
    -v "$(pwd)/ssl/certs:/etc/letsencrypt" \
    -v "$(pwd)/ssl/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@cvtigaputraperkasa.id \
    --agree-tos \
    --no-eff-email \
    -d cvtigaputraperkasa.id \
    -d api.cvtigaputraperkasa.id

# Copy certificates
cp ssl/certs/live/cvtigaputraperkasa.id/fullchain.pem ssl/certs/cvtigaputraperkasa.id.crt
cp ssl/certs/live/cvtigaputraperkasa.id/privkey.pem ssl/certs/cvtigaputraperkasa.id.key
```

#### Option C: Self-Signed Certificate (Development)
```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./laravel-api/docker/cvtigaputraperkasa.id.key \
  -out ./laravel-api/docker/cvtigaputraperkasa.id.crt \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=AFMS/CN=cvtigaputraperkasa.id"
```

### 2.4 Build and Deploy
```bash
# Build images
docker-compose -f docker-compose.production.yml build --no-cache

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs -f
```

## Step 3: Database Setup

### 3.1 Run Migrations
```bash
# Laravel migrations
docker-compose -f docker-compose.production.yml exec laravel-api php artisan migrate --force

# Prisma migrations (if needed)
docker-compose -f docker-compose.production.yml exec nextjs npx prisma migrate deploy
```

### 3.2 Seed Initial Data
```bash
# Laravel seeders
docker-compose -f docker-compose.production.yml exec laravel-api php artisan db:seed --force

# Create admin user
docker-compose -f docker-compose.production.yml exec laravel-api php artisan make:admin
```

## Step 4: Domain Configuration

### 4.1 DNS Settings
Konfigurasi DNS records di domain provider:
```
Type    Name    Value               TTL
A       @       31.97.105.160       300
A       www     31.97.105.160       300
A       api     31.97.105.16        300
CNAME   *       cvtigaputraperkasa.id   300
```

### 4.2 Verify Domain
```bash
# Test domain resolution
nslookup cvtigaputraperkasa.id
nslookup api.cvtigaputraperkasa.id
nslookup www.cvtigaputraperkasa.id

# Test HTTP/HTTPS access
curl -I http://cvtigaputraperkasa.id
curl -I https://cvtigaputraperkasa.id
```

## Step 5: Monitoring & Maintenance

### 5.1 Health Checks
```bash
# Check all services
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs nginx
docker-compose -f docker-compose.production.yml logs laravel-api
docker-compose -f docker-compose.production.yml logs nextjs

# Check resource usage
docker stats
```

### 5.2 Backup Strategy
```bash
# Database backup
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U afms_user afms_database > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf afms_backup_$(date +%Y%m%d).tar.gz /opt/netxjs
```

### 5.3 SSL Certificate Renewal
```bash
# Auto-renewal with cron
echo "0 12 * * * /usr/bin/certbot renew --quiet && cd /opt/netxjs && docker-compose -f docker-compose.production.yml restart laravel-api" | sudo crontab -
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
docker-compose -f docker-compose.production.yml exec laravel-api php artisan config:cache
docker-compose -f docker-compose.production.yml exec laravel-api php artisan route:cache
docker-compose -f docker-compose.production.yml exec laravel-api php artisan view:cache
```

### 7.2 Database Optimization
```bash
# PostgreSQL tuning
docker-compose -f docker-compose.production.yml exec postgres psql -U afms_user -d afms_database -c "ANALYZE;"
```

## Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   docker-compose -f docker-compose.production.yml logs [service-name]
   docker-compose -f docker-compose.production.yml down && docker-compose -f docker-compose.production.yml up -d
   ```

2. **SSL Certificate errors**
   ```bash
   # Check certificate validity
   openssl x509 -in ./laravel-api/docker/cvtigaputraperkasa.id.crt -text -noout
   
   # Test SSL configuration
   docker-compose -f docker-compose.production.yml exec laravel-api nginx -t
   ```

3. **Database connection issues**
   ```bash
   # Check database connectivity
   docker-compose -f docker-compose.production.yml exec laravel-api php artisan tinker
   # In tinker: DB::connection()->getPdo();
   ```

4. **API not accessible**
   ```bash
   # Check nginx configuration
   docker-compose -f docker-compose.production.yml exec laravel-api cat /etc/nginx/conf.d/cvtigaputraperkasa.id.conf
   
   # Test API endpoint
   curl -I https://api.cvtigaputraperkasa.id/api/health
   ```

### Log Locations
- Nginx: `docker-compose -f docker-compose.production.yml logs laravel-api`
- Laravel: `docker-compose -f docker-compose.production.yml logs laravel-api`
- Next.js: `docker-compose -f docker-compose.production.yml logs nextjs`
- PostgreSQL: `docker-compose -f docker-compose.production.yml logs postgres`
- Redis: `docker-compose -f docker-compose.production.yml logs redis`

## Maintenance Commands

```bash
# Update application
cd /opt/netxjs
git pull origin main
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Clean up Docker
docker system prune -f
docker volume prune -f

# Restart services
docker-compose -f docker-compose.production.yml restart

# Scale services (if needed)
docker-compose -f docker-compose.production.yml up -d --scale nextjs=2
```

## Support

Untuk bantuan lebih lanjut:
- Check logs: `docker-compose -f docker-compose.production.yml logs -f`
- Monitor resources: `docker stats`
- Health checks: `curl https://cvtigaputraperkasa.id/api/health`

---

**Note**: Semua konfigurasi sudah disesuaikan untuk domain cvtigaputraperkasa.id dengan IP addresses:
- Main domain (cvtigaputraperkasa.id, www): 31.97.105.160
- API subdomain (api.cvtigaputraperkasa.id): 31.97.105.16

Pastikan untuk mengatur environment variables yang sesuai sebelum deployment.