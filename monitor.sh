#!/bin/bash

# AFMS Monitoring and Maintenance Script
# Usage: ./monitor.sh [command]
# Commands: status, logs, backup, cleanup, update, restart

set -e

PROJECT_DIR="/opt/afmsnextj"
BACKUP_DIR="/opt/backups/afms"
LOG_DIR="/var/log/afms"
DATE=$(date +%Y%m%d_%H%M%S)

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

# Check system status
check_status() {
    print_status "Checking AFMS system status..."
    
    cd $PROJECT_DIR
    
    echo ""
    echo "=== Container Status ==="
    docker-compose ps
    
    echo ""
    echo "=== Resource Usage ==="
    docker stats --no-stream
    
    echo ""
    echo "=== Disk Usage ==="
    df -h /
    
    echo ""
    echo "=== Memory Usage ==="
    free -h
    
    echo ""
    echo "=== Network Connectivity ==="
    if command -v curl >/dev/null 2>&1; then
        echo "Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://localhost || echo "FAILED")"
        echo "API Health: $(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "FAILED")"
        echo "Database: $(docker-compose exec -T postgres pg_isready -U afms_user -d afms_database && echo "OK" || echo "FAILED")"
        echo "Redis: $(docker-compose exec -T redis redis-cli ping || echo "FAILED")"
    fi
    
    echo ""
    echo "=== SSL Certificate Status ==="
    if [ -f "nginx/ssl/afms.my.id.crt" ]; then
        CERT_EXPIRY=$(openssl x509 -in nginx/ssl/afms.my.id.crt -noout -enddate | cut -d= -f2)
        echo "Certificate expires: $CERT_EXPIRY"
        
        # Check if certificate expires in 30 days
        if openssl x509 -in nginx/ssl/afms.my.id.crt -noout -checkend 2592000; then
            print_success "Certificate is valid for more than 30 days"
        else
            print_warning "Certificate expires within 30 days!"
        fi
    else
        print_warning "SSL certificate not found"
    fi
}

# View logs
view_logs() {
    print_status "Viewing application logs..."
    
    cd $PROJECT_DIR
    
    echo "Select service to view logs:"
    echo "1) All services"
    echo "2) Nginx"
    echo "3) Laravel API"
    echo "4) Next.js"
    echo "5) PostgreSQL"
    echo "6) Redis"
    
    read -p "Enter choice (1-6): " choice
    
    case $choice in
        1) docker-compose logs -f ;;
        2) docker-compose logs -f nginx ;;
        3) docker-compose logs -f laravel-api ;;
        4) docker-compose logs -f nextjs ;;
        5) docker-compose logs -f postgres ;;
        6) docker-compose logs -f redis ;;
        *) print_error "Invalid choice" ;;
    esac
}

# Create backup
create_backup() {
    print_status "Creating system backup..."
    
    # Create backup directories
    sudo mkdir -p $BACKUP_DIR
    sudo mkdir -p $LOG_DIR
    
    cd $PROJECT_DIR
    
    # Database backup
    print_status "Backing up database..."
    docker-compose exec -T postgres pg_dump -U afms_user afms_database > "$BACKUP_DIR/database_$DATE.sql"
    
    # Application files backup
    print_status "Backing up application files..."
    tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='storage/logs' \
        --exclude='vendor' \
        -C "$(dirname $PROJECT_DIR)" "$(basename $PROJECT_DIR)"
    
    # Docker volumes backup
    print_status "Backing up Docker volumes..."
    docker run --rm -v afmsnextj_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_data_$DATE.tar.gz -C /data .
    docker run --rm -v afmsnextj_redis_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/redis_data_$DATE.tar.gz -C /data .
    
    # Logs backup
    print_status "Backing up logs..."
    docker-compose logs > "$LOG_DIR/docker_logs_$DATE.log"
    
    print_success "Backup completed successfully"
    echo "Backup files:"
    ls -lh $BACKUP_DIR/*$DATE*
}

# Cleanup old files
cleanup_system() {
    print_status "Cleaning up system..."
    
    cd $PROJECT_DIR
    
    # Clean Docker system
    print_status "Cleaning Docker system..."
    docker system prune -f
    docker volume prune -f
    docker image prune -f
    
    # Clean old backups (keep last 7 days)
    print_status "Cleaning old backups..."
    find $BACKUP_DIR -name "*.sql" -mtime +7 -delete 2>/dev/null || true
    find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true
    find $LOG_DIR -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Clean Laravel logs
    print_status "Cleaning Laravel logs..."
    docker-compose exec laravel-api find storage/logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Update application
update_application() {
    print_status "Updating application..."
    
    cd $PROJECT_DIR
    
    # Create backup before update
    create_backup
    
    # Pull latest changes
    git stash
    git pull origin main
    
    # Rebuild and restart
    docker-compose build --no-cache
    docker-compose down
    docker-compose up -d
    
    # Run migrations
    sleep 30
    docker-compose exec laravel-api php artisan migrate --force
    
    # Optimize
    docker-compose exec laravel-api php artisan config:cache
    docker-compose exec laravel-api php artisan route:cache
    docker-compose exec laravel-api php artisan view:cache
    
    print_success "Application updated successfully"
}

# Restart services
restart_services() {
    print_status "Restarting services..."
    
    cd $PROJECT_DIR
    
    echo "Select restart option:"
    echo "1) Restart all services"
    echo "2) Restart specific service"
    echo "3) Reload Nginx only"
    
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            docker-compose restart
            print_success "All services restarted"
            ;;
        2)
            echo "Available services: nginx, laravel-api, nextjs, postgres, redis"
            read -p "Enter service name: " service
            docker-compose restart $service
            print_success "Service $service restarted"
            ;;
        3)
            docker-compose exec nginx nginx -s reload
            print_success "Nginx configuration reloaded"
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

# Monitor real-time
monitor_realtime() {
    print_status "Starting real-time monitoring..."
    
    cd $PROJECT_DIR
    
    echo "Real-time monitoring started. Press Ctrl+C to stop."
    echo ""
    
    while true; do
        clear
        echo "=== AFMS Real-time Monitor - $(date) ==="
        echo ""
        
        echo "Container Status:"
        docker-compose ps
        echo ""
        
        echo "Resource Usage:"
        docker stats --no-stream
        echo ""
        
        echo "Recent Logs (last 10 lines):"
        docker-compose logs --tail=10
        
        sleep 10
    done
}

# Performance report
performance_report() {
    print_status "Generating performance report..."
    
    cd $PROJECT_DIR
    
    REPORT_FILE="$LOG_DIR/performance_report_$DATE.txt"
    
    {
        echo "AFMS Performance Report - $(date)"
        echo "======================================"
        echo ""
        
        echo "System Information:"
        uname -a
        echo ""
        
        echo "Container Status:"
        docker-compose ps
        echo ""
        
        echo "Resource Usage:"
        docker stats --no-stream
        echo ""
        
        echo "Disk Usage:"
        df -h
        echo ""
        
        echo "Memory Usage:"
        free -h
        echo ""
        
        echo "Network Statistics:"
        ss -tuln
        echo ""
        
        echo "Database Statistics:"
        docker-compose exec -T postgres psql -U afms_user -d afms_database -c "SELECT schemaname,tablename,n_tup_ins,n_tup_upd,n_tup_del FROM pg_stat_user_tables;"
        echo ""
        
        echo "Redis Statistics:"
        docker-compose exec -T redis redis-cli info stats
        
    } > $REPORT_FILE
    
    print_success "Performance report saved to: $REPORT_FILE"
}

# Show help
show_help() {
    echo "AFMS Monitoring and Maintenance Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status      - Show system status"
    echo "  logs        - View application logs"
    echo "  backup      - Create system backup"
    echo "  cleanup     - Clean up old files and Docker resources"
    echo "  update      - Update application to latest version"
    echo "  restart     - Restart services"
    echo "  monitor     - Real-time monitoring"
    echo "  report      - Generate performance report"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 backup"
    echo "  $0 logs"
}

# Main script logic
case "${1:-status}" in
    "status")
        check_status
        ;;
    "logs")
        view_logs
        ;;
    "backup")
        create_backup
        ;;
    "cleanup")
        cleanup_system
        ;;
    "update")
        update_application
        ;;
    "restart")
        restart_services
        ;;
    "monitor")
        monitor_realtime
        ;;
    "report")
        performance_report
        ;;
    "help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac