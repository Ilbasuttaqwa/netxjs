import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/ui/Loading';

/**
 * Higher-order component untuk proteksi route manager
 * Hanya user dengan role 'manager' yang bisa mengakses halaman yang dibungkus dengan HOC ini
 */
export function withManagerAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const ManagerProtectedComponent = (props: P) => {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          // Redirect ke login jika belum login
          router.replace('/login');
          return;
        }

        if (user && user.role !== 'manager') {
          // Redirect berdasarkan role jika bukan manager
          if (user.role === 'admin') {
            router.replace('/admin/dashboard');
          } else {
            router.replace('/dashboard');
          }
          return;
        }
      }
    }, [user, isLoading, isAuthenticated, router]);

    // Show loading while checking authentication
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loading />
        </div>
      );
    }

    // Show loading while redirecting
    if (!isAuthenticated || !user || user.role !== 'manager') {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loading />
        </div>
      );
    }

    // Render the protected component
    return <WrappedComponent {...props} />;
  };

  // Set display name for debugging
  ManagerProtectedComponent.displayName = `withManagerAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ManagerProtectedComponent;
}

/**
 * Higher-order component untuk proteksi route admin dan manager
 * User dengan role 'admin' atau 'manager' bisa mengakses halaman yang dibungkus dengan HOC ini
 */
export function withAdminOrManagerAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const AdminOrManagerProtectedComponent = (props: P) => {
    const { user, isLoading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          // Redirect ke login jika belum login
          router.replace('/login');
          return;
        }

        if (user && !['admin', 'manager'].includes(user.role)) {
          // Redirect ke dashboard user biasa jika bukan admin/manager
          router.replace('/dashboard');
          return;
        }
      }
    }, [user, isLoading, isAuthenticated, router]);

    // Show loading while checking authentication
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loading />
        </div>
      );
    }

    // Show loading while redirecting
    if (!isAuthenticated || !user || !['admin', 'manager'].includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loading />
        </div>
      );
    }

    // Render the protected component
    return <WrappedComponent {...props} />;
  };

  // Set display name for debugging
  AdminOrManagerProtectedComponent.displayName = `withAdminOrManagerAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AdminOrManagerProtectedComponent;
}

/**
 * Hook untuk mengecek apakah user memiliki role tertentu
 */
export function useRoleCheck() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isUser = user?.role === 'user';
  const isAdminOrManager = user && ['admin', 'manager'].includes(user.role);

  return {
    isAdmin,
    isManager,
    isUser,
    isAdminOrManager,
    role: user?.role,
    hasRole: (roles: string | string[]) => {
      if (!user) return false;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      return allowedRoles.includes(user.role);
    }
  };
}