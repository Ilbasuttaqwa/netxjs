import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, AuthUser, LoginCredentials } from '../types';
import { authApi } from '../lib/api';
import { useToast } from './ToastContext';
import { useRouter } from 'next/router';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: AuthUser; token: string } }
  | { type: 'CLEAR_USER' }
  | { type: 'SET_TOKEN'; payload: string };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { addToast } = useToast();
  const router = useRouter();

  // Load user from localStorage on mount
  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');

      if (token && user) {
        try {
          const parsedUser = JSON.parse(user);
          dispatch({ type: 'SET_USER', payload: { user: parsedUser, token } });
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authApi.login(credentials);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        // Store in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        
        dispatch({ type: 'SET_USER', payload: { user, token } });
        
        addToast({
          type: 'success',
          title: 'Login Berhasil',
          message: `Selamat datang, ${user.name}!`,
        });
        
        // Redirect based on role
        if (user.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        throw new Error(response.message || 'Login gagal');
      }
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      addToast({
        type: 'error',
        title: 'Login Gagal',
        message: error.message || 'Terjadi kesalahan saat login',
      });
      throw error;
    }
  };

  const logout = () => {
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    
    dispatch({ type: 'CLEAR_USER' });
    
    addToast({
      type: 'info',
      title: 'Logout Berhasil',
      message: 'Anda telah keluar dari sistem',
    });
    
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      if (!state.token) return;
      
      const response = await authApi.getProfile();
      
      if (response.success && response.data) {
        const user = response.data;
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        dispatch({ type: 'SET_USER', payload: { user, token: state.token } });
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // If refresh fails, logout user
      logout();
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}