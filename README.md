# AFMS (Attendance & Financial Management System)

Sistem manajemen absensi dan keuangan terintegrasi dengan teknologi modern untuk CV Tiga Putra Perkasa.

## Fitur Utama

- ✅ Sistem absensi digital dengan fingerprint
- ✅ Dashboard monitoring real-time
- ✅ Manajemen karyawan dan cabang
- ✅ Sistem BON (Bon Karyawan)
- ✅ Laporan payroll dan absensi
- ✅ Multi-role access (Admin, Manager, Karyawan)
- ✅ API RESTful untuk integrasi
- ✅ Responsive web design

## Teknologi

- **Frontend**: Next.js 13, TypeScript, Tailwind CSS
- **Backend**: Laravel 10 API
- **Database**: PostgreSQL
- **Cache**: Redis
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx
- **SSL**: Let's Encrypt / Certbot

## Instalasi

### Prerequisites
- Docker & Docker Compose
- Git
- Node.js 18+ (untuk development)

### Quick Start

1. Clone repository
```bash
git clone <repository-url>
cd afms-nextjs
```

2. Setup environment files
```bash
# Copy environment templates
cp .env.example .env.local
cp laravel-api/.env.example laravel-api/.env
```

3. Configure environment variables
```bash
# Edit .env.local for Next.js
# Edit laravel-api/.env for Laravel API
```

4. Start with Docker
```bash
# Development
docker-compose -f docker-compose.backend.yml up -d

# Production
docker-compose -f docker-compose.production.yml up -d
```

5. Setup database dan aplikasi
```bash
# Laravel setup (akan otomatis dijalankan oleh Docker)
docker-compose exec laravel-api php artisan key:generate
docker-compose exec laravel-api php artisan migrate
docker-compose exec laravel-api php artisan db:seed
```

6. Akses aplikasi
```
# Development
Frontend: http://localhost:3000
API: http://localhost:8000

# Production
Frontend: https://cvtigaputraperkasa.id
API: https://api.cvtigaputraperkasa.id
```

## Environment Variables

### Next.js (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.cvtigaputraperkasa.id
NEXTAUTH_URL=https://cvtigaputraperkasa.id
JWT_SECRET=your-secure-jwt-secret
NEXTAUTH_SECRET=your-secure-nextauth-secret
```

### Laravel API (.env)
```env
APP_URL=https://api.cvtigaputraperkasa.id
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_DATABASE=afms_database
DB_USERNAME=afms_user
DB_PASSWORD=your-secure-password
REDIS_HOST=redis
```

## Docker Commands

### Development
```bash
# Start services
docker-compose -f docker-compose.backend.yml up -d

# View logs
docker-compose logs -f laravel-api
docker-compose logs -f postgres

# Stop services
docker-compose -f docker-compose.backend.yml down
```

### Production
```bash
# Deploy
docker-compose -f docker-compose.production.yml up -d

# Update application
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d --force-recreate
```

## Deployment

Lihat [DEPLOYMENT.md](DEPLOYMENT.md) untuk panduan lengkap deployment ke VPS.

### Quick Deploy ke VPS
```bash
# 1. Clone repository
git clone <repository-url>
cd afms-nextjs

# 2. Setup environment
cp .env.example .env.local
cp laravel-api/.env.example laravel-api/.env

# 3. Configure domain and SSL
# Edit environment files with production values

# 4. Deploy with Docker
docker-compose -f docker-compose.production.yml up -d
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - User profile

### Absensi
- `GET /api/absensi` - List absensi
- `POST /api/absensi` - Create absensi
- `GET /api/absensi/statistics` - Statistik absensi

### BON
- `GET /api/bon` - List BON
- `POST /api/bon` - Create BON
- `PUT /api/bon/{id}/approve` - Approve BON

### Health Check
- `GET /api/health` - Application health status

## Struktur Database

- `users` - Data pengguna/karyawan
- `cabangs` - Data cabang
- `jabatans` - Data jabatan
- `absensis` - Data absensi
- `bons` - Data BON karyawan
- `payrolls` - Data payroll

## Troubleshooting

### Container tidak bisa start
```bash
# Check logs
docker-compose logs laravel-api
docker-compose logs postgres

# Restart services
docker-compose restart
```

### Database connection error
1. Pastikan PostgreSQL container running
2. Cek environment variables
3. Verify database credentials

### SSL Certificate issues
1. Cek DNS pointing ke VPS
2. Verify domain ownership
3. Restart nginx container

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