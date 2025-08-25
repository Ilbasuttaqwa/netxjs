#!/bin/bash

# =============================================================================
# AFMS Deployment Script - Production Ready
# Script untuk deploy Next.js + Laravel API ke Ubuntu VPS
# Domain: afms.my.id (frontend) & api.afms.my.id (backend)
# =============================================================================

set -e  # Exit on any error

# =============================================================================
# Configuration Variables
# =============================================================================
APP_NAME="afms"
PROJECT_DIR="/var/www/${APP_NAME}"
DOMAIN_FRONTEND="afms.my.id"
DOMAIN_BACKEND="api.afms.my.id"
SSL_EMAIL="tbdream9@gmail.com"  # Ganti dengan email Anda
GIT_REPO="https://github.com/yourusername/afmsnextj.git"  # Update dengan repo yang benar
BRANCH="main"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

# Print colored output
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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Script ini harus dijalankan sebagai root (gunakan sudo)"
        exit 1
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Wait for user confirmation
confirm() {
    read -p "$1 (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# =============================================================================
# System Requirements Check
# =============================================================================
check_requirements() {
    print_status "Memeriksa system requirements..."
    
    # Check Ubuntu version
    if ! grep -q "Ubuntu" /etc/os-release; then
        print_error "Script ini hanya untuk Ubuntu"
        exit 1
    fi
    
    # Check required commands
    local missing_commands=()
    
    if ! command_exists docker; then
        missing_commands+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_commands+=("docker-compose")
    fi
    
    if ! command_exists nginx; then
        missing_commands+=("nginx")
    fi
    
    if ! command_exists certbot; then
        missing_commands+=("certbot")
    fi
    
    if ! command_exists git; then
        missing_commands+=("git")
    fi
    
    if [ ${#missing_commands[@]} -ne 0 ]; then
        print_error "Command tidak ditemukan: ${missing_commands[*]}"
        print_status "Jalankan script install-dependencies.sh terlebih dahulu"
        exit 1
    fi
    
    print_success "Semua requirements terpenuhi"
}

# =============================================================================
# Install Dependencies (if needed)
# =============================================================================
install_dependencies() {
    print_status "Installing system dependencies..."
    
    # Update system
    apt update && apt upgrade -y
    
    # Install basic packages
    apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    
    # Install Docker
    if ! command_exists docker; then
        print_status "Installing Docker..."
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt update
        apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        systemctl enable docker
        systemctl start docker
        usermod -aG docker $SUDO_USER 2>/dev/null || true
    fi
    
    # Install Docker Compose
    if ! command_exists docker-compose; then
        print_status "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    # Install Nginx
    if ! command_exists nginx; then
        print_status "Installing Nginx..."
        apt install -y nginx
        systemctl enable nginx
    fi
    
    # Install Certbot
    if ! command_exists certbot; then
        print_status "Installing Certbot..."
        apt install -y certbot python3-certbot-nginx
    fi
    
    print_success "Dependencies installed successfully"
}

# =============================================================================
# Setup Project Directory
# =============================================================================
setup_project_directory() {
    print_status "Setting up project directory..."
    
    # Create project directory
    mkdir -p "$PROJECT_DIR"
    cd "$PROJECT_DIR"
    
    # Clone or update repository
    if [ -d ".git" ]; then
        print_status "Updating existing repository..."
        git fetch origin
        git reset --hard origin/$BRANCH
        git clean -fd
    else
        print_status "Cloning repository..."
        git clone -b "$BRANCH" "$GIT_REPO" .
    fi
    
    # Set proper permissions
    chown -R www-data:www-data "$PROJECT_DIR"
    chmod -R 755 "$PROJECT_DIR"
    
    print_success "Project directory setup completed"
}

# =============================================================================
# Setup Environment Files
# =============================================================================
setup_environment() {
    print_status "Setting up environment files..."
    
    cd "$PROJECT_DIR"
    
    # Setup Next.js environment
    if [ ! -f ".env.local" ]; then
        print_status "Creating Next.js environment file..."
        cat > .env.local << EOF
# Next.js Environment Configuration
NEXT_PUBLIC_API_URL=https://${DOMAIN_BACKEND}
NEXT_PUBLIC_APP_URL=https://${DOMAIN_FRONTEND}
NEXTAUTH_URL=https://${DOMAIN_FRONTEND}
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Database Configuration
DATABASE_URL="postgresql://afms_user:afms_password@postgres:5432/afms_db?schema=public"

# Redis Configuration
REDIS_URL="redis://redis:6379"

# App Configuration
APP_ENV=production
APP_DEBUG=false
EOF
    fi
    
    # Setup Laravel environment
    if [ ! -f "laravel-api/.env" ]; then
        print_status "Creating Laravel environment file..."
        cat > laravel-api/.env << EOF
# Laravel Environment Configuration
APP_NAME=AFMS_API
APP_ENV=production
APP_KEY=base64:$(openssl rand -base64 32)
APP_DEBUG=false
APP_URL=https://${DOMAIN_BACKEND}

# Database Configuration
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=afms_db
DB_USERNAME=afms_user
DB_PASSWORD=afms_password

# Redis Configuration
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Cache Configuration
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@${DOMAIN_BACKEND}
MAIL_FROM_NAME="AFMS API"

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 64)
JWT_TTL=60

# CORS Configuration
CORS_ALLOWED_ORIGINS=https://${DOMAIN_FRONTEND}
EOF
    fi
    
    print_success "Environment files created"
}

# =============================================================================
# Setup SSL Certificates
# =============================================================================
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    cd "$PROJECT_DIR"
    
    # Make SSL script executable
    chmod +x generate-ssl.sh
    
    # Run SSL generation script
    ./generate-ssl.sh
    
    print_success "SSL certificates configured"
}

# =============================================================================
# Setup Nginx Configuration
# =============================================================================
setup_nginx() {
    print_status "Setting up Nginx configuration..."
    
    cd "$PROJECT_DIR"
    
    # Backup existing nginx config
    if [ -f "/etc/nginx/sites-available/default" ]; then
        cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Copy our nginx configuration
    cp nginx.conf /etc/nginx/sites-available/afms
    
    # Enable the site
    ln -sf /etc/nginx/sites-available/afms /etc/nginx/sites-enabled/afms
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    if nginx -t; then
        print_success "Nginx configuration is valid"
    else
        print_error "Nginx configuration error"
        exit 1
    fi
    
    print_success "Nginx configuration completed"
}

# =============================================================================
# Deploy Application
# =============================================================================
deploy_application() {
    print_status "Deploying application..."
    
    cd "$PROJECT_DIR"
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose down --remove-orphans || true
    
    # Remove old images (optional)
    if confirm "Remove old Docker images to free up space?"; then
        docker system prune -f
        docker image prune -a -f
    fi
    
    # Build and start containers
    print_status "Building and starting containers..."
    docker-compose up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check container status
    print_status "Checking container status..."
    docker-compose ps
    
    # Run database migrations (Laravel)
    print_status "Running database migrations..."
    docker-compose exec -T laravel-api php artisan migrate --force || true
    
    # Generate Prisma client (Next.js)
    print_status "Generating Prisma client..."
    docker-compose exec -T nextjs npx prisma generate || true
    docker-compose exec -T nextjs npx prisma db push || true
    
    print_success "Application deployed successfully"
}

# =============================================================================
# Start Services
# =============================================================================
start_services() {
    print_status "Starting all services..."
    
    # Start Docker
    systemctl start docker
    
    # Start Nginx
    systemctl reload nginx
    systemctl start nginx
    
    # Start application containers
    cd "$PROJECT_DIR"
    docker-compose up -d
    
    print_success "All services started"
}

# =============================================================================
# Verify Deployment
# =============================================================================
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check if containers are running
    cd "$PROJECT_DIR"
    if docker-compose ps | grep -q "Up"; then
        print_success "Containers are running"
    else
        print_error "Some containers are not running"
        docker-compose ps
    fi
    
    # Check Nginx status
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
    
    # Check SSL certificates
    if [ -f "/etc/nginx/ssl/${DOMAIN_FRONTEND}.crt" ] && [ -f "/etc/nginx/ssl/${DOMAIN_BACKEND}.crt" ]; then
        print_success "SSL certificates are present"
    else
        print_warning "SSL certificates may not be properly configured"
    fi
    
    # Test domain accessibility
    print_status "Testing domain accessibility..."
    
    # Test frontend
    if curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN_FRONTEND}/health" | grep -q "200\|301\|302"; then
        print_success "Frontend domain is accessible"
    else
        print_warning "Frontend domain may not be accessible yet"
    fi
    
    # Test backend
    if curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN_BACKEND}/health" | grep -q "200\|301\|302"; then
        print_success "Backend domain is accessible"
    else
        print_warning "Backend domain may not be accessible yet"
    fi
    
    print_success "Deployment verification completed"
}

# =============================================================================
# Show Deployment Summary
# =============================================================================
show_summary() {
    echo
    echo "=============================================================================="
    echo "                        DEPLOYMENT SUMMARY"
    echo "=============================================================================="
    echo
    echo "✅ Application deployed successfully!"
    echo
    echo "🌐 Frontend URL: https://${DOMAIN_FRONTEND}"
    echo "🔗 Backend API: https://${DOMAIN_BACKEND}"
    echo "📁 Project Directory: ${PROJECT_DIR}"
    echo
    echo "📋 Useful Commands:"
    echo "   • Check containers: cd ${PROJECT_DIR} && docker-compose ps"
    echo "   • View logs: cd ${PROJECT_DIR} && docker-compose logs -f"
    echo "   • Restart services: cd ${PROJECT_DIR} && docker-compose restart"
    echo "   • Update app: cd ${PROJECT_DIR} && ./deploy.sh"
    echo "   • Check SSL: ./test-deployment.sh"
    echo
    echo "🔧 Nginx Commands:"
    echo "   • Test config: nginx -t"
    echo "   • Reload: systemctl reload nginx"
    echo "   • Status: systemctl status nginx"
    echo
    echo "📝 Log Files:"
    echo "   • Nginx Access: /var/log/nginx/access.log"
    echo "   • Nginx Error: /var/log/nginx/error.log"
    echo "   • App Logs: cd ${PROJECT_DIR} && docker-compose logs"
    echo
    echo "=============================================================================="
}

# =============================================================================
# Main Deployment Function
# =============================================================================
main() {
    echo
    echo "=============================================================================="
    echo "                    AFMS DEPLOYMENT SCRIPT"
    echo "              Next.js + Laravel API Deployment"
    echo "=============================================================================="
    echo
    
    # Check if running as root
    check_root
    
    # Show configuration
    echo "📋 Deployment Configuration:"
    echo "   • Frontend Domain: ${DOMAIN_FRONTEND}"
    echo "   • Backend Domain: ${DOMAIN_BACKEND}"
    echo "   • Project Directory: ${PROJECT_DIR}"
    echo "   • SSL Email: ${SSL_EMAIL}"
    echo
    
    if ! confirm "Proceed with deployment?"; then
        print_status "Deployment cancelled"
        exit 0
    fi
    
    # Run deployment steps
    check_requirements
    
    # Install dependencies if needed
    if ! command_exists docker || ! command_exists nginx; then
        if confirm "Install missing dependencies?"; then
            install_dependencies
        else
            print_error "Required dependencies are missing"
            exit 1
        fi
    fi
    
    setup_project_directory
    setup_environment
    setup_nginx
    setup_ssl
    deploy_application
    start_services
    verify_deployment
    show_summary
    
    print_success "🎉 Deployment completed successfully!"
}

# =============================================================================
# Script Entry Point
# =============================================================================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi