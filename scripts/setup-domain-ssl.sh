#!/bin/bash

# AFMS Domain & SSL Setup Script untuk DomaiNesia
# Script ini mengkonfigurasi domain dan SSL certificate untuk deployment production

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

validate_domain() {
    local domain=$1
    if [[ ! $domain =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
        print_error "Format domain tidak valid: $domain"
        exit 1
    fi
}

check_dns() {
    local domain=$1
    local server_ip=$(curl -s ifconfig.me)
    
    print_status "Memeriksa DNS untuk domain $domain..."
    
    # Check A record
    local domain_ip=$(dig +short $domain @8.8.8.8)
    if [[ "$domain_ip" == "$server_ip" ]]; then
        print_success "DNS A record untuk $domain sudah benar ($server_ip)"
    else
        print_warning "DNS A record untuk $domain belum mengarah ke server ini"
        print_warning "Domain IP: $domain_ip, Server IP: $server_ip"
        print_warning "Pastikan DNS sudah dikonfigurasi dengan benar sebelum melanjutkan"
        
        read -p "Lanjutkan setup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check www subdomain
    local www_ip=$(dig +short www.$domain @8.8.8.8)
    if [[ "$www_ip" == "$server_ip" ]]; then
        print_success "DNS A record untuk www.$domain sudah benar"
    else
        print_warning "DNS A record untuk www.$domain belum dikonfigurasi"
    fi
    
    # Check api subdomain
    local api_ip=$(dig +short api.$domain @8.8.8.8)
    if [[ "$api_ip" == "$server_ip" ]]; then
        print_success "DNS A record untuk api.$domain sudah benar"
    else
        print_warning "DNS A record untuk api.$domain belum dikonfigurasi"
    fi
}

update_nginx_config() {
    local domain=$1
    
    print_status "Mengupdate konfigurasi Nginx untuk domain $domain..."
    
    # Update frontend config
    sed -i "s/\$DOMAIN/$domain/g" /etc/nginx/sites-available/afms-frontend
    
    # Update API config
    sed -i "s/\$DOMAIN/$domain/g" /etc/nginx/sites-available/afms-api
    
    # Test nginx configuration
    nginx -t
    if [[ $? -eq 0 ]]; then
        systemctl reload nginx
        print_success "Konfigurasi Nginx berhasil diupdate"
    else
        print_error "Error dalam konfigurasi Nginx"
        exit 1
    fi
}

update_environment_files() {
    local domain=$1
    
    print_status "Mengupdate file environment untuk domain $domain..."
    
    # Update Next.js environment
    if [[ -f /var/www/afms/.env.local ]]; then
        sed -i "s/yourdomain\.com/$domain/g" /var/www/afms/.env.local
        sed -i "s/NEXT_PUBLIC_APP_URL=.*/NEXT_PUBLIC_APP_URL=\"https:\/\/$domain\"/" /var/www/afms/.env.local
        sed -i "s/NEXT_PUBLIC_API_URL=.*/NEXT_PUBLIC_API_URL=\"https:\/\/api.$domain\"/" /var/www/afms/.env.local
        sed -i "s/NEXTAUTH_URL=.*/NEXTAUTH_URL=\"https:\/\/$domain\"/" /var/www/afms/.env.local
        print_success "File .env.local Next.js berhasil diupdate"
    fi
    
    # Update Laravel environment
    if [[ -f /var/www/afms/laravel-api/.env ]]; then
        sed -i "s/yourdomain\.com/$domain/g" /var/www/afms/laravel-api/.env
        sed -i "s/APP_URL=.*/APP_URL=\"https:\/\/api.$domain\"/" /var/www/afms/laravel-api/.env
        sed -i "s/FRONTEND_URL=.*/FRONTEND_URL=\"https:\/\/$domain\"/" /var/www/afms/laravel-api/.env
        sed -i "s/CORS_ALLOWED_ORIGINS=.*/CORS_ALLOWED_ORIGINS=\"https:\/\/$domain\"/" /var/www/afms/laravel-api/.env
        sed -i "s/SANCTUM_STATEFUL_DOMAINS=.*/SANCTUM_STATEFUL_DOMAINS=\"$domain,www.$domain\"/" /var/www/afms/laravel-api/.env
        sed -i "s/SESSION_DOMAIN=.*/SESSION_DOMAIN=\".$domain\"/" /var/www/afms/laravel-api/.env
        
        # Clear Laravel cache
        cd /var/www/afms/laravel-api
        sudo -u www-data php artisan config:clear
        sudo -u www-data php artisan cache:clear
        sudo -u www-data php artisan config:cache
        
        print_success "File .env Laravel berhasil diupdate"
    fi
}

setup_ssl_certificate() {
    local domain=$1
    local email=$2
    
    print_status "Mengsetup SSL certificate untuk $domain..."
    
    # Install certbot if not already installed
    if ! command -v certbot &> /dev/null; then
        print_status "Menginstall Certbot..."
        apt update
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Generate SSL certificate
    certbot --nginx \
        -d $domain \
        -d www.$domain \
        -d api.$domain \
        --non-interactive \
        --agree-tos \
        --email $email \
        --redirect
    
    if [[ $? -eq 0 ]]; then
        print_success "SSL certificate berhasil disetup untuk $domain"
        
        # Setup auto-renewal
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
        print_success "Auto-renewal SSL certificate berhasil dikonfigurasi"
    else
        print_error "Gagal mengsetup SSL certificate"
        exit 1
    fi
}

test_ssl_certificate() {
    local domain=$1
    
    print_status "Testing SSL certificate..."
    
    # Test main domain
    if curl -s -I https://$domain | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
        print_success "SSL certificate untuk $domain berfungsi dengan baik"
    else
        print_warning "SSL certificate untuk $domain mungkin belum aktif"
    fi
    
    # Test API subdomain
    if curl -s -I https://api.$domain | grep -q "HTTP/2 200\|HTTP/1.1 200"; then
        print_success "SSL certificate untuk api.$domain berfungsi dengan baik"
    else
        print_warning "SSL certificate untuk api.$domain mungkin belum aktif"
    fi
}

restart_services() {
    print_status "Merestart services..."
    
    # Restart PHP-FPM
    systemctl restart php8.2-fpm
    
    # Restart Nginx
    systemctl restart nginx
    
    # Restart PM2 processes
    sudo -u www-data pm2 restart afms-nextjs
    
    print_success "Semua services berhasil direstart"
}

setup_security_headers() {
    local domain=$1
    
    print_status "Mengkonfigurasi security headers..."
    
    # Create security configuration
    cat > /etc/nginx/snippets/security-headers.conf << EOF
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Hide Nginx version
server_tokens off;
EOF
    
    # Include security headers in site configs
    sed -i '/server_name/a\    include /etc/nginx/snippets/security-headers.conf;' /etc/nginx/sites-available/afms-frontend
    sed -i '/server_name/a\    include /etc/nginx/snippets/security-headers.conf;' /etc/nginx/sites-available/afms-api
    
    print_success "Security headers berhasil dikonfigurasi"
}

setup_monitoring() {
    local domain=$1
    
    print_status "Mengsetup monitoring untuk $domain..."
    
    # Create monitoring script
    cat > /usr/local/bin/monitor-afms.sh << EOF
#!/bin/bash

# AFMS Monitoring Script
DOMAIN="$domain"
LOG_FILE="/var/log/afms-monitor.log"
EMAIL="admin@$domain"

# Function to log with timestamp
log_message() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" >> \$LOG_FILE
}

# Check website availability
check_website() {
    if curl -s -f https://\$DOMAIN > /dev/null; then
        log_message "Website \$DOMAIN is UP"
    else
        log_message "ERROR: Website \$DOMAIN is DOWN"
        # Send alert email (configure mail server first)
        # echo "Website \$DOMAIN is down" | mail -s "AFMS Alert" \$EMAIL
    fi
}

# Check API availability
check_api() {
    if curl -s -f https://api.\$DOMAIN/health > /dev/null; then
        log_message "API api.\$DOMAIN is UP"
    else
        log_message "ERROR: API api.\$DOMAIN is DOWN"
        # Send alert email
        # echo "API api.\$DOMAIN is down" | mail -s "AFMS API Alert" \$EMAIL
    fi
}

# Check SSL certificate expiry
check_ssl() {
    EXPIRY_DATE=\$(echo | openssl s_client -servername \$DOMAIN -connect \$DOMAIN:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
    EXPIRY_TIMESTAMP=\$(date -d "\$EXPIRY_DATE" +%s)
    CURRENT_TIMESTAMP=\$(date +%s)
    DAYS_UNTIL_EXPIRY=\$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
    
    if [ \$DAYS_UNTIL_EXPIRY -lt 30 ]; then
        log_message "WARNING: SSL certificate for \$DOMAIN expires in \$DAYS_UNTIL_EXPIRY days"
        # Send alert email
        # echo "SSL certificate for \$DOMAIN expires in \$DAYS_UNTIL_EXPIRY days" | mail -s "SSL Expiry Alert" \$EMAIL
    else
        log_message "SSL certificate for \$DOMAIN is valid (expires in \$DAYS_UNTIL_EXPIRY days)"
    fi
}

# Run checks
check_website
check_api
check_ssl
EOF
    
    chmod +x /usr/local/bin/monitor-afms.sh
    
    # Setup cron for monitoring (every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-afms.sh") | crontab -
    
    print_success "Monitoring berhasil dikonfigurasi"
}

print_summary() {
    local domain=$1
    
    print_success "\n=== DOMAIN & SSL SETUP SELESAI ==="
    echo -e "${GREEN}Domain dan SSL berhasil dikonfigurasi!${NC}\n"
    
    echo "Informasi Domain:"
    echo "- Main Site: https://$domain"
    echo "- WWW Site: https://www.$domain"
    echo "- API: https://api.$domain"
    
    echo "\nSSL Certificate:"
    echo "- Provider: Let's Encrypt"
    echo "- Auto-renewal: Enabled"
    echo "- Security Headers: Enabled"
    
    echo "\nMonitoring:"
    echo "- Health Check: Every 5 minutes"
    echo "- SSL Expiry Check: Daily"
    echo "- Log File: /var/log/afms-monitor.log"
    
    echo "\nNext Steps:"
    echo "1. Test semua URL di browser"
    echo "2. Verifikasi SSL certificate dengan SSL checker online"
    echo "3. Setup email notifications untuk monitoring"
    echo "4. Update DNS TTL jika diperlukan"
    echo "5. Test performance dengan tools seperti GTmetrix"
    
    print_warning "\nPastikan untuk membackup konfigurasi Nginx dan SSL certificates!"
}

# Main function
main() {
    print_status "AFMS Domain & SSL Setup untuk DomaiNesia"
    
    # Check if running as root
    check_root
    
    # Get domain from argument or prompt
    if [[ -n "${1:-}" ]]; then
        DOMAIN="$1"
    else
        read -p "Masukkan domain Anda (contoh: example.com): " DOMAIN
    fi
    
    # Get email from argument or prompt
    if [[ -n "${2:-}" ]]; then
        EMAIL="$2"
    else
        read -p "Masukkan email untuk SSL certificate: " EMAIL
    fi
    
    # Validate inputs
    validate_domain "$DOMAIN"
    
    if [[ ! $EMAIL =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        print_error "Format email tidak valid: $EMAIL"
        exit 1
    fi
    
    print_status "Domain: $DOMAIN"
    print_status "Email: $EMAIL"
    
    # Confirm before proceeding
    read -p "Lanjutkan setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Setup dibatalkan"
        exit 0
    fi
    
    # Run setup steps
    check_dns "$DOMAIN"
    update_nginx_config "$DOMAIN"
    update_environment_files "$DOMAIN"
    setup_ssl_certificate "$DOMAIN" "$EMAIL"
    setup_security_headers "$DOMAIN"
    restart_services
    test_ssl_certificate "$DOMAIN"
    setup_monitoring "$DOMAIN"
    
    print_summary "$DOMAIN"
}

# Run main function with arguments
main "$@"