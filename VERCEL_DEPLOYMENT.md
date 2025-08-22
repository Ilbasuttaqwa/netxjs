# Panduan Deployment AFMS ke Vercel

## Prasyarat
1. Akun Vercel
2. Database PostgreSQL (bisa menggunakan Vercel Postgres, Supabase, atau PlanetScale)
3. Repository GitHub yang sudah terhubung dengan Vercel

## Langkah-langkah Deployment

### 1. Persiapan Database
- Buat database PostgreSQL di cloud provider pilihan Anda
- Catat connection string DATABASE_URL

### 2. Environment Variables di Vercel
Tambahkan environment variables berikut di dashboard Vercel:

```
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://your-vercel-domain.vercel.app

# App Configuration
NEXT_PUBLIC_APP_NAME=AFMS - Attendance & Fingerprint Management System
NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_API_URL=/api

# Environment
NODE_ENV=production

# Optional: Google OAuth (jika digunakan)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_API_KEY=your-google-api-key
```

### 3. Build Commands
Pastikan build commands di Vercel sudah benar:
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 4. Database Migration
Setelah deployment pertama, jalankan migration:
```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Verifikasi Dashboard
Setelah deployment berhasil:
1. Akses `https://your-domain.vercel.app/login`
2. Login dengan akun admin
3. Akses `https://your-domain.vercel.app/dashboard`
4. Pastikan semua fitur dashboard berfungsi

## Troubleshooting

### Dashboard Tidak Muncul
1. **Periksa Environment Variables**: Pastikan semua environment variables sudah dikonfigurasi dengan benar
2. **Periksa Database Connection**: Pastikan DATABASE_URL valid dan database dapat diakses
3. **Periksa Build Logs**: Lihat build logs di Vercel untuk error
4. **Periksa Function Logs**: Lihat function logs untuk error runtime

### Error 500 pada API Dashboard
1. Periksa database connection
2. Pastikan tabel sudah ada (jalankan migration)
3. Periksa environment variables JWT_SECRET

### Styling Tidak Muncul
1. Pastikan Tailwind CSS dikonfigurasi dengan benar
2. Periksa build process untuk CSS

## File Penting untuk Vercel
- `vercel.json` - Konfigurasi routing dan functions
- `next.config.js` - Konfigurasi Next.js
- `package.json` - Dependencies dan scripts
- `prisma/schema.prisma` - Database schema

## Catatan Penting
- Dashboard tersedia di route `/dashboard` dan `/admin/dashboard`
- Pastikan user sudah login untuk mengakses dashboard
- Admin dashboard memerlukan role 'admin' atau 'manager'
- API dashboard menggunakan mock data, sesuaikan dengan database real jika diperlukan