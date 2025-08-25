# Laravel API Backend for Fingerprint Device Integration

Laravel API backend yang berfungsi sebagai jembatan antara fingerprint device dan NextJS frontend application.

## Features

- **Fingerprint Device Integration**: Komunikasi dengan fingerprint device melalui HTTP/TCP
- **Real-time Attendance Processing**: Pemrosesan data absensi secara real-time
- **API Bridge**: Jembatan antara Laravel backend dan NextJS frontend
- **Device Management**: Manajemen device fingerprint
- **Employee Management**: Manajemen data karyawan
- **Attendance Rules**: Sistem aturan untuk perhitungan absensi
- **Cloud Ready**: Siap untuk deployment di cloud (Domainesia)

## Installation

### Prerequisites

- PHP 8.1 atau lebih tinggi
- Composer
- MySQL/MariaDB
- Laravel 10

### Setup

1. **Install Dependencies**
   ```bash
   composer install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit file `.env` dan sesuaikan konfigurasi:
   ```env
   # Database
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=fingerprint_api
   DB_USERNAME=root
   DB_PASSWORD=
   
   # Fingerprint Device
   FINGERPRINT_DEVICE_IP=192.168.1.100
   FINGERPRINT_DEVICE_PORT=4370
   FINGERPRINT_DEVICE_USERNAME=admin
   FINGERPRINT_DEVICE_PASSWORD=123456
   
   # NextJS Integration
   NEXTJS_API_URL=http://localhost:3002/api
   NEXTJS_API_TOKEN=your-nextjs-api-token
   
   # API Security
   API_TOKEN=your-secure-api-token
   ```

3. **Generate Application Key**
   ```bash
   php artisan key:generate
   ```

4. **Run Migrations**
   ```bash
   php artisan migrate
   ```

5. **Start Development Server**
   ```bash
   php artisan serve --port=8001
   ```

## API Endpoints

### Public Endpoints (Fingerprint Device Callbacks)

- `POST /api/fingerprint/attendance` - Receive attendance data from device
- `GET /api/fingerprint/device/{deviceId}/status` - Get device status
- `POST /api/fingerprint/device/{deviceId}/sync` - Sync device data
- `POST /api/fingerprint/device/{deviceId}/test` - Test device connection

### Protected Endpoints (Require Authentication)

#### Device Management
- `GET /api/devices` - List all devices
- `POST /api/devices` - Create new device
- `GET /api/devices/{device}` - Get device details
- `PUT /api/devices/{device}` - Update device
- `DELETE /api/devices/{device}` - Delete device

#### Employee Management
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create new employee
- `GET /api/employees/{employee}` - Get employee details
- `PUT /api/employees/{employee}` - Update employee
- `DELETE /api/employees/{employee}` - Delete employee

#### Attendance Management
- `GET /api/attendances` - List all attendances
- `GET /api/attendances/{attendance}` - Get attendance details
- `PUT /api/attendances/{attendance}` - Update attendance
- `DELETE /api/attendances/{attendance}` - Delete attendance
- `POST /api/attendances/bulk-process` - Bulk process attendances

### Bridge Endpoints
- `POST /api/bridge/nextjs/attendance` - Forward attendance to NextJS
- `GET /api/bridge/nextjs/sync-status` - Get sync status

## Database Schema

### Tables

1. **branches** - Data cabang/lokasi
2. **positions** - Data jabatan
3. **employees** - Data karyawan
4. **fingerprint_devices** - Data device fingerprint
5. **fingerprint_attendances** - Data absensi dari fingerprint
6. **attendance_rules** - Aturan perhitungan absensi

## Configuration

### Fingerprint Device

Konfigurasi device fingerprint di file `config/fingerprint.php`:

```php
'default_device' => [
    'ip' => env('FINGERPRINT_DEVICE_IP', '192.168.1.100'),
    'port' => env('FINGERPRINT_DEVICE_PORT', 4370),
    'username' => env('FINGERPRINT_DEVICE_USERNAME', 'admin'),
    'password' => env('FINGERPRINT_DEVICE_PASSWORD', '123456'),
],
```

### NextJS Integration

Konfigurasi integrasi dengan NextJS:

```php
'nextjs_integration' => [
    'api_url' => env('NEXTJS_API_URL', 'http://localhost:3002/api'),
    'api_token' => env('NEXTJS_API_TOKEN', ''),
],
```

## Deployment

### Cloud Domainesia

1. **Upload Files**
   - Upload semua file ke direktori `public_html/api`
   
2. **Database Setup**
   - Buat database MySQL di cPanel
   - Import struktur database
   
3. **Environment Configuration**
   - Sesuaikan konfigurasi database di `.env`
   - Set URL production di `APP_URL`
   
4. **Permissions**
   ```bash
   chmod -R 755 storage
   chmod -R 755 bootstrap/cache
   ```

5. **Optimize for Production**
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```

## Security

- API menggunakan token authentication
- Rate limiting untuk mencegah abuse
- Input validation pada semua endpoint
- CORS configuration untuk frontend integration

## Monitoring

- Health check endpoint: `GET /api/health`
- Device status monitoring
- Attendance processing logs
- Error tracking dan reporting

## Support

Untuk bantuan dan support, silakan hubungi tim development.