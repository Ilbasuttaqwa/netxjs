# AFMS Production Deployment Guide

## 📋 Overview

Panduan lengkap untuk deployment AFMS (Attendance & Fingerprint Management System) ke production environment. Sistem ini terdiri dari:

- **Next.js Frontend** - UI/UX dan dashboard
- **Laravel API Backend** - Integrasi fingerprint device dan data processing
- **PostgreSQL** - Database untuk Next.js
- **MySQL** - Database untuk Laravel API
- **Redis** - Caching dan session storage

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App  │────│   Laravel API   │────│ Fingerprint     │
│   (Frontend)    │    │   (Backend)     │    │ Devices         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     MySQL       │
│   (Main DB)     │    │   (API DB)      │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┘
                    │
            ┌─────────────────┐
            │     Redis       │
            │   (Cache)       │
            └─────────────────┘
```

## 🚀 Deployment Options

### Option 1: Vercel + VPS (Recommended)
- **Next.js**: Deploy to Vercel
- **Laravel API**: Deploy to VPS (DigitalOcean, AWS EC2, etc.)
- **Databases**: Managed services (PlanetScale, AWS RDS, etc.)

### Option 2: Docker Containers
- **All services**: Docker containers with docker-compose
- **Orchestration**: Docker Swarm or Kubernetes

### Option 3: Traditional VPS
- **All services**: Single or multiple VPS instances
- **Web server**: Nginx reverse proxy

## 📦 Pre-deployment Checklist

### ✅ Environment Setup
- [ ] Production environment variables configured
- [ ] SSL certificates obtained
- [ ] Domain names configured
- [ ] Database servers provisioned
- [ ] Redis server setup

### ✅ Security
- [ ] Strong passwords for all services
- [ ] JWT secrets generated
- [ ] API tokens configured
- [ ] Firewall rules configured
- [ ] CORS settings updated

### ✅ Performance
- [ ] Database indexes optimized
- [ ] Caching strategies implemented
- [ ] CDN configured (if needed)
- [ ] Image optimization enabled

## 🔧 Step-by-Step Deployment

### Step 1: Database Setup

#### PostgreSQL (Next.js)
```bash
# Create database
psql -U postgres -c "CREATE DATABASE afms_db;"

# Run migrations
cd /path/to/nextjs
npx prisma migrate deploy
npx prisma generate
```

#### MySQL (Laravel API)
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE afms_laravel_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
cd /path/to/laravel-api
php artisan migrate --force
php artisan db:seed --force
```

### Step 2: Laravel API Deployment

#### Environment Configuration
```bash
# Copy production environment
cp .env.production .env

# Generate application key
php artisan key:generate --force

# Install dependencies
composer install --no-dev --optimize-autoloader

# Cache configurations
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set permissions
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /var/www/laravel-api/public;
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

### Step 3: Next.js Deployment to Vercel

#### Vercel Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "next.config.js",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "LARAVEL_API_URL": "@laravel_api_url"
  },
  "functions": {
    "pages/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

#### Environment Variables (Vercel)
```bash
# Add to Vercel dashboard or use CLI
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add NEXTAUTH_SECRET
vercel env add LARAVEL_API_URL
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
```

### Step 4: Docker Deployment (Alternative)

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Scale services if needed
docker-compose up -d --scale nextjs=2
```

## 🔒 Security Configuration

### SSL/TLS Setup
```bash
# Using Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3306/tcp  # MySQL (restrict to app servers)
sudo ufw allow 5432/tcp  # PostgreSQL (restrict to app servers)
sudo ufw enable
```

### Environment Security
```bash
# Secure file permissions
chmod 600 .env .env.production
chown root:root .env .env.production

# Disable debug mode
APP_DEBUG=false
NODE_ENV=production
```

## 📊 Monitoring & Logging

### Application Monitoring
```bash
# Laravel API logs
tail -f /var/www/laravel-api/storage/logs/laravel.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System monitoring
htop
df -h
free -m
```

### Health Checks
```bash
# Laravel API health
curl https://api.yourdomain.com/api/health

# Next.js health
curl https://yourdomain.com/api/health

# Database connections
php artisan tinker
>>> DB::connection()->getPdo();
```

## 🔄 Backup Strategy

### Automated Backups
```bash
# Add to crontab
0 2 * * * /path/to/scripts/backup-databases.sh
0 3 * * 0 /path/to/scripts/backup-files.sh
```

### Backup Script
```bash
#!/bin/bash
# Database backup
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql
pg_dump database > backup_postgres_$(date +%Y%m%d).sql

# File backup
tar -czf files_backup_$(date +%Y%m%d).tar.gz /var/www/

# Upload to cloud storage
aws s3 cp backup_$(date +%Y%m%d).sql s3://your-backup-bucket/
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
sudo systemctl status mysql
sudo systemctl status postgresql

# Test connections
mysql -u user -p -h host database
psql -U user -h host database
```

#### Permission Issues
```bash
# Fix Laravel permissions
sudo chown -R www-data:www-data /var/www/laravel-api
sudo chmod -R 755 /var/www/laravel-api/storage
sudo chmod -R 755 /var/www/laravel-api/bootstrap/cache
```

#### Memory Issues
```bash
# Check memory usage
free -m
ps aux --sort=-%mem | head

# Optimize PHP memory
echo "memory_limit = 512M" >> /etc/php/8.2/fpm/php.ini
sudo systemctl restart php8.2-fpm
```

### Performance Optimization

#### Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_attendance_time ON fingerprint_attendances(attendance_time);
CREATE INDEX idx_user_device ON users(device_user_id);
```

#### Caching
```bash
# Redis optimization
echo "maxmemory 256mb" >> /etc/redis/redis.conf
echo "maxmemory-policy allkeys-lru" >> /etc/redis/redis.conf
sudo systemctl restart redis
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer (Nginx, HAProxy)
- Multiple application instances
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching layers
- Use queue workers for heavy tasks

## 💰 Cost Estimation

### Monthly Costs (USD)

#### Option 1: Vercel + VPS
- Vercel Pro: $20
- VPS (2GB RAM): $10-20
- Managed Database: $15-30
- **Total: $45-70/month**

#### Option 2: Full VPS
- VPS (4GB RAM): $20-40
- Domain + SSL: $15
- Backup storage: $5
- **Total: $40-60/month**

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Weekly security updates
- [ ] Monthly performance review
- [ ] Quarterly backup testing
- [ ] Annual security audit

### Emergency Contacts
- System Administrator: [contact]
- Database Administrator: [contact]
- Development Team: [contact]

---

## 🎯 Quick Start Commands

```bash
# Clone and setup
git clone [repository]
cd afmsnextjs

# Setup databases
./scripts/setup-database.sh

# Deploy Laravel API
cd laravel-api
./deploy.sh

# Deploy Next.js to Vercel
vercel --prod

# Or use Docker
docker-compose up -d
```

**🎉 Your AFMS system is now ready for production!**