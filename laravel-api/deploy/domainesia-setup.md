# Deployment Guide untuk Cloud Domainesia

Panduan lengkap untuk deploy Laravel API backend ke cloud hosting Domainesia.

## Prerequisites

- Akun hosting Domainesia dengan PHP 8.1+
- Database MySQL
- Domain yang sudah dikonfigurasi
- SSL Certificate (Let's Encrypt atau premium)

## Step 1: Persiapan File

### 1.1 Compress Project
```bash
# Compress seluruh folder laravel-api
tar -czf laravel-api.tar.gz laravel-api/
```

### 1.2 Upload ke Server
- Login ke cPanel Domainesia
- Buka File Manager
- Upload `laravel-api.tar.gz` ke folder `public_html`
- Extract file

## Step 2: Konfigurasi Database

### 2.1 Buat Database
1. Login ke cPanel
2. Buka "MySQL Databases"
3. Buat database baru: `username_fingerprint_api`
4. Buat user database dengan password yang kuat
5. Assign user ke database dengan full privileges

### 2.2 Import Schema
```sql
-- Jalankan migrations atau import manual
-- File: database/migrations/*.php
```

## Step 3: Konfigurasi Environment

### 3.1 Setup .env File
```bash
# Copy dari .env.example
cp .env.example .env
```

### 3.2 Edit .env untuk Production
```env
# Application
APP_NAME="Fingerprint API"
APP_ENV=production
APP_KEY=base64:GENERATE_NEW_KEY
APP_DEBUG=false
APP_URL=https://yourdomain.com

# Database
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=username_fingerprint_api
DB_USERNAME=username_dbuser
DB_PASSWORD=your_secure_password

# Fingerprint Device
FINGERPRINT_DEVICE_IP=192.168.1.100
FINGERPRINT_DEVICE_PORT=4370
FINGERPRINT_DEVICE_USERNAME=admin
FINGERPRINT_DEVICE_PASSWORD=123456

# NextJS Integration
NEXTJS_API_URL=https://yourdomain.com/api
NEXTJS_API_TOKEN=your-secure-nextjs-token

# API Security
API_TOKEN=your-very-secure-api-token

# Mail (Optional)
MAIL_MAILER=smtp
MAIL_HOST=mail.yourdomain.com
MAIL_PORT=587
MAIL_USERNAME=noreply@yourdomain.com
MAIL_PASSWORD=your_email_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="Fingerprint API"

# Logging
LOG_CHANNEL=daily
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error
```

## Step 4: Konfigurasi Web Server

### 4.1 Apache .htaccess (public folder)
```apache
<IfModule mod_rewrite.c>
    <IfModule mod_negotiation.c>
        Options -MultiViews -Indexes
    </IfModule>

    RewriteEngine On

    # Handle Authorization Header
    RewriteCond %{HTTP:Authorization} .
    RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]

    # Redirect Trailing Slashes If Not A Folder...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_URI} (.+)/$
    RewriteRule ^ %1 [L,R=301]

    # Send Requests To Front Controller...
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [L]
</IfModule>
```

### 4.2 Nginx Configuration (jika menggunakan Nginx)
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    root /home/username/public_html/laravel-api/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
}
```

## Step 5: Permissions dan Security

### 5.1 Set File Permissions
```bash
# Set permissions
chmod -R 755 laravel-api/
chmod -R 775 laravel-api/storage
chmod -R 775 laravel-api/bootstrap/cache

# Set ownership (jika diperlukan)
chown -R username:username laravel-api/
```

### 5.2 Security Headers
Tambahkan di `.htaccess` atau server config:
```apache
# Security Headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
```

## Step 6: Optimasi Production

### 6.1 Laravel Optimizations
```bash
# Generate application key
php artisan key:generate

# Cache configurations
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
php artisan migrate --force

# Clear all caches
php artisan cache:clear
php artisan view:clear
php artisan config:clear
```

### 6.2 Composer Optimization
```bash
# Install production dependencies
composer install --optimize-autoloader --no-dev

# Generate optimized autoloader
composer dump-autoload --optimize
```

## Step 7: Monitoring dan Logging

### 7.1 Setup Log Rotation
```bash
# Add to crontab
0 0 * * * find /path/to/laravel-api/storage/logs -name "*.log" -mtime +30 -delete
```

### 7.2 Health Check Endpoint
Test endpoint: `https://yourdomain.com/api/health`

## Step 8: SSL Certificate

### 8.1 Let's Encrypt (Free)
```bash
# Install certbot (jika tersedia)
certbot --apache -d yourdomain.com -d www.yourdomain.com
```

### 8.2 Manual SSL
1. Upload certificate files ke server
2. Configure di cPanel SSL/TLS
3. Force HTTPS redirect

## Step 9: Backup Strategy

### 9.1 Database Backup
```bash
#!/bin/bash
# backup-db.sh
mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 9.2 File Backup
```bash
#!/bin/bash
# backup-files.sh
tar -czf backup_files_$(date +%Y%m%d_%H%M%S).tar.gz laravel-api/
```

## Step 10: Testing

### 10.1 API Endpoints Test
```bash
# Test health endpoint
curl https://yourdomain.com/api/health

# Test fingerprint endpoint
curl -X POST https://yourdomain.com/api/fingerprint/attendance \
  -H "Content-Type: application/json" \
  -H "X-API-Token: your-api-token" \
  -d '{"device_id":"test","device_user_id":"1","attendance_time":"2024-01-01 08:00:00","attendance_type":0}'
```

### 10.2 Performance Test
```bash
# Load testing dengan Apache Bench
ab -n 100 -c 10 https://yourdomain.com/api/health
```

## Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check file permissions
   - Check .env configuration
   - Check error logs

2. **Database Connection Error**
   - Verify database credentials
   - Check database server status
   - Test connection manually

3. **API Token Issues**
   - Verify API_TOKEN in .env
   - Check request headers
   - Test with curl

### Log Locations
- Laravel logs: `storage/logs/laravel.log`
- Apache logs: `/var/log/apache2/error.log`
- Nginx logs: `/var/log/nginx/error.log`

## Maintenance

### Regular Tasks
1. Update dependencies monthly
2. Monitor disk space
3. Check security updates
4. Review access logs
5. Test backup restoration

### Performance Monitoring
1. Setup uptime monitoring
2. Monitor response times
3. Track error rates
4. Monitor resource usage

## Support

Untuk bantuan deployment atau troubleshooting:
- Email: support@yourdomain.com
- Documentation: https://yourdomain.com/docs
- Status Page: https://status.yourdomain.com