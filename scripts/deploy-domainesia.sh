#!/bin/bash

# AFMS Deployment Script untuk DomaiNesia Cloud VPS
# Author: AFMS Development Team
# Version: 1.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="afms"
APP_DIR="/var/www/$APP_NAME"
LARAVEL_DIR="$APP_DIR/laravel-api"
NEXTJS_DIR="$APP_DIR"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
PHP_VERSION="8.2"
NODE_VERSION="18"

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Script ini harus dijalankan sebagai root (gunakan sudo)"
        exit 1
    fi
}

check_os() {
    if [[ ! -f /etc/lsb-release ]] || ! grep -q "Ubuntu" /etc/lsb-release; then
        print_error "Script ini hanya mendukung Ubuntu"
        exit 1
    fi
    print_success "OS Ubuntu terdeteksi"
}

install_dependencies() {
    print_status "Menginstall dependencies sistem..."
    
    # Update sistem
    apt update && apt upgrade -y
    
    # Install essential packages
    apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    
    # Install Node.js
    print_status "Menginstall Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
    
    # Install PHP
    print_status "Menginstall PHP $PHP_VERSION..."
    add-apt-repository ppa:ondrej/php -y
    apt update
    apt install -y php${PHP_VERSION} php${PHP_VERSION}-fpm php${PHP_VERSION}-mysql php${PHP_VERSION}-pgsql \
        php${PHP_VERSION}-xml php${PHP_VERSION}-curl php${PHP_VERSION}-mbstring php${PHP_VERSION}-zip \
        php${PHP_VERSION}-gd php${PHP_VERSION}-bcmath php${PHP_VERSION}-intl php${PHP_VERSION}-soap \
        php${PHP_VERSION}-redis php${PHP_VERSION}-imagick
    
    # Install Composer
    print_status "Menginstall Composer..."
    curl -sS https://getcomposer.org/installer | php
    mv composer.phar /usr/local/bin/composer
    chmod +x /usr/local/bin/composer
    
    # Install Nginx
    print_status "Menginstall Nginx..."
    apt install -y nginx
    
    # Install MySQL
    print_status "Menginstall MySQL..."
    apt install -y mysql-server
    
    # Install PostgreSQL
    print_status "Menginstall PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    
    # Install Redis
    print_status "Menginstall Redis..."
    apt install -y redis-server
    
    # Install PM2
    print_status "Menginstall PM2..."
    npm install -g pm2
    
    # Install additional tools
    apt install -y htop iotop fail2ban ufw certbot python3-certbot-nginx
    
    print_success "Semua dependencies berhasil diinstall"
}

setup_firewall() {
    print_status "Mengkonfigurasi firewall..."
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw allow 3000  # Next.js development (optional)
    ufw --force enable
    
    print_success "Firewall dikonfigurasi"
}

setup_databases() {
    print_status "Mengkonfigurasi database..."
    
    # Secure MySQL installation
    print_warning "Silakan jalankan mysql_secure_installation secara manual setelah script selesai"
    
    # Setup PostgreSQL
    sudo -u postgres psql -c "CREATE DATABASE afms_nextjs;" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE USER afms_user WITH PASSWORD 'afms_secure_password_2024';" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE afms_nextjs TO afms_user;" 2>/dev/null || true
    
    # Setup MySQL
    mysql -e "CREATE DATABASE IF NOT EXISTS afms_laravel;" 2>/dev/null || true
    mysql -e "CREATE USER IF NOT EXISTS 'afms_laravel'@'localhost' IDENTIFIED BY 'afms_secure_password_2024';" 2>/dev/null || true
    mysql -e "GRANT ALL PRIVILEGES ON afms_laravel.* TO 'afms_laravel'@'localhost';" 2>/dev/null || true
    mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true
    
    print_success "Database dikonfigurasi"
}

clone_repository() {
    print_status "Mengclone repository..."
    
    if [[ -d $APP_DIR ]]; then
        print_warning "Direktori $APP_DIR sudah ada, melakukan backup..."
        mv $APP_DIR "${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Clone dari direktori lokal atau repository
    if [[ -n "${REPO_URL:-}" ]]; then
        git clone $REPO_URL $APP_DIR
    else
        print_warning "REPO_URL tidak diset, menggunakan direktori saat ini"
        cp -r "$(pwd)" $APP_DIR
    fi
    
    chown -R www-data:www-data $APP_DIR
    print_success "Repository berhasil diclone"
}

setup_laravel() {
    print_status "Mengkonfigurasi Laravel API..."
    
    cd $LARAVEL_DIR
    
    # Install dependencies
    sudo -u www-data composer install --optimize-autoloader --no-dev
    
    # Setup environment
    if [[ -f .env.production ]]; then
        cp .env.production .env
    else
        cp .env.example .env
    fi
    
    # Update database configuration
    sed -i "s/DB_DATABASE=.*/DB_DATABASE=afms_laravel/" .env
    sed -i "s/DB_USERNAME=.*/DB_USERNAME=afms_laravel/" .env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=afms_secure_password_2024/" .env
    
    # Generate application key
    sudo -u www-data php artisan key:generate
    
    # Cache configurations
    sudo -u www-data php artisan config:cache
    sudo -u www-data php artisan route:cache
    sudo -u www-data php artisan view:cache
    
    # Run migrations
    sudo -u www-data php artisan migrate --force
    sudo -u www-data php artisan db:seed --force
    
    # Set permissions
    chown -R www-data:www-data storage bootstrap/cache
    chmod -R 775 storage bootstrap/cache
    
    print_success "Laravel API dikonfigurasi"
}

setup_nextjs() {
    print_status "Mengkonfigurasi Next.js..."
    
    cd $NEXTJS_DIR
    
    # Install dependencies
    sudo -u www-data npm ci --only=production
    
    # Setup environment
    if [[ -f .env.production ]]; then
        cp .env.production .env.local
    else
        cp .env.example .env.local
    fi
    
    # Update database configuration
    sed -i "s/DATABASE_URL=.*/DATABASE_URL=\"postgresql:\/\/afms_user:afms_secure_password_2024@localhost:5432\/afms_nextjs\"/" .env.local
    
    # Generate Prisma client
    sudo -u www-data npx prisma generate
    
    # Run database migrations
    sudo -u www-data npx prisma migrate deploy
    
    # Build application
    sudo -u www-data npm run build
    
    # Setup PM2
    sudo -u www-data pm2 delete afms-nextjs 2>/dev/null || true
    sudo -u www-data pm2 start npm --name "afms-nextjs" -- start
    sudo -u www-data pm2 save
    
    # Setup PM2 startup
    pm2 startup systemd -u www-data --hp /var/www
    
    print_success "Next.js dikonfigurasi"
}

setup_nginx() {
    print_status "Mengkonfigurasi Nginx..."
    
    # Laravel API configuration
    cat > $NGINX_AVAILABLE/afms-api << EOF
server {
    listen 80;
    server_name api.\$DOMAIN;
    root $LARAVEL_DIR/public;
    index index.php;
    
    client_max_body_size 100M;
    
    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }
    
    location ~ \.php\$ {
        fastcgi_pass unix:/var/run/php/php${PHP_VERSION}-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_read_timeout 300;
    }
    
    location ~ /\.ht {
        deny all;
    }
    
    location ~ /\.(git|env) {
        deny all;
    }
}
EOF
    
    # Next.js configuration
    cat > $NGINX_AVAILABLE/afms-frontend << EOF
server {
    listen 80;
    server_name \$DOMAIN www.\$DOMAIN;
    
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
    }
}
EOF
    
    # Enable sites
    ln -sf $NGINX_AVAILABLE/afms-api $NGINX_ENABLED/
    ln -sf $NGINX_AVAILABLE/afms-frontend $NGINX_ENABLED/
    
    # Remove default site
    rm -f $NGINX_ENABLED/default
    
    # Test and reload Nginx
    nginx -t
    systemctl reload nginx
    
    print_success "Nginx dikonfigurasi"
}

setup_ssl() {
    if [[ -n "${DOMAIN:-}" ]]; then
        print_status "Mengkonfigurasi SSL untuk domain $DOMAIN..."
        
        # Generate SSL certificates
        certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        
        # Setup auto-renewal
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        
        print_success "SSL dikonfigurasi untuk $DOMAIN"
    else
        print_warning "Domain tidak diset, SSL tidak dikonfigurasi"
    fi
}

setup_monitoring() {
    print_status "Mengkonfigurasi monitoring dan backup..."
    
    # Setup log rotation
    cat > /etc/logrotate.d/afms << EOF
$LARAVEL_DIR/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0644 www-data www-data
}
EOF
    
    # Setup backup script
    cat > /usr/local/bin/backup-afms.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/afms"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup databases
pg_dump -U afms_user afms_nextjs > $BACKUP_DIR/nextjs_$DATE.sql
mysqldump -u afms_laravel -pafms_secure_password_2024 afms_laravel > $BACKUP_DIR/laravel_$DATE.sql

# Backup files
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/afms --exclude=/var/www/afms/node_modules

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF
    
    chmod +x /usr/local/bin/backup-afms.sh
    
    # Setup cron for daily backup
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-afms.sh") | crontab -
    
    print_success "Monitoring dan backup dikonfigurasi"
}

optimize_system() {
    print_status "Mengoptimasi sistem..."
    
    # PHP-FPM optimization
    sed -i 's/pm.max_children = .*/pm.max_children = 50/' /etc/php/${PHP_VERSION}/fpm/pool.d/www.conf
    sed -i 's/pm.start_servers = .*/pm.start_servers = 5/' /etc/php/${PHP_VERSION}/fpm/pool.d/www.conf
    sed -i 's/pm.min_spare_servers = .*/pm.min_spare_servers = 5/' /etc/php/${PHP_VERSION}/fpm/pool.d/www.conf
    sed -i 's/pm.max_spare_servers = .*/pm.max_spare_servers = 35/' /etc/php/${PHP_VERSION}/fpm/pool.d/www.conf
    
    # Restart services
    systemctl restart php${PHP_VERSION}-fpm
    systemctl restart nginx
    systemctl restart mysql
    systemctl restart postgresql
    systemctl restart redis-server
    
    print_success "Sistem dioptimasi"
}

print_summary() {
    print_success "\n=== DEPLOYMENT SELESAI ==="
    echo -e "${GREEN}Aplikasi AFMS berhasil dideploy di DomaiNesia Cloud VPS!${NC}\n"
    
    echo "Informasi Akses:"
    if [[ -n "${DOMAIN:-}" ]]; then
        echo "- Frontend: https://$DOMAIN"
        echo "- API: https://api.$DOMAIN"
    else
        echo "- Frontend: http://$(curl -s ifconfig.me):80"
        echo "- API: http://$(curl -s ifconfig.me):80/api"
    fi
    
    echo "\nDatabase Credentials:"
    echo "- PostgreSQL: afms_user / afms_secure_password_2024"
    echo "- MySQL: afms_laravel / afms_secure_password_2024"
    
    echo "\nNext Steps:"
    echo "1. Jalankan: mysql_secure_installation"
    echo "2. Update password database di file .env"
    echo "3. Setup domain DNS jika belum"
    echo "4. Monitor logs: pm2 logs afms-nextjs"
    echo "5. Check status: systemctl status nginx php${PHP_VERSION}-fpm mysql postgresql"
    
    print_warning "\nJangan lupa untuk mengubah password default database!"
}

# Main execution
main() {
    print_status "Memulai deployment AFMS di DomaiNesia Cloud VPS..."
    
    check_root
    check_os
    
    # Read domain if provided
    if [[ -n "${1:-}" ]]; then
        export DOMAIN="$1"
        print_status "Domain yang akan digunakan: $DOMAIN"
    fi
    
    install_dependencies
    setup_firewall
    setup_databases
    clone_repository
    setup_laravel
    setup_nextjs
    setup_nginx
    
    if [[ -n "${DOMAIN:-}" ]]; then
        setup_ssl
    fi
    
    setup_monitoring
    optimize_system
    
    print_summary
}

# Run main function with all arguments
main "$@"