#!/bin/bash

# Laravel API Deployment Script for Domainesia Cloud
# Author: System Administrator
# Version: 1.0

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Laravel Fingerprint API"
APP_DIR="/home/$(whoami)/public_html/laravel-api"
BACKUP_DIR="/home/$(whoami)/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check PHP version
    if ! command -v php &> /dev/null; then
        log_error "PHP is not installed"
        exit 1
    fi
    
    PHP_VERSION=$(php -r "echo PHP_VERSION;")
    log_info "PHP Version: $PHP_VERSION"
    
    # Check Composer
    if ! command -v composer &> /dev/null; then
        log_error "Composer is not installed"
        exit 1
    fi
    
    # Check MySQL
    if ! command -v mysql &> /dev/null; then
        log_warning "MySQL client not found, database operations may fail"
    fi
    
    log_success "Requirements check completed"
}

create_backup() {
    log_info "Creating backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup application files
    if [ -d "$APP_DIR" ]; then
        log_info "Backing up application files..."
        tar -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" -C "$(dirname $APP_DIR)" "$(basename $APP_DIR)"
        log_success "Application backup created: app_backup_$DATE.tar.gz"
    fi
    
    # Backup database
    if [ -f "$APP_DIR/.env" ]; then
        log_info "Backing up database..."
        
        # Extract database credentials from .env
        DB_HOST=$(grep DB_HOST "$APP_DIR/.env" | cut -d '=' -f2)
        DB_DATABASE=$(grep DB_DATABASE "$APP_DIR/.env" | cut -d '=' -f2)
        DB_USERNAME=$(grep DB_USERNAME "$APP_DIR/.env" | cut -d '=' -f2)
        DB_PASSWORD=$(grep DB_PASSWORD "$APP_DIR/.env" | cut -d '=' -f2)
        
        if [ ! -z "$DB_DATABASE" ]; then
            mysqldump -h"$DB_HOST" -u"$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" > "$BACKUP_DIR/db_backup_$DATE.sql"
            log_success "Database backup created: db_backup_$DATE.sql"
        fi
    fi
}

setup_environment() {
    log_info "Setting up environment..."
    
    cd "$APP_DIR"
    
    # Copy environment file if not exists
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_info "Created .env from .env.example"
        else
            log_error ".env.example not found"
            exit 1
        fi
    fi
    
    # Generate application key if not set
    if ! grep -q "APP_KEY=base64:" .env; then
        php artisan key:generate --force
        log_success "Application key generated"
    fi
    
    log_success "Environment setup completed"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$APP_DIR"
    
    # Install Composer dependencies
    composer install --optimize-autoloader --no-dev --no-interaction
    log_success "Composer dependencies installed"
    
    # Generate optimized autoloader
    composer dump-autoload --optimize
    log_success "Autoloader optimized"
}

run_migrations() {
    log_info "Running database migrations..."
    
    cd "$APP_DIR"
    
    # Run migrations
    php artisan migrate --force
    log_success "Database migrations completed"
}

optimize_application() {
    log_info "Optimizing application..."
    
    cd "$APP_DIR"
    
    # Clear all caches first
    php artisan cache:clear
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear
    
    # Cache configurations
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    
    log_success "Application optimization completed"
}

set_permissions() {
    log_info "Setting file permissions..."
    
    cd "$APP_DIR"
    
    # Set directory permissions
    find . -type d -exec chmod 755 {} \;
    
    # Set file permissions
    find . -type f -exec chmod 644 {} \;
    
    # Set writable permissions for storage and cache
    chmod -R 775 storage
    chmod -R 775 bootstrap/cache
    
    # Make artisan executable
    chmod +x artisan
    
    log_success "File permissions set"
}

setup_cron_jobs() {
    log_info "Setting up cron jobs..."
    
    # Create cron job for Laravel scheduler
    (crontab -l 2>/dev/null; echo "* * * * * cd $APP_DIR && php artisan schedule:run >> /dev/null 2>&1") | crontab -
    
    # Create cron job for log cleanup
    (crontab -l 2>/dev/null; echo "0 0 * * * find $APP_DIR/storage/logs -name '*.log' -mtime +30 -delete") | crontab -
    
    log_success "Cron jobs configured"
}

test_deployment() {
    log_info "Testing deployment..."
    
    cd "$APP_DIR"
    
    # Test artisan commands
    if php artisan --version > /dev/null 2>&1; then
        log_success "Artisan commands working"
    else
        log_error "Artisan commands failed"
        exit 1
    fi
    
    # Test database connection
    if php artisan migrate:status > /dev/null 2>&1; then
        log_success "Database connection working"
    else
        log_error "Database connection failed"
        exit 1
    fi
    
    # Test API health endpoint
    if [ -f "public/index.php" ]; then
        log_success "Application files are in place"
    else
        log_error "Application files missing"
        exit 1
    fi
    
    log_success "Deployment tests passed"
}

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Keep only last 7 days of backups
    find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
    find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete
    
    log_success "Old backups cleaned up"
}

show_deployment_info() {
    log_info "Deployment Information:"
    echo "================================"
    echo "Application: $APP_NAME"
    echo "Directory: $APP_DIR"
    echo "Date: $(date)"
    echo "PHP Version: $(php -r 'echo PHP_VERSION;')"
    echo "Laravel Version: $(cd $APP_DIR && php artisan --version)"
    echo "================================"
    
    log_info "Important URLs:"
    echo "- Health Check: /api/health"
    echo "- API Documentation: /api/docs"
    echo "- Fingerprint Endpoint: /api/fingerprint/attendance"
    
    log_info "Next Steps:"
    echo "1. Update your .env file with production settings"
    echo "2. Configure your web server (Apache/Nginx)"
    echo "3. Set up SSL certificate"
    echo "4. Test all API endpoints"
    echo "5. Configure monitoring and alerts"
}

# Main deployment process
main() {
    log_info "Starting deployment of $APP_NAME..."
    
    check_requirements
    create_backup
    setup_environment
    install_dependencies
    run_migrations
    optimize_application
    set_permissions
    setup_cron_jobs
    test_deployment
    cleanup_old_backups
    
    log_success "Deployment completed successfully!"
    show_deployment_info
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "backup")
        create_backup
        ;;
    "optimize")
        optimize_application
        ;;
    "test")
        test_deployment
        ;;
    "permissions")
        set_permissions
        ;;
    "help")
        echo "Usage: $0 [deploy|backup|optimize|test|permissions|help]"
        echo ""
        echo "Commands:"
        echo "  deploy      - Full deployment process (default)"
        echo "  backup      - Create backup only"
        echo "  optimize    - Optimize application only"
        echo "  test        - Test deployment only"
        echo "  permissions - Set file permissions only"
        echo "  help        - Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac