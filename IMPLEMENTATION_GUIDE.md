# Panduan Implementasi Google OAuth & Ngrok

## 1. Implementasi Google OAuth di Next.js

### Setup NextAuth.js

Buat file `pages/api/auth/[...nextauth].ts`:

```typescript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  }
})
```

### Update Login Page

Modifikasi `pages/login.tsx`:

```typescript
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Login() {
  const router = useRouter()

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [])

  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-center">Login ke AFMS</h2>
        </div>
        <div>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Login dengan Google
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Protect Pages dengan Authentication

Buat HOC untuk protected routes `components/auth/ProtectedRoute.tsx`:

```typescript
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Loading from '../ui/Loading'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) router.push('/login')
  }, [session, status, router])

  if (status === 'loading') {
    return <Loading />
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}
```

## 2. Implementasi Ngrok untuk Public Access

### Langkah-langkah Setup:

1. **Install Ngrok**:
   ```bash
   # Download dari https://ngrok.com/download
   # Extract dan tambahkan ke PATH
   ```

2. **Dapatkan Auth Token**:
   - Daftar di https://dashboard.ngrok.com/signup
   - Copy auth token dari dashboard

3. **Update Environment Variables**:
   ```env
   # Di file .env
   NGROK_AUTH_TOKEN=2mK8X9Y7Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9
   NGROK_DOMAIN=afms-app.ngrok.io  # Jika punya domain custom
   NEXT_PUBLIC_NGROK_URL=https://afms-app.ngrok.io
   ```

4. **Update ngrok.yml**:
   ```yaml
   version: "2"
   authtoken: 2mK8X9Y7Z3A4B5C6D7E8F9G0H1I2J3K4L5M6N7O8P9Q0R1S2T3U4V5W6X7Y8Z9
   tunnels:
     afms-app:
       addr: 3000
       proto: http
       domain: afms-app.ngrok.io  # Hapus jika tidak punya domain custom
       inspect: true
   ```

### Menjalankan Aplikasi dengan Ngrok:

1. **Start aplikasi Next.js**:
   ```bash
   npm run dev
   # atau dengan Docker
   docker run -p 3000:3000 afms-nextjs
   ```

2. **Start ngrok tunnel**:
   ```bash
   # Menggunakan script PowerShell
   .\start-ngrok.ps1
   
   # Atau manual
   ngrok start --config ngrok.yml afms-app
   
   # Atau simple tunnel
   ngrok http 3000
   ```

## 3. Update Google OAuth Redirect URIs

Setelah mendapat URL ngrok, update di Google Cloud Console:

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Pilih project Anda
3. Ke "APIs & Services" → "Credentials"
4. Edit OAuth 2.0 Client ID
5. Tambahkan Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://your-ngrok-url.ngrok.io/api/auth/callback/google
   ```

## 4. Testing Implementation

### Test Google OAuth:
1. Buka `http://localhost:3000/login`
2. Klik "Login dengan Google"
3. Authorize aplikasi
4. Harus redirect ke dashboard

### Test Ngrok Access:
1. Buka URL ngrok (misal: `https://abc123.ngrok.io`)
2. Test login Google dari URL publik
3. Pastikan semua fitur berfungsi

## 5. Monitoring & Debugging

### Ngrok Web Interface:
- Buka `http://localhost:4040` untuk melihat traffic
- Monitor request/response
- Debug webhook dan callback

### Logs untuk Debug:
```typescript
// Tambahkan di pages/api/auth/[...nextauth].ts
export default NextAuth({
  // ... konfigurasi lain
  debug: process.env.NODE_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', code, metadata)
    }
  }
})
```

## 6. Production Considerations

### Security:
- Gunakan HTTPS di production
- Rotate API keys secara berkala
- Jangan commit secrets ke git
- Gunakan proper domain, bukan ngrok untuk production

### Performance:
- Setup proper caching untuk session
- Optimize bundle size
- Use CDN untuk static assets

### Deployment:
```bash
# Build untuk production
npm run build

# Start production server
npm start

# Atau dengan Docker
docker build -t afms-nextjs .
docker run -p 3000:3000 afms-nextjs
```

Dengan implementasi ini, aplikasi AFMS Anda akan memiliki:
- ✅ Google OAuth authentication
- ✅ Public access melalui ngrok
- ✅ Protected routes
- ✅ Session management
- ✅ Proper error handling
- ✅ Development & production ready