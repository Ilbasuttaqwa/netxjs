#!/bin/bash

# AFMS Clean Deployment Script for Neva Cloud
# This script will clean up old files and deploy fresh application

set -e

echo "🚀 Starting AFMS Clean Deployment to Neva Cloud..."

# Configuration
SERVER_HOST="afms.my.id"
SERVER_USER="root"
DEPLOY_PATH="/var/www/afms"
BACKUP_PATH="/var/backups/afms"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if server is accessible
check_server() {
    echo_info "Checking server connectivity..."
    if ! ssh -o ConnectTimeout=10 "$SERVER_USER@$SERVER_HOST" "echo 'Server accessible'" >/dev/null 2>&1; then
        echo_error "Cannot connect to server $SERVER_HOST"
        exit 1
    fi
    echo_info "Server is accessible"
}

# Function to backup current deployment
backup_current() {
    echo_info "Creating backup of current deployment..."
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
        if [ -d "/var/www/afms" ]; then
            mkdir -p /var/backups/afms
            BACKUP_NAME="afms-backup-$(date +%Y%m%d-%H%M%S)"
            cp -r /var/www/afms "/var/backups/afms/$BACKUP_NAME"
            echo "Backup created: /var/backups/afms/$BACKUP_NAME"
        else
            echo "No existing deployment found to backup"
        fi
EOF
}

# Function to clean up old files
clean_old_files() {
    echo_info "Cleaning up old files on server..."
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
        # Stop and remove old containers
        if command -v docker-compose >/dev/null 2>&1; then
            cd /var/www/afms 2>/dev/null || true
            docker-compose down --remove-orphans 2>/dev/null || true
        fi
        
        # Remove old application files
        rm -rf /var/www/afms/*
        rm -rf /var/www/afms/.*
        
        # Clean Docker system
        docker system prune -af --volumes 2>/dev/null || true
        
        echo "Old files cleaned successfully"
EOF
}

# Function to upload new files
upload_files() {
    echo_info "Uploading new application files..."
    
    # Create deployment directory
    ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $DEPLOY_PATH"
    
    # Upload application files
    rsync -avz --progress \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='*.log' \
        --exclude='.env.local' \
        ./ "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"
    
    echo_info "Files uploaded successfully"
}

# Function to deploy application
deploy_application() {
    echo_info "Deploying application on server..."
    ssh "$SERVER_USER@$SERVER_HOST" << 'EOF'
        cd /var/www/afms
        
        # Set proper permissions
        chown -R www-data:www-data .
        chmod -R 755 .
        
        # Build and start containers
        docker-compose build --no-cache
        docker-compose up -d
        
        # Wait for services to be ready
        echo "Waiting for services to start..."
        sleep 30
        
        # Check service health
        docker-compose ps
        
        echo "Deployment completed successfully"
EOF
}

# Function to verify deployment
verify_deployment() {
    echo_info "Verifying deployment..."
    
    # Check if site is accessible
    if curl -f -s "https://$SERVER_HOST/health" >/dev/null; then
        echo_info "✅ Site is accessible at https://$SERVER_HOST"
    else
        echo_warn "⚠️  Site health check failed, but deployment may still be starting"
    fi
    
    # Show container status
    ssh "$SERVER_USER@$SERVER_HOST" "cd $DEPLOY_PATH && docker-compose ps"
}

# Main deployment process
main() {
    echo_info "Starting clean deployment process..."
    
    check_server
    backup_current
    clean_old_files
    upload_files
    deploy_application
    verify_deployment
    
    echo_info "🎉 Clean deployment completed successfully!"
    echo_info "Your application is now available at: https://$SERVER_HOST"
}

# Run main function
main "$@"