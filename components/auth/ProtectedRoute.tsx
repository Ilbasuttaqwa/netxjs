import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Loading from '../ui/Loading'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    // Add a small delay to prevent hydration issues
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token')
      const userData = localStorage.getItem('auth_user')
      
      if (!token || !userData) {
        router.replace('/login')
        return
      }

      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        
        // Check admin requirement
        if (requireAdmin && parsedUser.role !== 'admin') {
          router.replace('/dashboard')
          return
        }
        
        setLoading(false)
      } catch (error) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        router.replace('/login')
      }
    }
    
    // Use setTimeout to avoid hydration issues
    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [router, requireAdmin])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requireAdmin && session.user?.email !== 'admin@afms.com') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}