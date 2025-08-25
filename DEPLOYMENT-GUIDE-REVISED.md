# AFMS Deployment Guide - Revised

## Overview
Panduan deployment untuk AFMS (Attendance & Financial Management System) setelah revisi konfigurasi untuk mengatasi masalah CORS dan URL.

## Perubahan Utama

### 1. Konfigurasi URL
- **Frontend**: `http://afms.my.id` (dari HTTPS ke HTTP)
- **Backend API**: `http://api.afms.my.id` (dari HTTPS ke HTTP)
- **Database**: PostgreSQL dengan konfigurasi yang dioptimasi
- **Cache**: Redis untuk session dan cache management

### 2. Konfigurasi CORS
- CORS headers dikonfigurasi untuk mendukung cross-origin requests
- `Access-Control-Allow-Origin: *` untuk development
- Support untuk `localhost:3000` dalam development

### 3. Environment Variables
```bash
# Frontend (Next.js)
NEXT_PUBLIC_API_URL=http://api.afms.my.id/api
NEXT_PUBLIC_APP_URL=http://afms.my.id
NEXTAUTH_URL=http://afms.my.id

# Backend (Laravel)
APP_URL=http://api.afms.my.id
CORS_ALLOWED_ORIGINS=http://afms.my.id,http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=afms.my.id,localhost:3000
```

## Prerequisites

### Server Requirements
- Ubuntu 20.04+ atau CentOS 8+
- Docker 20.10+
- Docker Compose 2.0+
- Nginx (untuk reverse proxy)
- Minimum 2GB RAM, 20GB storage

### Domain Setup
- Domain `afms.my.id` pointing ke server IP
- Subdomain `api.afms.my.id` pointing ke server IP
- DNS A records configured

## Deployment Steps

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Project Setup
```bash
# Clone repository
git clone https://github.com/yourusername/afmsnextj.git
cd afmsnextj

# Copy environment files
cp laravel-api/.env.example laravel-api/.env

# Edit environment variables
nano laravel-api/.env
```

### 3. Configuration Validation
```bash
# Validate Docker Compose configuration
docker-compose config

# Run configuration validation script
powershell -ExecutionPolicy Bypass -File validate-config.ps1
```

### 4. Build and Deploy
```bash
# Build and start containers
docker-compose up -d --build

# Check container status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Post-Deployment Verification
```bash
# Test frontend
curl -I http://202.155.95.3

# Test API health
curl -I http://202.155.95.3/api/kesehatan

# Check database connection
docker-compose exec laravel-api php artisan migrate:status
```

## Nginx Configuration

Nginx dikonfigurasi dengan:
- Rate limiting untuk API endpoints
- CORS headers untuk cross-origin requests
- Security headers (CSP, HSTS, etc.)
- Static file caching
- Gzip compression

## Monitoring & Maintenance

### Health Checks
- Frontend: `http://afms.my.id/health`
- API: `http://api.afms.my.id/health`
- Database: Built-in PostgreSQL health checks
- Redis: Built-in Redis health checks

### Log Management
```bash
# View application logs
docker-compose logs -f nextjs
docker-compose logs -f laravel-api
docker-compose logs -f nginx

# View system logs
sudo journalctl -u docker
```

### Backup Strategy
```bash
# Database backup
docker-compose exec postgres pg_dump -U afms_user afms_database > backup_$(date +%Y%m%d).sql

# Application files backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz /var/www/afms
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify CORS_ALLOWED_ORIGINS in .env
   - Check Nginx CORS headers
   - Ensure domains match exactly

2. **Database Connection Issues**
   - Check PostgreSQL container status
   - Verify database credentials
   - Check network connectivity

3. **Container Startup Issues**
   - Check Docker logs: `docker-compose logs`
   - Verify port availability
   - Check disk space and memory

### Useful Commands
```bash
# Restart specific service
docker-compose restart laravel-api

# Rebuild specific service
docker-compose up -d --build laravel-api

# Clean up unused resources
docker system prune -f

# Check resource usage
docker stats
```

## Security Considerations

- Environment variables properly secured
- Database credentials encrypted
- Rate limiting implemented
- Security headers configured
- Regular security updates

## Performance Optimization

- Redis caching enabled
- Nginx gzip compression
- Static file caching
- Database query optimization
- Container resource limits

## Support

Untuk bantuan teknis:
1. Check logs terlebih dahulu
2. Verify konfigurasi environment
3. Test connectivity antar services
4. Contact development team jika diperlukan

---

**Note**: Dokumentasi ini mencerminkan konfigurasi terbaru setelah revisi untuk mengatasi masalah CORS dan URL. Pastikan semua environment variables sudah dikonfigurasi dengan benar sebelum deployment.