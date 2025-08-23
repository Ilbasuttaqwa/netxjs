# Quick Start: Deploy AFMS di DomaiNesia Cloud VPS

## 🚀 Panduan Cepat Deployment

Panduan ini akan membantu Anda deploy aplikasi AFMS di DomaiNesia Cloud VPS dalam waktu kurang dari 30 menit.

## 📋 Persiapan

### 1. Order Cloud VPS DomaiNesia

**Rekomendasi Spesifikasi Minimal:**
- **CPU**: 2 vCPU
- **RAM**: 4GB
- **Storage**: 40GB SSD NVMe
- **OS**: Ubuntu 22.04 LTS
- **Estimasi Harga**: ~Rp 250.000-350.000/bulan

**Langkah Order:**
1. Kunjungi [DomaiNesia Cloud VPS](https://www.domainesia.com/cloud-vps/)
2. Pilih spesifikasi sesuai kebutuhan
3. Pilih OS: **Ubuntu 22.04 LTS**
4. Selesaikan pembayaran
5. Tunggu email konfirmasi dengan detail akses SSH

### 2. Setup Domain (Opsional)

Jika Anda memiliki domain:
1. Login ke panel domain DomaiNesia
2. Tambahkan A Record:
   - `@` → IP VPS Anda
   - `www` → IP VPS Anda
   - `api` → IP VPS Anda

## 🛠️ Deployment Otomatis

### Opsi 1: One-Click Deployment (Recommended)

```bash
# 1. Login ke VPS via SSH
ssh root@IP_VPS_ANDA

# 2. Download dan jalankan script deployment
wget https://raw.githubusercontent.com/your-repo/afms/main/scripts/deploy-domainesia.sh
chmod +x deploy-domainesia.sh

# 3. Jalankan deployment (tanpa domain)
sudo ./deploy-domainesia.sh

# ATAU dengan domain
sudo ./deploy-domainesia.sh yourdomain.com
```

### Opsi 2: Manual Step-by-Step

Jika Anda ingin kontrol penuh:

```bash
# 1. Update sistem
sudo apt update && sudo apt upgrade -y

# 2. Clone repository
git clone https://github.com/your-repo/afms.git /var/www/afms
cd /var/www/afms

# 3. Jalankan script setup
sudo chmod +x scripts/deploy-domainesia.sh
sudo ./scripts/deploy-domainesia.sh yourdomain.com
```

## 🔧 Konfigurasi Post-Deployment

### 1. Secure MySQL
```bash
sudo mysql_secure_installation
```

### 2. Update Password Database
```bash
# Edit file environment Laravel
sudo nano /var/www/afms/laravel-api/.env

# Edit file environment Next.js
sudo nano /var/www/afms/.env.local

# Update password database di kedua file
```

### 3. Setup SSL (Jika menggunakan domain)
```bash
sudo ./scripts/setup-domain-ssl.sh yourdomain.com admin@yourdomain.com
```

## ✅ Verifikasi Deployment

### 1. Cek Status Services
```bash
# Cek semua services
sudo systemctl status nginx php8.2-fpm mysql postgresql redis-server

# Cek PM2 (Next.js)
sudo -u www-data pm2 status
```

### 2. Test Aplikasi

**Tanpa Domain:**
- Frontend: `http://IP_VPS_ANDA`
- API: `http://IP_VPS_ANDA/api`

**Dengan Domain:**
- Frontend: `https://yourdomain.com`
- API: `https://api.yourdomain.com`

### 3. Test Database Connection
```bash
# Test PostgreSQL
sudo -u postgres psql -d afms_nextjs -c "SELECT version();"

# Test MySQL
mysql -u afms_laravel -p afms_laravel -e "SELECT version();"
```

## 🔐 Security Checklist

```bash
# 1. Setup firewall
sudo ufw enable
sudo ufw status

# 2. Setup fail2ban
sudo systemctl status fail2ban

# 3. Disable root SSH (setelah setup user biasa)
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart ssh

# 4. Update sistem secara berkala
sudo apt update && sudo apt upgrade -y
```

## 📊 Monitoring

### 1. Cek Log Aplikasi
```bash
# Log Next.js
sudo -u www-data pm2 logs afms-nextjs

# Log Laravel
sudo tail -f /var/www/afms/laravel-api/storage/logs/laravel.log

# Log Nginx
sudo tail -f /var/log/nginx/error.log
```

### 2. Monitor Resources
```bash
# CPU dan Memory
htop

# Disk usage
df -h

# Database connections
sudo mysqladmin processlist
```

## 🔄 Backup Otomatis

Script backup sudah dikonfigurasi otomatis:

```bash
# Cek cron jobs
sudo crontab -l

# Manual backup
sudo /usr/local/bin/backup-afms.sh

# Cek backup files
ls -la /backup/afms/
```

## 🚨 Troubleshooting

### Problem: 502 Bad Gateway
```bash
# Cek PHP-FPM
sudo systemctl status php8.2-fpm
sudo systemctl restart php8.2-fpm

# Cek Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Problem: Database Connection Error
```bash
# Cek MySQL
sudo systemctl status mysql

# Cek PostgreSQL
sudo systemctl status postgresql

# Reset password jika perlu
sudo mysql -e "ALTER USER 'afms_laravel'@'localhost' IDENTIFIED BY 'new_password';"
```

### Problem: Next.js Not Loading
```bash
# Cek PM2
sudo -u www-data pm2 status
sudo -u www-data pm2 restart afms-nextjs

# Cek port 3000
sudo netstat -tlnp | grep :3000
```

### Problem: SSL Certificate Issues
```bash
# Renew SSL
sudo certbot renew --dry-run
sudo certbot renew

# Cek certificate
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 | openssl x509 -noout -dates
```

## 📞 Support DomaiNesia

Jika mengalami masalah dengan VPS:
- **Live Chat**: 24/7 di website DomaiNesia
- **Ticket Support**: Response time ~30 menit
- **Knowledge Base**: Dokumentasi lengkap tersedia

## 💰 Estimasi Biaya

| Item | Harga/Bulan (IDR) |
|------|------------------|
| Cloud VPS (2 vCPU, 4GB) | 250.000 - 350.000 |
| Domain .com | ~12.500 (150.000/tahun) |
| SSL Certificate | Gratis (Let's Encrypt) |
| **Total** | **~300.000** |

## 🎯 Next Steps

Setelah deployment berhasil:

1. **Setup Monitoring**: Konfigurasi email alerts
2. **Performance Tuning**: Optimasi database dan cache
3. **Backup Strategy**: Setup backup ke cloud storage
4. **Security Hardening**: Implementasi additional security measures
5. **Scaling**: Monitor traffic dan upgrade spesifikasi jika diperlukan

## 📚 Dokumentasi Lengkap

Untuk panduan detail, lihat:
- [`DOMAINESIA_DEPLOYMENT_GUIDE.md`](./DOMAINESIA_DEPLOYMENT_GUIDE.md) - Panduan lengkap
- [`PRODUCTION_DEPLOYMENT_GUIDE.md`](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Panduan umum production

---

**🎉 Selamat! Aplikasi AFMS Anda sudah siap digunakan di DomaiNesia Cloud VPS!**

Untuk bantuan lebih lanjut, hubungi tim support DomaiNesia atau buka issue di repository ini.