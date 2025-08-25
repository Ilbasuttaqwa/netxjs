import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Loading from '../ui/Loading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const auth = useAuth();
  const user = auth.user;
  const isLoading = auth.isLoading;
  const isAuthenticated = auth.isAuthenticated;
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Redirect to login if not authenticated
        router.replace('/login');
        return;
      }

      if (requiredRole && user && !requiredRole.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        if (user.role === 'admin' || user.role === 'manager') {
          router.replace('/admin/dashboard');
        } else {
          router.replace('/dasbor');
        }
        return;
      }
    }
  }, [user, isLoading, isAuthenticated, router, requiredRole]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Show loading while redirecting
  if (!isAuthenticated || (requiredRole && user && !requiredRole.includes(user.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  // Render the protected component
  return <>{children}</>;
};

export default ProtectedRoute;