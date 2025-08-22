# Docker Troubleshooting Guide - AFMS

## Masalah Tampilan Acak-acakan Setelah Upload Docker

### Penyebab Umum
1. **Static files tidak ter-copy dengan benar**
2. **CSS/Tailwind tidak ter-build dengan benar**
3. **Environment variables tidak ter-set**
4. **Next.js standalone output tidak dikonfigurasi dengan benar**

### Solusi yang Telah Diterapkan

#### 1. Perbaikan Dockerfile
```dockerfile
# Menggunakan standalone output yang benar
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Memastikan static assets ter-copy
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/styles ./styles
```

#### 2. Perbaikan Next.js Config
```javascript
// next.config.js
output: 'standalone',
experimental: {
  outputFileTracingRoot: __dirname,
},
```

#### 3. Menggunakan server.js untuk standalone
```dockerfile
CMD ["node", "server.js"]
```

### Langkah Troubleshooting

#### Quick Fix - Rebuild Container
```bash
# Untuk Windows PowerShell
.\docker-rebuild.ps1

# Untuk Linux/Mac
./docker-rebuild.sh
```

#### Manual Troubleshooting

1. **Stop dan hapus container lama**
```bash
docker-compose down --rmi all --volumes --remove-orphans
```

2. **Clear build cache**
```bash
docker builder prune -f
```

3. **Rebuild tanpa cache**
```bash
docker-compose build --no-cache
```

4. **Start ulang**
```bash
docker-compose up -d
```

#### Debugging Container

1. **Masuk ke container**
```bash
docker-compose exec app sh
```

2. **Periksa file structure**
```bash
ls -la /app
ls -la /app/.next
ls -la /app/public
ls -la /app/styles
```

3. **Periksa environment variables**
```bash
env | grep NEXT
```

4. **Periksa logs**
```bash
docker-compose logs app
```

### Verifikasi Setelah Perbaikan

1. **Health Check**
```bash
curl http://localhost:3000/api/health
```

2. **Periksa CSS Loading**
   - Buka browser developer tools
   - Periksa Network tab untuk CSS files
   - Pastikan tidak ada 404 errors

3. **Periksa Static Files**
   - Akses http://localhost:3000/_next/static/
   - Pastikan files ter-serve dengan benar

### Environment Variables Penting

```env
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=AFMS - Attendance & Fingerprint Management System
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=/api
```

### Monitoring dan Logs

```bash
# Real-time logs
docker-compose logs -f

# Logs untuk service tertentu
docker-compose logs -f app

# Container status
docker-compose ps

# Resource usage
docker stats
```

### Tips Pencegahan

1. **Selalu test local build sebelum Docker**
```bash
npm run build
npm start
```

2. **Gunakan .dockerignore yang benar**
```
node_modules
.next
.git
*.log
```

3. **Periksa Tailwind config**
   - Pastikan content paths benar
   - Pastikan plugins ter-install

4. **Environment consistency**
   - Gunakan .env.example sebagai template
   - Pastikan semua required variables ter-set

### Kontak Support

Jika masalah masih berlanjut:
1. Jalankan `docker-compose logs > debug.log`
2. Sertakan informasi:
   - OS dan Docker version
   - Error messages
   - Steps yang sudah dicoba