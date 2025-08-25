import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/button'
import Card from '../../components/ui/Card'

const errors = {
  Signin: 'Coba masuk dengan akun yang berbeda.',
  OAuthSignin: 'Coba masuk dengan akun yang berbeda.',
  OAuthCallback: 'Coba masuk dengan akun yang berbeda.',
  OAuthCreateAccount: 'Coba masuk dengan akun yang berbeda.',
  EmailCreateAccount: 'Coba masuk dengan akun yang berbeda.',
  Callback: 'Coba masuk dengan akun yang berbeda.',
  OAuthAccountNotLinked: 'Untuk mengonfirmasi identitas Anda, masuk dengan akun yang sama yang Anda gunakan sebelumnya.',
  EmailSignin: 'Email tidak dapat dikirim.',
  CredentialsSignin: 'Masuk gagal. Periksa detail yang Anda berikan sudah benar.',
  default: 'Tidak dapat masuk.'
}

export default function AuthError() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    const { error: errorType } = router.query
    if (errorType) {
      setError(errors[errorType as keyof typeof errors] || errors.default)
    }
  }, [router.query])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Terjadi Kesalahan
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistem Manajemen Absensi Fingerprint
          </p>
        </div>
        
        <Card className="p-8">
          <div className="text-center space-y-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Gagal Masuk
              </h3>
              <p className="text-sm text-gray-600">
                {error || 'Terjadi kesalahan yang tidak diketahui.'}
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                Coba Lagi
              </Button>
              
              <Button
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full"
              >
                Kembali ke Beranda
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}