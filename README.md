# Dashboard Fingerprint X100-C

Sistem manajemen absensi fingerprint terintegrasi dengan device X100-C menggunakan protokol SOAP.

## Fitur Utama

- ✅ Integrasi real-time dengan device fingerprint X100-C
- ✅ Dashboard monitoring dan statistik
- ✅ Sistem sinkronisasi otomatis
- ✅ Real-time updates menggunakan WebSocket
- ✅ Manajemen pengguna dan cabang
- ✅ Laporan absensi komprehensif
- ✅ API callback untuk device
- ✅ Integrasi fingerprint device

## Teknologi

- **Backend**: Laravel 10
- **Frontend**: Bootstrap 5, jQuery
- **Database**: MySQL
- **Real-time**: Laravel Echo + Pusher
- **Protocol**: SOAP untuk komunikasi device

## Instalasi

1. Clone repository
```bash
git clone <repository-url>
cd dashboard-fingerprint
```

2. Install dependencies
```bash
composer install
npm install
```

3. Setup environment
```bash
cp .env.example .env
php artisan key:generate
```

4. Konfigurasi database di `.env`
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=dashboard_fingerprint
DB_USERNAME=root
DB_PASSWORD=
```

5. Konfigurasi fingerprint device di `.env`
```env
FINGERPRINT_DEVICE_IP=192.168.1.100
FINGERPRINT_DEVICE_PORT=80
FINGERPRINT_DEVICE_USERNAME=admin
FINGERPRINT_DEVICE_PASSWORD=123456
```

6. Jalankan migrasi dan seeder
```bash
php artisan migrate
php artisan db:seed
```

7. Build assets
```bash
npm run build
```

8. Jalankan aplikasi
```bash
php artisan serve
```

## Konfigurasi Device

Pastikan device X100-C sudah dikonfigurasi dengan:
- IP address yang dapat diakses
- SOAP service aktif
- Username dan password sesuai dengan `.env`

## Command Artisan

### Sinkronisasi Fingerprint
```bash
# Sinkronisasi manual
php artisan fingerprint:sync

# Sinkronisasi paksa (reset semua data)
php artisan fingerprint:sync --force

# Sinkronisasi device tertentu
php artisan fingerprint:sync --device=1
```

### Monitoring
```bash
# Cek status device
php artisan fingerprint:status

# Reset monitoring data
php artisan fingerprint:reset-monitoring
```

## Scheduler

Tambahkan ke crontab untuk auto-sync:
```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

Scheduled tasks:
- Real-time sync setiap 5 menit
- Full sync setiap 30 menit
- Cleanup monitoring data harian
- Reset device failure count harian

## API Endpoints

### Monitoring
- `GET /api/monitoring/statistics` - Statistik sistem
- `GET /api/fingerprint/health` - Status fingerprint service

### Callback
- `POST /api/fingerprint/callback` - Endpoint untuk device callback

## Real-time Features

Sistem menggunakan Laravel Echo dengan Pusher untuk:
- Update attendance real-time
- Notifikasi status device
- Monitoring dashboard live

## Struktur Database

- `users` - Data pengguna
- `cabangs` - Data cabang
- `attendances` - Data absensi
- `fingerprint_devices` - Konfigurasi device
- `monitoring_logs` - Log monitoring sistem

## Troubleshooting

### Device tidak terdeteksi
1. Pastikan IP device dapat di-ping
2. Cek konfigurasi SOAP di device
3. Verifikasi username/password
4. Cek firewall dan port

### Sinkronisasi gagal
1. Jalankan `php artisan fingerprint:status`
2. Cek log di `storage/logs/fingerprint-*.log`
3. Reset dengan `php artisan fingerprint:sync --force`

## Kontribusi

1. Fork repository
2. Buat feature branch
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## Lisensi

MIT License

## Support

Untuk bantuan teknis, silakan buat issue di repository ini.