#!/bin/bash

# AFMS Production Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: production, staging (default: production)

set -e

ENVIRONMENT=${1:-production}
PROJECT_DIR="/opt/afmsnextj"
BACKUP_DIR="/opt/backups/afms"
DATE=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting AFMS deployment for $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    if ! command_exists git; then
        print_error "Git is not installed"
        exit 1
    fi
    
    print_success "All prerequisites are met"
}

# Create backup
create_backup() {
    print_status "Creating backup..."
    
    # Create backup directory
    sudo mkdir -p $BACKUP_DIR
    
    # Backup database
    if docker-compose ps | grep -q postgres; then
        print_status "Backing up database..."
        docker-compose exec -T postgres pg_dump -U afms_user afms_database > "$BACKUP_DIR/database_$DATE.sql"
        print_success "Database backup created: $BACKUP_DIR/database_$DATE.sql"
    fi
    
    # Backup application files
    print_status "Backing up application files..."
    tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" -C "$(dirname $PROJECT_DIR)" "$(basename $PROJECT_DIR)"
    print_success "Application backup created: $BACKUP_DIR/app_$DATE.tar.gz"
}

# Update application code
update_code() {
    print_status "Updating application code..."
    
    cd $PROJECT_DIR
    
    # Stash any local changes
    git stash
    
    # Pull latest changes
    git pull origin main
    
    print_success "Code updated successfully"
}

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    
    cd $PROJECT_DIR
    
    # Build with no cache for production
    docker-compose build --no-cache
    
    print_success "Docker images built successfully"
}

# Deploy application
deploy_application() {
    print_status "Deploying application..."
    
    cd $PROJECT_DIR
    
    # Stop existing containers
    docker-compose down
    
    # Start new containers
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 30
    
    print_success "Application deployed successfully"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    cd $PROJECT_DIR
    
    # Wait for database to be ready
    until docker-compose exec postgres pg_isready -U afms_user -d afms_database; do
        print_status "Waiting for database to be ready..."
        sleep 5
    done
    
    # Run Laravel migrations
    docker-compose exec laravel-api php artisan migrate --force
    
    # Run Prisma migrations if needed
    if [ -f "prisma/schema.prisma" ]; then
        docker-compose exec nextjs npx prisma migrate deploy
    fi
    
    print_success "Database migrations completed"
}

# Optimize application
optimize_application() {
    print_status "Optimizing application..."
    
    cd $PROJECT_DIR
    
    # Laravel optimizations
    docker-compose exec laravel-api php artisan config:cache
    docker-compose exec laravel-api php artisan route:cache
    docker-compose exec laravel-api php artisan view:cache
    
    print_success "Application optimized"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    cd $PROJECT_DIR
    
    # Check container status
    if ! docker-compose ps | grep -q "Up"; then
        print_error "Some containers are not running"
        docker-compose ps
        return 1
    fi
    
    # Check web application
    if command_exists curl; then
        if curl -f -s http://localhost/health > /dev/null; then
            print_success "Web application is responding"
        else
            print_warning "Web application health check failed"
        fi
        
        # Check API
        if curl -f -s http://localhost/api/health > /dev/null; then
            print_success "API is responding"
        else
            print_warning "API health check failed"
        fi
    fi
    
    print_success "Health check completed"
}

# Cleanup old backups (keep last 7 days)
cleanup_backups() {
    print_status "Cleaning up old backups..."
    
    find $BACKUP_DIR -name "*.sql" -mtime +7 -delete 2>/dev/null || true
    find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true
    
    print_success "Old backups cleaned up"
}

# Rollback function
rollback() {
    print_error "Deployment failed. Starting rollback..."
    
    cd $PROJECT_DIR
    
    # Stop current containers
    docker-compose down
    
    # Restore from backup if available
    LATEST_BACKUP=$(ls -t $BACKUP_DIR/app_*.tar.gz 2>/dev/null | head -n1)
    if [ -n "$LATEST_BACKUP" ]; then
        print_status "Restoring from backup: $LATEST_BACKUP"
        tar -xzf "$LATEST_BACKUP" -C "$(dirname $PROJECT_DIR)"
        
        # Restart with previous version
        docker-compose up -d
        
        print_success "Rollback completed"
    else
        print_error "No backup found for rollback"
    fi
}

# Main deployment process
main() {
    print_status "Starting deployment process..."
    
    # Set trap for error handling
    trap rollback ERR
    
    check_prerequisites
    create_backup
    update_code
    build_images
    deploy_application
    run_migrations
    optimize_application
    health_check
    cleanup_backups
    
    print_success "🎉 Deployment completed successfully!"
    
    # Show final status
    echo ""
    print_status "Final status:"
    docker-compose ps
    
    echo ""
    print_status "Application URLs:"
    echo "  Frontend: https://afms.my.id"
    echo "  API: https://api.afms.my.id"
    echo "  Health: https://afms.my.id/health"
}

# Script options
case "$1" in
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    "backup")
        create_backup
        ;;
    *)
        main
        ;;
esac