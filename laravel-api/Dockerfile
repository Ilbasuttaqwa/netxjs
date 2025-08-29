# Laravel API Dockerfile
FROM php:8.2-fpm-alpine

# Set working directory
WORKDIR /var/www/html

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    libpq-dev \
    zip \
    unzip \
    postgresql-client \
    nginx \
    supervisor \
    oniguruma-dev \
    freetype-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    libxpm-dev \
    autoconf \
    g++ \
    make

# Configure and install GD extension
RUN docker-php-ext-configure gd \
    --with-freetype \
    --with-jpeg \
    --with-webp \
    --with-xpm

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    soap

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Copy application files
COPY . .

# Create required directories
RUN mkdir -p bootstrap/cache storage/logs storage/framework/cache storage/framework/sessions storage/framework/views
RUN chmod -R 775 bootstrap/cache storage

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Create SSL directory
RUN mkdir -p /var/www/html/ssl

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache \
    && chmod -R 755 /var/www/html/ssl

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default-ssl.conf /etc/nginx/conf.d/default.conf

# Copy supervisor configuration
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create startup script inline
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'set -e' >> /start.sh && \
    echo 'echo "Starting Laravel API container..."' >> /start.sh && \
    echo 'mkdir -p /var/www/html/storage/logs' >> /start.sh && \
    echo 'mkdir -p /var/www/html/storage/framework/cache' >> /start.sh && \
    echo 'mkdir -p /var/www/html/storage/framework/sessions' >> /start.sh && \
    echo 'mkdir -p /var/www/html/storage/framework/views' >> /start.sh && \
    echo 'mkdir -p /var/www/html/bootstrap/cache' >> /start.sh && \
    echo 'mkdir -p /var/log/supervisor' >> /start.sh && \
    echo 'chown -R www-data:www-data /var/www/html/storage' >> /start.sh && \
    echo 'chown -R www-data:www-data /var/www/html/bootstrap/cache' >> /start.sh && \
    echo 'chmod -R 775 /var/www/html/storage' >> /start.sh && \
    echo 'chmod -R 775 /var/www/html/bootstrap/cache' >> /start.sh && \
    echo 'exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf' >> /start.sh && \
    chmod +x /start.sh

# Expose ports
EXPOSE 80
EXPOSE 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -k -f https://localhost/health || exit 1

# Start services
CMD ["/start.sh"]