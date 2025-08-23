# Panduan Implementasi Solution X 100-C Fingerprint Device dengan Next.js Vercel

## Overview
Panduan ini menjelaskan cara mengintegrasikan fingerprint device Solution X 100-C dengan aplikasi Next.js yang sudah di-deploy ke Vercel menggunakan konsep ADMS Server.

## Arsitektur Sistem

```
[Fingerprint Device] → [Cloud Server/VPS] → [Vercel Next.js App]
     (Kantor)              (ADMS Server)         (Dashboard Web)
```

## Langkah-langkah Implementasi

### 1. Persiapan Cloud Server (VPS)

**Spesifikasi Minimum:**
- VPS dengan IP Public
- OS: Ubuntu 20.04 LTS atau Windows Server
- RAM: 2GB minimum
- Storage: 20GB
- Port 8081 terbuka untuk ADMS Server

**Provider yang Direkomendasikan:**
- DigitalOcean
- AWS EC2
- Google Cloud Platform
- Vultr
- Linode

### 2. Instalasi ADMS Server di VPS

#### Untuk Windows Server:
```bash
# Download ADMS Server v3.1-168
# Install MySQL Server
# Konfigurasi ADMS Server:
# - Port: 8081
# - Database: MySQL
# - IP Binding: 0.0.0.0 (semua interface)
```

#### Untuk Ubuntu/Linux:
```bash
# Install dependencies
sudo apt update
sudo apt install mysql-server

# Download dan extract ADMS Server
wget [ADMS_SERVER_DOWNLOAD_LINK]
unzip adms-server.zip

# Konfigurasi MySQL
sudo mysql_secure_installation

# Buat database untuk ADMS
mysql -u root -p
CREATE DATABASE adms_attendance;
CREATE USER 'adms_user'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON adms_attendance.* TO 'adms_user'@'%';
FLUSH PRIVILEGES;
EXIT;

# Jalankan ADMS Server
./adms-server --port=8081 --db-host=localhost --db-name=adms_attendance
```

### 3. Konfigurasi Firewall VPS

```bash
# Ubuntu UFW
sudo ufw allow 22/tcp
sudo ufw allow 8081/tcp
sudo ufw allow 3306/tcp
sudo ufw enable

# Atau iptables
sudo iptables -A INPUT -p tcp --dport 8081 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3306 -j ACCEPT
```

### 4. Konfigurasi Solution X 100-C Device

**Menu Device → Network Settings:**
```
IP Address: [IP_KANTOR_SESUAI_ROUTER]
Subnet Mask: 255.255.255.0
Gateway: [IP_GATEWAY_KANTOR]
DNS: 8.8.8.8
```

**Menu Device → ADMS/Cloud Server:**
```
Server IP: [IP_PUBLIC_VPS_ANDA]
Server Port: 8081
Device ID: [UNIQUE_ID_PER_DEVICE]
Upload Interval: 30 (detik)
Auto Upload: Enable
```

### 5. Modifikasi Next.js App untuk Integrasi

#### A. Tambah Environment Variables di Vercel

```env
# Vercel Dashboard → Settings → Environment Variables
ADMS_SERVER_URL=http://[IP_VPS_ANDA]:8081
ADMS_DB_HOST=[IP_VPS_ANDA]
ADMS_DB_PORT=3306
ADMS_DB_NAME=adms_attendance
ADMS_DB_USER=adms_user
ADMS_DB_PASSWORD=strong_password
```

#### B. Buat API Route untuk Sync Data

**File: `pages/api/fingerprint/sync.ts`**
```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.ADMS_DB_HOST,
  port: parseInt(process.env.ADMS_DB_PORT || '3306'),
  user: process.env.ADMS_DB_USER,
  password: process.env.ADMS_DB_PASSWORD,
  database: process.env.ADMS_DB_NAME,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Query attendance logs dari ADMS database
    const [rows] = await connection.execute(`
      SELECT 
        device_id,
        user_id,
        timestamp,
        verify_mode,
        in_out_mode
      FROM attendance_logs 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      ORDER BY timestamp DESC
    `);

    await connection.end();

    res.status(200).json({
      success: true,
      data: rows,
      count: (rows as any[]).length
    });
  } catch (error) {
    console.error('Database sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync attendance data'
    });
  }
}
```

#### C. Buat Scheduled Function untuk Auto Sync

**File: `pages/api/cron/sync-attendance.ts`**
```typescript
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Vercel Cron Jobs authentication
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Sync data dari ADMS ke database utama
    const syncResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/fingerprint/sync`);
    const syncData = await syncResponse.json();

    // Process dan simpan ke database utama (Prisma)
    // ... logic untuk menyimpan ke database utama

    res.status(200).json({
      success: true,
      message: 'Attendance data synced successfully',
      synced_records: syncData.count
    });
  } catch (error) {
    console.error('Cron sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Sync failed'
    });
  }
}
```

#### D. Konfigurasi Vercel Cron Jobs

**File: `vercel.json`**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-attendance",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 6. Testing dan Monitoring

#### A. Test Koneksi Device
```bash
# Dari VPS, cek log ADMS Server
tail -f /var/log/adms/server.log

# Test API endpoint
curl -X GET "https://[YOUR_VERCEL_DOMAIN]/api/fingerprint/sync"
```

#### B. Monitoring Dashboard
Tambahkan halaman monitoring di Next.js untuk:
- Status koneksi device
- Jumlah data yang tersync
- Log aktivitas
- Device health check

### 7. Troubleshooting

**Device tidak connect ke ADMS:**
- Pastikan port 8081 terbuka di VPS
- Cek koneksi internet di kantor
- Verifikasi IP public VPS

**Data tidak sync ke Vercel:**
- Cek environment variables
- Monitor Vercel function logs
- Pastikan database credentials benar

**Performance Issues:**
- Gunakan connection pooling untuk database
- Implement caching untuk data yang sering diakses
- Optimize query database

### 8. Security Considerations

- Gunakan VPN atau SSL untuk koneksi ADMS
- Implement rate limiting di API endpoints
- Encrypt sensitive data
- Regular backup database ADMS
- Monitor unauthorized access attempts

### 9. Maintenance

- **Daily:** Monitor device connectivity
- **Weekly:** Backup ADMS database
- **Monthly:** Update ADMS server software
- **Quarterly:** Review security logs

## Estimasi Biaya Bulanan

- **VPS (2GB RAM):** $10-20/bulan
- **Domain:** $10-15/tahun
- **SSL Certificate:** Gratis (Let's Encrypt)
- **Vercel Pro (jika diperlukan):** $20/bulan

**Total estimasi:** $15-25/bulan

## Kesimpulan

Dengan implementasi ini, Anda akan memiliki:
- Sistem absensi terpusat real-time
- Dashboard web yang dapat diakses dari mana saja
- Monitoring device secara remote
- Data backup otomatis
- Skalabilitas untuk multiple devices

---

**Catatan:** Setelah implementasi selesai, panduan lain dapat dihapus dan hanya menggunakan panduan ini sebagai referensi utama.