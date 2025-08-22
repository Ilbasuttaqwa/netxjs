# Solusi Dashboard Tidak Muncul di Vercel

## Masalah
Dashboard AFMS tidak muncul atau tidak berfungsi dengan baik setelah deployment ke Vercel.

## Penyebab Umum

### 1. Environment Variables Tidak Dikonfigurasi
- `DATABASE_URL` tidak diset atau salah
- `JWT_SECRET` tidak diset
- `NEXTAUTH_SECRET` tidak diset
- `NEXT_PUBLIC_API_URL` tidak diset

### 2. Database Connection Issues
- Database PostgreSQL tidak dapat diakses
- Connection string salah
- Database belum di-migrate

### 3. Build Configuration Issues
- Next.js configuration tidak optimal untuk Vercel
- Prisma client tidak ter-generate
- API routes tidak ter-deploy dengan benar

## Solusi yang Telah Diterapkan

### 1. Konfigurasi Vercel (`vercel.json`)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "next.config.js",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/dashboard",
      "dest": "/dashboard"
    },
    {
      "src": "/admin/(.*)",
      "dest": "/admin/$1"
    }
  ],
  "functions": {
    "pages/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 2. Improved Dashboard API (`/api/dashboard/stats.ts`)
- Menggunakan data real dari database
- Fallback ke mock data jika database tidak tersedia
- Error handling yang lebih baik
- Support untuk role admin dan manager

### 3. Package.json Scripts
```json
{
  "scripts": {
    "deploy": "vercel --prod",
    "deploy:preview": "vercel",
    "postbuild": "prisma generate",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate"
  }
}
```

## Langkah Deployment

### 1. Persiapan Environment Variables di Vercel
Masuk ke Vercel Dashboard → Project Settings → Environment Variables, tambahkan:

```
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_NAME=AFMS - Attendance & Fingerprint Management System
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
NEXT_PUBLIC_API_URL=/api
NODE_ENV=production
```

### 2. Deploy menggunakan Script
```bash
# Windows PowerShell
.\deploy-vercel.ps1

# Atau manual
npm run build
npm run deploy
```

### 3. Database Migration (jika diperlukan)
Setelah deployment pertama:
```bash
# Jalankan di terminal Vercel atau local dengan DATABASE_URL production
npx prisma migrate deploy
npx prisma generate
```

### 4. Verifikasi Dashboard
1. Akses `https://your-domain.vercel.app/login`
2. Login dengan akun admin
3. Akses `https://your-domain.vercel.app/dashboard`
4. Periksa console browser untuk error
5. Periksa Vercel function logs untuk error server

## Troubleshooting

### Dashboard Masih Tidak Muncul
1. **Periksa Vercel Function Logs**
   - Masuk ke Vercel Dashboard
   - Pilih project → Functions tab
   - Lihat logs untuk error

2. **Periksa Browser Console**
   - Buka Developer Tools (F12)
   - Lihat tab Console untuk JavaScript errors
   - Lihat tab Network untuk failed API calls

3. **Test API Endpoints**
   - `https://your-domain.vercel.app/api/dashboard/stats`
   - `https://your-domain.vercel.app/api/auth/profile`

### Error 500 pada API Dashboard
1. Periksa DATABASE_URL di environment variables
2. Pastikan database dapat diakses dari Vercel
3. Periksa Prisma schema dan migration

### Styling Tidak Muncul
1. Periksa Tailwind CSS configuration
2. Pastikan build process berhasil
3. Periksa CSS files di browser Network tab

## File Penting
- `vercel.json` - Konfigurasi Vercel
- `next.config.js` - Konfigurasi Next.js
- `pages/api/dashboard/stats.ts` - API dashboard yang diperbaiki
- `VERCEL_DEPLOYMENT.md` - Panduan lengkap deployment
- `deploy-vercel.ps1` - Script deployment otomatis

## Catatan
- Dashboard tersedia di `/dashboard` (user) dan `/admin/dashboard` (admin)
- API menggunakan fallback ke mock data jika database tidak tersedia
- Semua route dashboard sudah dikonfigurasi di `vercel.json`
- Environment variables harus dikonfigurasi di Vercel Dashboard