import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { Button } from '../components/ui/Button'
import Card from '../components/ui/Card'
import Loading from '../components/ui/Loading'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { addToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        router.replace('/dasbor')
      } else {
        setCheckingSession(false)
      }
    }
    checkSession()
  }, [])

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/otentikasi/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await response.json()
       
       if (response.ok && data.success && data.data.token) {
          localStorage.setItem('auth_token', data.data.token)
           localStorage.setItem('auth_user', JSON.stringify(data.data.user))
           addToast({ title: 'Login Berhasil', message: 'Selamat datang!', type: 'success' })
           
           // Redirect based on role
           const user = data.data.user
           if (user.role === 'admin') {
             router.replace('/admin/dashboard')
           } else if (user.role === 'manager') {
             router.replace('/manager/dashboard')
           } else {
             router.replace('/dasbor')
           }
        } else {
         addToast({ title: 'Login Gagal', message: data.message || 'Email atau password salah.', type: 'error' })
       }
    } catch (error) {
      addToast({ title: 'Kesalahan', message: 'Terjadi kesalahan saat login.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Masuk ke AFMS
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistem Manajemen Absensi Fingerprint
          </p>
        </div>
        <Card className="p-8">
          <div className="space-y-6">
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan email Anda"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Kata Sandi
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Masukkan kata sandi Anda"
                  required
                />
              </div>
              <Button
                type="submit"
                loading={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Masuk
              </Button>
            </form>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Dengan masuk, Anda menyetujui penggunaan sistem AFMS
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Demo: Gunakan email dan password apa saja untuk masuk
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}