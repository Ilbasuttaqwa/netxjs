#!/bin/bash

# =============================================================================
# Script Generate SSL Certificate untuk AFMS
# Menggunakan Let's Encrypt dengan Certbot
# =============================================================================

set -e  # Exit on any error

# Colors untuk output yang lebih menarik
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# Functions untuk Output
# =============================================================================

print_header() {
    echo -e "${PURPLE}=================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}=================================${NC}"
}

print_status() {
    echo -e "${GREEN}[✓ INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠ WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗ ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[→ STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[🎉 SUCCESS]${NC} $1"
}

# =============================================================================
# Configuration Variables
# =============================================================================

# Domain yang akan di-generate SSL certificate
DOMAINS=("afms.my.id" "api.afms.my.id")

# Email untuk registrasi Let's Encrypt (GANTI DENGAN EMAIL ANDA)
EMAIL="admin@afms.my.id"

# Directory paths
PROJECT_DIR="/var/www/afms"
SSL_DIR="$PROJECT_DIR/nginx/ssl"
LOG_FILE="/var/log/ssl-generation.log"

# Webroot path untuk domain verification
WEBROOT_PATH="/var/www/html"

# =============================================================================
# Pre-flight Checks
# =============================================================================

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
    
    # Check if domains are pointing to this server
    print_step "Checking domain DNS resolution..."
    for domain in "${DOMAINS[@]}"; do
        if ! nslookup $domain > /dev/null 2>&1; then
            print_warning "Domain $domain may not be properly configured in DNS"
        else
            print_status "Domain $domain DNS resolution OK"
        fi
    done
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        print_step "Installing Certbot..."
        apt update
        apt install certbot python3-certbot-nginx -y
        print_status "Certbot installed successfully"
    else
        print_status "Certbot is already installed"
    fi
    
    # Create necessary directories
    print_step "Creating SSL directories..."
    mkdir -p $SSL_DIR
    mkdir -p $WEBROOT_PATH
    mkdir -p $(dirname $LOG_FILE)
    
    print_status "Prerequisites check completed"
}

# =============================================================================
# SSL Certificate Generation
# =============================================================================

generate_ssl_certificates() {
    print_header "Generating SSL Certificates"
    
    # Stop nginx temporarily untuk standalone mode
    print_step "Stopping Nginx temporarily..."
    if systemctl is-active --quiet nginx; then
        systemctl stop nginx
        NGINX_WAS_RUNNING=true
    else
        NGINX_WAS_RUNNING=false
    fi
    
    # Generate certificates untuk setiap domain
    for domain in "${DOMAINS[@]}"; do
        print_step "Processing SSL certificate for $domain..."
        
        # Check if certificate already exists
        if [ -d "/etc/letsencrypt/live/$domain" ]; then
            print_warning "Certificate for $domain already exists"
            
            # Check expiry date
            EXPIRY_DATE=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$domain/fullchain.pem" | cut -d= -f2)
            EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
            CURRENT_EPOCH=$(date +%s)
            DAYS_UNTIL_EXPIRY=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
            
            if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
                print_warning "Certificate expires in $DAYS_UNTIL_EXPIRY days. Renewing..."
                certbot renew --cert-name $domain --force-renewal
            else
                print_status "Certificate for $domain is valid for $DAYS_UNTIL_EXPIRY more days"
                continue
            fi
        else
            print_step "Creating new certificate for $domain..."
            
            # Generate new certificate
            certbot certonly \
                --standalone \
                --email $EMAIL \
                --agree-tos \
                --no-eff-email \
                --domains $domain \
                --non-interactive \
                --expand \
                --keep-until-expiring \
                2>&1 | tee -a $LOG_FILE
        fi
        
        # Verify certificate generation
        if [ $? -eq 0 ] && [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
            print_success "SSL certificate for $domain generated successfully!"
        else
            print_error "Failed to generate SSL certificate for $domain"
            exit 1
        fi
    done
}

# =============================================================================
# Create SSL Symlinks
# =============================================================================

create_ssl_symlinks() {
    print_header "Creating SSL Symlinks"
    
    # Create symlinks untuk setiap domain
    for domain in "${DOMAINS[@]}"; do
        if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
            print_step "Creating symlinks for $domain..."
            
            # Remove existing symlinks if any
            rm -f "$SSL_DIR/$domain.crt"
            rm -f "$SSL_DIR/$domain.key"
            
            # Create new symlinks
            ln -sf "/etc/letsencrypt/live/$domain/fullchain.pem" "$SSL_DIR/$domain.crt"
            ln -sf "/etc/letsencrypt/live/$domain/privkey.pem" "$SSL_DIR/$domain.key"
            
            print_status "SSL symlinks created for $domain"
        else
            print_error "Certificate files not found for $domain"
            exit 1
        fi
    done
    
    # Set proper permissions
    print_step "Setting SSL file permissions..."
    chown -R www-data:www-data $SSL_DIR
    chmod 644 $SSL_DIR/*.crt
    chmod 600 $SSL_DIR/*.key
    
    print_status "SSL symlinks and permissions configured"
}

# =============================================================================
# Configure Auto-Renewal
# =============================================================================

setup_auto_renewal() {
    print_header "Setting Up Auto-Renewal"
    
    # Create renewal script
    RENEWAL_SCRIPT="/usr/local/bin/afms-ssl-renew.sh"
    
    print_step "Creating renewal script..."
    cat > $RENEWAL_SCRIPT << 'EOF'
#!/bin/bash
# AFMS SSL Auto-Renewal Script

LOG_FILE="/var/log/ssl-renewal.log"
echo "[$(date)] Starting SSL renewal check..." >> $LOG_FILE

# Renew certificates
certbot renew --quiet --post-hook "systemctl reload nginx" >> $LOG_FILE 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] SSL renewal completed successfully" >> $LOG_FILE
else
    echo "[$(date)] SSL renewal failed" >> $LOG_FILE
fi

# Update symlinks if needed
for domain in "afms.my.id" "api.afms.my.id"; do
    if [ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]; then
        ln -sf "/etc/letsencrypt/live/$domain/fullchain.pem" "/var/www/afms/nginx/ssl/$domain.crt"
        ln -sf "/etc/letsencrypt/live/$domain/privkey.pem" "/var/www/afms/nginx/ssl/$domain.key"
    fi
done

# Set permissions
chown -R www-data:www-data /var/www/afms/nginx/ssl
chmod 644 /var/www/afms/nginx/ssl/*.crt
chmod 600 /var/www/afms/nginx/ssl/*.key

echo "[$(date)] SSL renewal process completed" >> $LOG_FILE
EOF

    chmod +x $RENEWAL_SCRIPT
    
    # Setup cron job untuk auto-renewal
    print_step "Setting up cron job for auto-renewal..."
    
    # Remove existing cron job if any
    crontab -l 2>/dev/null | grep -v "afms-ssl-renew" | crontab -
    
    # Add new cron job (check twice daily)
    (crontab -l 2>/dev/null; echo "0 */12 * * * $RENEWAL_SCRIPT") | crontab -
    
    print_status "Auto-renewal configured to run twice daily"
}

# =============================================================================
# Start/Restart Services
# =============================================================================

restart_services() {
    print_header "Starting/Restarting Services"
    
    # Start nginx if it was running before
    if [ "$NGINX_WAS_RUNNING" = true ]; then
        print_step "Starting Nginx..."
        systemctl start nginx
        systemctl enable nginx
    fi
    
    # Test nginx configuration
    print_step "Testing Nginx configuration..."
    if nginx -t 2>/dev/null; then
        print_status "Nginx configuration is valid"
        systemctl reload nginx
    else
        print_error "Nginx configuration has errors!"
        nginx -t
        exit 1
    fi
    
    print_status "Services restarted successfully"
}

# =============================================================================
# Verification and Testing
# =============================================================================

verify_ssl_certificates() {
    print_header "Verifying SSL Certificates"
    
    for domain in "${DOMAINS[@]}"; do
        print_step "Verifying SSL certificate for $domain..."
        
        # Check certificate validity
        if openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -text -noout > /dev/null 2>&1; then
            # Get certificate info
            SUBJECT=$(openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -text -noout | grep "Subject:" | sed 's/.*CN = //')
            EXPIRY=$(openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -text -noout | grep "Not After" | sed 's/.*Not After : //')
            
            print_status "Certificate for $domain is valid"
            echo -e "  ${CYAN}Subject:${NC} $SUBJECT"
            echo -e "  ${CYAN}Expires:${NC} $EXPIRY"
            
            # Test HTTPS connection (if domain is accessible)
            if curl -s --connect-timeout 5 https://$domain > /dev/null 2>&1; then
                print_status "HTTPS connection to $domain is working"
            else
                print_warning "HTTPS connection to $domain failed (domain may not be accessible yet)"
            fi
        else
            print_error "Certificate for $domain is invalid or corrupted"
        fi
        
        echo
    done
}

# =============================================================================
# Display Summary
# =============================================================================

display_summary() {
    print_header "SSL Generation Summary"
    
    echo -e "${GREEN}✅ SSL certificates generated successfully!${NC}"
    echo
    echo -e "${CYAN}📁 Certificate locations:${NC}"
    echo -e "   Let's Encrypt: /etc/letsencrypt/live/"
    echo -e "   Project symlinks: $SSL_DIR"
    echo
    echo -e "${CYAN}🔄 Auto-renewal:${NC}"
    echo -e "   Cron job: Twice daily (00:00 and 12:00)"
    echo -e "   Renewal script: $RENEWAL_SCRIPT"
    echo -e "   Log file: /var/log/ssl-renewal.log"
    echo
    echo -e "${CYAN}🌐 Your applications:${NC}"
    echo -e "   Frontend: ${GREEN}https://afms.my.id${NC}"
    echo -e "   API: ${GREEN}https://api.afms.my.id${NC}"
    echo
    echo -e "${CYAN}📋 Next steps:${NC}"
    echo -e "   1. Update your Nginx configuration to use SSL"
    echo -e "   2. Test your applications"
    echo -e "   3. Monitor SSL renewal logs"
    echo
    echo -e "${YELLOW}💡 Useful commands:${NC}"
    echo -e "   Check certificates: ${CYAN}sudo certbot certificates${NC}"
    echo -e "   Test renewal: ${CYAN}sudo certbot renew --dry-run${NC}"
    echo -e "   Check SSL: ${CYAN}openssl s_client -connect afms.my.id:443${NC}"
    echo
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header "AFMS SSL Certificate Generator"
    echo -e "${CYAN}This script will generate SSL certificates for:${NC}"
    for domain in "${DOMAINS[@]}"; do
        echo -e "  • $domain"
    done
    echo
    
    # Confirm execution
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "SSL generation cancelled by user"
        exit 0
    fi
    
    # Execute all steps
    check_prerequisites
    generate_ssl_certificates
    create_ssl_symlinks
    setup_auto_renewal
    restart_services
    verify_ssl_certificates
    display_summary
    
    print_success "SSL certificate generation completed successfully!"
}

# =============================================================================
# Error Handling
# =============================================================================

# Trap errors and cleanup
trap 'print_error "An error occurred. Check $LOG_FILE for details."; exit 1' ERR

# Start logging
exec 1> >(tee -a $LOG_FILE)
exec 2> >(tee -a $LOG_FILE >&2)

# Run main function
main "$@"

# =============================================================================
# Usage Examples:
# 
# Basic usage:
#   sudo ./generate-ssl.sh
# 
# Check what would happen (dry run):
#   sudo certbot renew --dry-run
# 
# Manual renewal:
#   sudo certbot renew --force-renewal
# 
# Check certificate status:
#   sudo certbot certificates
# =============================================================================