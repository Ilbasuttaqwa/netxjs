# SSL Certificate Setup

For production deployment, place your SSL certificate files in this directory:

- `afms.my.id.crt` - SSL certificate file
- `afms.my.id.key` - SSL private key file

## Obtaining SSL Certificate

### Option 1: Let's Encrypt (Free)
```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d afms.my.id -d www.afms.my.id
```

### Option 2: Commercial SSL Certificate
1. Purchase SSL certificate from a trusted CA
2. Generate CSR (Certificate Signing Request)
3. Submit CSR to CA
4. Download and install certificate files

## File Permissions
Ensure proper permissions for security:
```bash
sudo chmod 600 /etc/nginx/ssl/afms.my.id.key
sudo chmod 644 /etc/nginx/ssl/afms.my.id.crt
```

## Testing SSL Configuration
```bash
# Test nginx configuration
nginx -t

# Reload nginx
sudo systemctl reload nginx

# Test SSL
ssl-labs.com or ssllabs.com/ssltest/
```