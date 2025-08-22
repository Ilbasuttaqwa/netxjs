import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Loading from '../ui/Loading'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (!session) {
      router.push('/login')
      return
    }

    // Check admin requirement
    if (requireAdmin && session.user?.email !== 'admin@afms.com') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router, requireAdmin])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (!session) {
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