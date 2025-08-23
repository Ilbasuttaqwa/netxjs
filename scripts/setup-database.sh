#!/bin/bash

# Database Setup Script for AFMS Production Deployment
# This script sets up both PostgreSQL (Next.js) and MySQL (Laravel API) databases

set -e

echo "🗄️ Setting up AFMS Database Schema for Production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if environment variables are set
check_env_vars() {
    echo "🔍 Checking environment variables..."
    
    # PostgreSQL variables
    if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
        print_error "PostgreSQL environment variables not set!"
        echo "Required: POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD"
        exit 1
    fi
    
    # MySQL variables
    if [ -z "$MYSQL_HOST" ] || [ -z "$MYSQL_DATABASE" ] || [ -z "$MYSQL_USER" ]; then
        print_error "MySQL environment variables not set!"
        echo "Required: MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD"
        exit 1
    fi
    
    print_status "Environment variables validated"
}

# Setup PostgreSQL database for Next.js
setup_postgresql() {
    echo "🐘 Setting up PostgreSQL database..."
    
    # Test connection
    if ! PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d postgres -c "\q" 2>/dev/null; then
        print_error "Cannot connect to PostgreSQL server"
        exit 1
    fi
    
    # Create database if not exists
    PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d postgres -c "CREATE DATABASE IF NOT EXISTS $POSTGRES_DB;"
    
    # Run Prisma migrations
    echo "📋 Running Prisma migrations..."
    cd /app
    npx prisma migrate deploy
    npx prisma generate
    
    print_status "PostgreSQL setup completed"
}

# Setup MySQL database for Laravel API
setup_mysql() {
    echo "🐬 Setting up MySQL database..."
    
    # Test connection
    if ! mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD -e "SELECT 1;" 2>/dev/null; then
        print_error "Cannot connect to MySQL server"
        exit 1
    fi
    
    # Create database if not exists
    mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    # Run Laravel migrations
    echo "📋 Running Laravel migrations..."
    cd /app/laravel-api
    php artisan migrate --force
    php artisan db:seed --force
    
    print_status "MySQL setup completed"
}

# Create database backup script
create_backup_script() {
    echo "💾 Creating database backup script..."
    
    cat > /app/scripts/backup-databases.sh << 'EOF'
#!/bin/bash

# Database Backup Script
BACKUP_DIR="/app/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB > "$BACKUP_DIR/postgres_$DATE.sql"

# Backup MySQL
echo "Backing up MySQL..."
mysqldump -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE > "$BACKUP_DIR/mysql_$DATE.sql"

# Compress backups
gzip "$BACKUP_DIR/postgres_$DATE.sql"
gzip "$BACKUP_DIR/mysql_$DATE.sql"

# Remove backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF
    
    chmod +x /app/scripts/backup-databases.sh
    print_status "Backup script created"
}

# Main execution
main() {
    echo "🚀 Starting database setup..."
    
    check_env_vars
    setup_postgresql
    setup_mysql
    create_backup_script
    
    print_status "Database setup completed successfully!"
    echo ""
    echo "📊 Database Summary:"
    echo "   PostgreSQL: $POSTGRES_HOST/$POSTGRES_DB (Next.js)"
    echo "   MySQL: $MYSQL_HOST/$MYSQL_DATABASE (Laravel API)"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Verify database connections"
    echo "   2. Test API endpoints"
    echo "   3. Setup monitoring"
    echo "   4. Configure backups (cron job)"
}

# Run main function
main "$@"