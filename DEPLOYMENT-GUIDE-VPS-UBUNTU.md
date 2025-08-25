# Panduan Deployment Next.js + Laravel API di VPS Ubuntu

## Overview
Panduan lengkap untuk deploy aplikasi Next.js frontend dan Laravel API backend di VPS Ubuntu dengan:
- Domain: `afms.my.id` (Frontend Next.js)
- Domain: `api.afms.my.id` (Backend Laravel API)
- SSL Certificate dengan Let's Encrypt
- Docker & Docker Compose
- Nginx sebagai Reverse Proxy

## Prerequisites
- VPS Ubuntu 20.04/22.04
- Domain sudah pointing ke IP VPS
- Root access atau sudo privileges

---

## Step 1: Persiapan Server

### 1.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Install Dependencies
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install nginx -y

# Install Certbot untuk SSL
sudo apt install certbot python3-certbot-nginx -y

# Install Git
sudo apt install git -y
```

### 1.3 Restart untuk apply Docker group
```bash
sudo reboot
```

---

## Step 2: Struktur Folder di VPS

### 2.1 Buat Struktur Folder
```bash
sudo mkdir -p /var/www/afms
cd /var/www/afms

# Struktur folder yang akan dibuat:
# /var/www/afms/
# ├── frontend/          # Next.js application
# ├── backend/           # Laravel API
# ├── nginx/             # Nginx configurations
# │   ├── conf.d/
# │   └── ssl/
# ├── scripts/           # Deployment scripts
# ├── docker-compose.yml # Docker orchestration
# └── .env               # Environment variables
```

### 2.2 Clone Repository
```bash
# Clone your repository
git clone https://github.com/youIlbasuttaqwa/afmsnextj.git .

# Atau upload files manual jika tidak menggunakan git
```

---

## Step 3: Konfigurasi Environment

### 3.1 Buat File Environment
```bash
# Buat .env untuk docker-compose
cp .env.example .env
```

### 3.2 Edit Environment Variables
```bash
nano .env
```

Isi dengan:
```env
# Database Configuration
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=afms_db
DB_USERNAME=afms_user
DB_PASSWORD=your_secure_password
MYSQL_ROOT_PASSWORD=your_root_password

# Application URLs
NEXT_PUBLIC_API_URL=https://api.afms.my.id
APP_URL=https://api.afms.my.id
FRONTEND_URL=https://afms.my.id

# Laravel Configuration
APP_NAME="AFMS API"
APP_ENV=production
APP_KEY=base64:your_app_key_here
APP_DEBUG=false

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Mail Configuration (optional)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_ENCRYPTION=tls
```

---

## Step 4: Docker Configuration

### 4.1 Dockerfile untuk Next.js (frontend/Dockerfile)
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
USER nextjs

# Expose port
EXPOSE 3000

# Set environment
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start application
CMD ["node", "server.js"]
```

### 4.2 Dockerfile untuk Laravel (backend/Dockerfile)
```dockerfile
# Base image dengan PHP 8.2
FROM php:8.2-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    mysql-client \
    nginx \
    supervisor

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_mysql mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files
COPY composer*.json ./

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy application code
COPY . .

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# Copy Nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Copy Supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose port
EXPOSE 80

# Start services
CMD ["/usr/local/bin/entrypoint.sh"]
```

### 4.3 Docker Compose Configuration
```yaml
version: '3.8'

services:
  # MySQL Database
  mysql:
    image: mysql:8.0
    container_name: afms_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_DATABASE}
      MYSQL_USER: ${DB_USERNAME}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema:/docker-entrypoint-initdb.d
    networks:
      - afms_network
    ports:
      - "3306:3306"

  # Laravel API Backend
  backend:
    build:
      context: ./laravel-api
      dockerfile: Dockerfile
    container_name: afms_backend
    restart: unless-stopped
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_DATABASE=${DB_DATABASE}
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
    volumes:
      - ./laravel-api:/var/www/html
      - backend_storage:/var/www/html/storage
    depends_on:
      - mysql
    networks:
      - afms_network
    ports:
      - "8000:80"

  # Next.js Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: afms_frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    networks:
      - afms_network
    ports:
      - "3000:3000"
    depends_on:
      - backend

  # Redis (optional, untuk caching)
  redis:
    image: redis:7-alpine
    container_name: afms_redis
    restart: unless-stopped
    networks:
      - afms_network
    ports:
      - "6379:6379"

volumes:
  mysql_data:
  backend_storage:

networks:
  afms_network:
    driver: bridge
```

---

## Step 5: Script Generate SSL

### 5.1 Buat Script generate-ssl.sh
```bash
#!/bin/bash

# Script untuk generate SSL certificate dengan Let's Encrypt
# Usage: ./generate-ssl.sh

set -e

# Colors untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function untuk print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Domains yang akan di-generate SSL
DOMAINS=("afms.my.id" "api.afms.my.id")
EMAIL="admin@afms.my.id"  # Ganti dengan email Anda

print_status "Starting SSL certificate generation..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_error "Certbot is not installed. Installing..."
    sudo apt update
    sudo apt install certbot python3-certbot-nginx -y
fi

# Stop nginx temporarily
print_status "Stopping Nginx temporarily..."
sudo systemctl stop nginx

# Generate certificates for each domain
for domain in "${DOMAINS[@]}"; do
    print_status "Generating SSL certificate for $domain..."
    
    # Check if certificate already exists
    if [ -d "/etc/letsencrypt/live/$domain" ]; then
        print_warning "Certificate for $domain already exists. Renewing..."
        sudo certbot renew --cert-name $domain
    else
        print_status "Creating new certificate for $domain..."
        sudo certbot certonly \
            --standalone \
            --email $EMAIL \
            --agree-tos \
            --no-eff-email \
            --domains $domain
    fi
    
    if [ $? -eq 0 ]; then
        print_status "SSL certificate for $domain generated successfully!"
    else
        print_error "Failed to generate SSL certificate for $domain"
        exit 1
    fi
done

# Create SSL directory in project
print_status "Creating SSL symlinks in project directory..."
sudo mkdir -p /var/www/afms/nginx/ssl

# Create symlinks to Let's Encrypt certificates
for domain in "${DOMAINS[@]}"; do
    if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
        sudo ln -sf "/etc/letsencrypt/live/$domain/fullchain.pem" "/var/www/afms/nginx/ssl/$domain.crt"
        sudo ln -sf "/etc/letsencrypt/live/$domain/privkey.pem" "/var/www/afms/nginx/ssl/$domain.key"
        print_status "SSL symlinks created for $domain"
    fi
done

# Set proper permissions
sudo chown -R www-data:www-data /var/www/afms/nginx/ssl
sudo chmod 644 /var/www/afms/nginx/ssl/*.crt
sudo chmod 600 /var/www/afms/nginx/ssl/*.key

# Start nginx
print_status "Starting Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Test nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid!"
    sudo systemctl reload nginx
else
    print_error "Nginx configuration has errors!"
    exit 1
fi

# Setup auto-renewal
print_status "Setting up SSL auto-renewal..."

# Create renewal script
sudo tee /etc/cron.d/certbot-renew > /dev/null <<EOF
# Renew SSL certificates twice daily
0 */12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

print_status "SSL certificate generation completed successfully!"
print_status "Certificates location: /etc/letsencrypt/live/"
print_status "Auto-renewal configured via cron"

# Display certificate info
print_status "Certificate information:"
for domain in "${DOMAINS[@]}"; do
    if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
        echo "\n=== $domain ==="
        sudo openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -text -noout | grep -E "Subject:|Not After"
    fi
done

print_status "SSL setup completed! You can now access:"
print_status "Frontend: https://afms.my.id"
print_status "API: https://api.afms.my.id"
```

---

## Step 6: Konfigurasi Nginx

### 6.1 Main Nginx Configuration (/etc/nginx/nginx.conf)
```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # MIME Types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging Settings
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Include server configurations
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### 6.2 Frontend Configuration (/etc/nginx/sites-available/afms.my.id)
```nginx
# Frontend Next.js Configuration
server {
    listen 80;
    server_name afms.my.id www.afms.my.id;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name afms.my.id www.afms.my.id;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/afms.my.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/afms.my.id/privkey.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/afms.my.id.access.log main;
    error_log /var/log/nginx/afms.my.id.error.log warn;
    
    # Client settings
    client_max_body_size 10M;
    
    # Proxy to Next.js application
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
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache static files
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Next.js specific paths
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### 6.3 Backend API Configuration (/etc/nginx/sites-available/api.afms.my.id)
```nginx
# Backend Laravel API Configuration
server {
    listen 80;
    server_name api.afms.my.id;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.afms.my.id;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.afms.my.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.afms.my.id/privkey.pem;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # CORS Headers (adjust origins as needed)
    add_header Access-Control-Allow-Origin "https://afms.my.id" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept, Origin, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials true always;
    
    # Logging
    access_log /var/log/nginx/api.afms.my.id.access.log main;
    error_log /var/log/nginx/api.afms.my.id.error.log warn;
    
    # Client settings
    client_max_body_size 50M;
    
    # Handle preflight requests
    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://afms.my.id";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, Accept, Origin, X-Requested-With";
            add_header Access-Control-Allow-Credentials true;
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain charset=UTF-8";
            add_header Content-Length 0;
            return 204;
        }
        
        # Rate limiting for API
        limit_req zone=api burst=20 nodelay;
        
        # Proxy to Laravel API
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Special rate limiting for login endpoint
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # File uploads
    location /api/upload {
        client_max_body_size 100M;
        
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for file uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ /(composer\.json|composer\.lock|\.env) {
        deny all;
    }
}
```

---

## Step 7: Deployment Scripts

### 7.1 Script Deploy Otomatis (deploy.sh)
```bash
#!/bin/bash

# Script deployment otomatis untuk AFMS
# Usage: ./deploy.sh [environment]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Configuration
PROJECT_DIR="/var/www/afms"
ENVIRONMENT=${1:-production}
BACKUP_DIR="/var/backups/afms"
DATE=$(date +"%Y%m%d_%H%M%S")

print_step "Starting deployment for environment: $ENVIRONMENT"

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root or with sudo"
   exit 1
fi

# Create backup directory
print_status "Creating backup directory..."
mkdir -p $BACKUP_DIR

# Backup current deployment
if [ -d "$PROJECT_DIR" ]; then
    print_status "Creating backup of current deployment..."
    tar -czf "$BACKUP_DIR/afms_backup_$DATE.tar.gz" -C "$PROJECT_DIR" .
fi

# Navigate to project directory
cd $PROJECT_DIR

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    print_status "Pulling latest changes from repository..."
    git pull origin main
else
    print_warning "Not a git repository. Skipping git pull."
fi

# Stop services
print_status "Stopping Docker services..."
docker-compose down

# Build and start services
print_status "Building and starting Docker services..."
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Run Laravel migrations and optimizations
print_status "Running Laravel migrations and optimizations..."
docker-compose exec -T backend php artisan migrate --force
docker-compose exec -T backend php artisan config:cache
docker-compose exec -T backend php artisan route:cache
docker-compose exec -T backend php artisan view:cache

# Test services
print_status "Testing services..."

# Test backend
if curl -f -s http://localhost:8000/health > /dev/null; then
    print_status "Backend service is healthy"
else
    print_error "Backend service is not responding"
    exit 1
fi

# Test frontend
if curl -f -s http://localhost:3000/health > /dev/null; then
    print_status "Frontend service is healthy"
else
    print_error "Frontend service is not responding"
    exit 1
fi

# Reload Nginx
print_status "Reloading Nginx configuration..."
nginx -t && systemctl reload nginx

# Test SSL certificates
print_status "Testing SSL certificates..."
for domain in "afms.my.id" "api.afms.my.id"; do
    if openssl s_client -connect $domain:443 -servername $domain < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        print_status "SSL certificate for $domain is valid"
    else
        print_warning "SSL certificate for $domain may have issues"
    fi
done

# Cleanup old backups (keep last 5)
print_status "Cleaning up old backups..."
ls -t $BACKUP_DIR/afms_backup_*.tar.gz | tail -n +6 | xargs -r rm

print_step "Deployment completed successfully!"
print_status "Frontend: https://afms.my.id"
print_status "API: https://api.afms.my.id"
print_status "Backup created: $BACKUP_DIR/afms_backup_$DATE.tar.gz"
```

---

## Step 8: Testing dan Maintenance

### 8.1 Script Testing (test-deployment.sh)
```bash
#!/bin/bash

# Script untuk testing deployment
# Usage: ./test-deployment.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_test() { echo -e "${BLUE}[TEST]${NC} $1"; }

ERROR_COUNT=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    print_test "$test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_status "$test_name - PASSED"
    else
        print_error "$test_name - FAILED"
        ((ERROR_COUNT++))
    fi
}

echo "=== AFMS Deployment Testing ==="
echo

# Test 1: Docker services
print_test "Checking Docker services..."
docker-compose ps
echo

# Test 2: Database connection
run_test "Database Connection" "docker-compose exec -T backend php artisan tinker --execute='DB::connection()->getPdo();'"

# Test 3: Backend health
run_test "Backend Health Check" "curl -f -s http://localhost:8000/health"

# Test 4: Frontend health
run_test "Frontend Health Check" "curl -f -s http://localhost:3000/health"

# Test 5: SSL certificates
run_test "SSL Certificate - afms.my.id" "openssl s_client -connect afms.my.id:443 -servername afms.my.id < /dev/null 2>/dev/null | grep -q 'Verify return code: 0'"
run_test "SSL Certificate - api.afms.my.id" "openssl s_client -connect api.afms.my.id:443 -servername api.afms.my.id < /dev/null 2>/dev/null | grep -q 'Verify return code: 0'"

# Test 6: Nginx configuration
run_test "Nginx Configuration" "nginx -t"

# Test 7: Domain accessibility
run_test "Frontend Domain Access" "curl -f -s -I https://afms.my.id | grep -q '200 OK'"
run_test "API Domain Access" "curl -f -s -I https://api.afms.my.id/health | grep -q '200 OK'"

# Test 8: API endpoints
run_test "API Test Endpoint" "curl -f -s https://api.afms.my.id/api/test | grep -q 'success'"

echo
echo "=== Test Summary ==="
if [ $ERROR_COUNT -eq 0 ]; then
    print_status "All tests passed! Deployment is healthy."
    exit 0
else
    print_error "$ERROR_COUNT test(s) failed. Please check the issues above."
    exit 1
fi
```

### 8.2 Commands untuk Maintenance

#### Cek Status SSL
```bash
# Cek expiry date SSL
sudo certbot certificates

# Cek SSL untuk domain tertentu
openssl s_client -connect afms.my.id:443 -servername afms.my.id < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Test SSL dengan curl
curl -I https://afms.my.id
curl -I https://api.afms.my.id
```

#### Reload Nginx
```bash
# Test konfigurasi Nginx
sudo nginx -t

# Reload Nginx (tanpa downtime)
sudo systemctl reload nginx

# Restart Nginx (dengan downtime)
sudo systemctl restart nginx

# Cek status Nginx
sudo systemctl status nginx
```

#### Test Akses Domain
```bash
# Test frontend
curl -I https://afms.my.id
wget --spider https://afms.my.id

# Test API
curl -I https://api.afms.my.id/health
curl https://api.afms.my.id/api/test

# Test dengan verbose output
curl -v https://afms.my.id
curl -v https://api.afms.my.id
```

#### Monitor Logs
```bash
# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/afms.my.id.access.log
sudo tail -f /var/log/nginx/api.afms.my.id.access.log

# Docker logs
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f mysql

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u docker -f
```

---

## Step 9: Troubleshooting

### 9.1 Common Issues

#### SSL Certificate Issues
```bash
# Renew SSL manually
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect afms.my.id:443 -servername afms.my.id
```

#### Docker Issues
```bash
# Restart all services
docker-compose down && docker-compose up -d

# Rebuild containers
docker-compose build --no-cache

# Check container status
docker-compose ps
docker-compose logs [service_name]

# Clean up Docker
docker system prune -a
```

#### Database Issues
```bash
# Access MySQL container
docker-compose exec mysql mysql -u root -p

# Run migrations
docker-compose exec backend php artisan migrate

# Reset database (DANGER!)
docker-compose exec backend php artisan migrate:fresh --seed
```

### 9.2 Performance Monitoring
```bash
# Check system resources
htop
df -h
free -h

# Check Docker resources
docker stats

# Check network connections
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

---

## Step 10: Security Checklist

### 10.1 Server Security
- [ ] UFW firewall configured
- [ ] SSH key-based authentication
- [ ] Regular security updates
- [ ] Non-root user for applications
- [ ] Fail2ban installed

### 10.2 Application Security
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured

### 10.3 SSL Security
- [ ] Strong SSL ciphers
- [ ] HSTS enabled
- [ ] Certificate auto-renewal
- [ ] SSL Labs A+ rating

---

## Kesimpulan

Dengan mengikuti panduan ini, Anda akan memiliki:

1. ✅ Aplikasi Next.js dan Laravel API yang berjalan di Docker
2. ✅ SSL certificate otomatis dengan Let's Encrypt
3. ✅ Nginx reverse proxy dengan konfigurasi optimal
4. ✅ Script otomatis untuk deployment dan maintenance
5. ✅ Monitoring dan testing tools
6. ✅ Security best practices

**Akses Aplikasi:**
- Frontend: https://afms.my.id
- API: https://api.afms.my.id

**File Penting:**
- `/var/www/afms/docker-compose.yml` - Docker orchestration
- `/etc/nginx/sites-available/` - Nginx configurations
- `/var/www/afms/scripts/` - Deployment scripts
- `/etc/letsencrypt/live/` - SSL certificates

Selamat! Aplikasi Anda sekarang sudah live di production dengan SSL dan konfigurasi yang optimal.