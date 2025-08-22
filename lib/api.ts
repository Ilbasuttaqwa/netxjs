import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, PaginatedResponse, LoginCredentials, AuthUser, User, Cabang, Jabatan, Karyawan, Absensi, MonitoringFingerprint, DashboardStats, FilterOptions } from '../types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        // Use Next.js router for navigation instead of window.location
        const { pathname } = window.location;
        if (pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to handle API responses
const handleResponse = <T>(response: AxiosResponse<ApiResponse<T>>): ApiResponse<T> => {
  return response.data;
};

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<ApiResponse<{ user: AuthUser; token: string }>> => {
    const response = await api.post('/auth/login', credentials);
    return handleResponse(response);
  },

  logout: async (): Promise<ApiResponse> => {
    const response = await api.post('/auth/logout');
    return handleResponse(response);
  },

  getProfile: async (): Promise<ApiResponse<AuthUser>> => {
    const response = await api.get('/auth/profile');
    return handleResponse(response);
  },

  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    const response = await api.post('/auth/refresh');
    return handleResponse(response);
  },
};

// Users API
export const usersApi = {
  getUsers: async (filters?: FilterOptions): Promise<ApiResponse<PaginatedResponse<User>>> => {
    const response = await api.get('/users', { params: filters });
    return handleResponse(response);
  },

  getUser: async (id: number): Promise<ApiResponse<User>> => {
    const response = await api.get(`/users/${id}`);
    return handleResponse(response);
  },

  createUser: async (data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.post('/users', data);
    return handleResponse(response);
  },

  updateUser: async (id: number, data: Partial<User>): Promise<ApiResponse<User>> => {
    const response = await api.put(`/users/${id}`, data);
    return handleResponse(response);
  },

  deleteUser: async (id: number): Promise<ApiResponse> => {
    const response = await api.delete(`/users/${id}`);
    return handleResponse(response);
  },
};

// Cabang API
export const cabangApi = {
  getCabang: async (filters?: FilterOptions): Promise<ApiResponse<PaginatedResponse<Cabang>>> => {
    const response = await api.get('/cabang', { params: filters });
    return handleResponse(response);
  },

  getCabangById: async (id: number): Promise<ApiResponse<Cabang>> => {
    const response = await api.get(`/cabang/${id}`);
    return handleResponse(response);
  },

  createCabang: async (data: Partial<Cabang>): Promise<ApiResponse<Cabang>> => {
    const response = await api.post('/cabang', data);
    return handleResponse(response);
  },

  updateCabang: async (id: number, data: Partial<Cabang>): Promise<ApiResponse<Cabang>> => {
    const response = await api.put(`/cabang/${id}`, data);
    return handleResponse(response);
  },

  deleteCabang: async (id: number): Promise<ApiResponse> => {
    const response = await api.delete(`/cabang/${id}`);
    return handleResponse(response);
  },
};

// Jabatan API
export const jabatanApi = {
  getJabatan: async (filters?: FilterOptions): Promise<ApiResponse<PaginatedResponse<Jabatan>>> => {
    const response = await api.get('/jabatan', { params: filters });
    return handleResponse(response);
  },

  getJabatanById: async (id: number): Promise<ApiResponse<Jabatan>> => {
    const response = await api.get(`/jabatan/${id}`);
    return handleResponse(response);
  },

  createJabatan: async (data: Partial<Jabatan>): Promise<ApiResponse<Jabatan>> => {
    const response = await api.post('/jabatan', data);
    return handleResponse(response);
  },

  updateJabatan: async (id: number, data: Partial<Jabatan>): Promise<ApiResponse<Jabatan>> => {
    const response = await api.put(`/jabatan/${id}`, data);
    return handleResponse(response);
  },

  deleteJabatan: async (id: number): Promise<ApiResponse> => {
    const response = await api.delete(`/jabatan/${id}`);
    return handleResponse(response);
  },
};

// Karyawan API
export const karyawanApi = {
  getKaryawan: async (filters?: FilterOptions): Promise<ApiResponse<PaginatedResponse<Karyawan>>> => {
    const response = await api.get('/karyawan', { params: filters });
    return handleResponse(response);
  },

  getKaryawanById: async (id: number): Promise<ApiResponse<Karyawan>> => {
    const response = await api.get(`/karyawan/${id}`);
    return handleResponse(response);
  },

  createKaryawan: async (data: Partial<Karyawan>): Promise<ApiResponse<Karyawan>> => {
    const response = await api.post('/karyawan', data);
    return handleResponse(response);
  },

  updateKaryawan: async (id: number, data: Partial<Karyawan>): Promise<ApiResponse<Karyawan>> => {
    const response = await api.put(`/karyawan/${id}`, data);
    return handleResponse(response);
  },

  deleteKaryawan: async (id: number): Promise<ApiResponse> => {
    const response = await api.delete(`/karyawan/${id}`);
    return handleResponse(response);
  },
};

// Absensi API
export const absensiApi = {
  getAbsensi: async (filters?: FilterOptions): Promise<ApiResponse<PaginatedResponse<Absensi>>> => {
    const response = await api.get('/absensi', { params: filters });
    return handleResponse(response);
  },

  getAbsensiById: async (id: number): Promise<ApiResponse<Absensi>> => {
    const response = await api.get(`/absensi/${id}`);
    return handleResponse(response);
  },

  createAbsensi: async (data: Partial<Absensi>): Promise<ApiResponse<Absensi>> => {
    const response = await api.post('/absensi', data);
    return handleResponse(response);
  },

  updateAbsensi: async (id: number, data: Partial<Absensi>): Promise<ApiResponse<Absensi>> => {
    const response = await api.put(`/absensi/${id}`, data);
    return handleResponse(response);
  },

  deleteAbsensi: async (id: number): Promise<ApiResponse> => {
    const response = await api.delete(`/absensi/${id}`);
    return handleResponse(response);
  },

  syncFingerprint: async (): Promise<ApiResponse> => {
    const response = await api.post('/absensi/sync-fingerprint');
    return handleResponse(response);
  },

  getByDate: async (date: string): Promise<ApiResponse<Absensi>> => {
    const response = await api.get(`/absensi/date/${date}`);
    return handleResponse(response);
  },

  getMyAttendance: async (filters?: FilterOptions): Promise<ApiResponse<PaginatedResponse<Absensi>>> => {
    const response = await api.get('/absensi/my-attendance', { params: filters });
    return handleResponse(response);
  },

  clockIn: async (data: { latitude: number; longitude: number }): Promise<ApiResponse<Absensi>> => {
    const response = await api.post('/absensi/clock-in', data);
    return handleResponse(response);
  },

  clockOut: async (data: { latitude: number; longitude: number }): Promise<ApiResponse<Absensi>> => {
    const response = await api.post('/absensi/clock-out', data);
    return handleResponse(response);
  },

  export: async (filters?: any): Promise<ApiResponse<Blob>> => {
    const response = await api.get('/absensi/export', { params: filters, responseType: 'blob' });
    return handleResponse(response);
  },
};

// Monitoring API
export const monitoringApi = {
  getDevices: async (): Promise<ApiResponse<MonitoringFingerprint[]>> => {
    const response = await api.get('/monitoring/devices');
    return handleResponse(response);
  },

  getDeviceStatus: async (deviceId: string): Promise<ApiResponse<MonitoringFingerprint>> => {
    const response = await api.get(`/monitoring/devices/${deviceId}/status`);
    return handleResponse(response);
  },

  syncDevice: async (deviceId: string): Promise<ApiResponse> => {
    const response = await api.post(`/monitoring/devices/${deviceId}/sync`);
    return handleResponse(response);
  },

  testConnection: async (deviceId: string): Promise<ApiResponse> => {
    const response = await api.post(`/monitoring/devices/${deviceId}/test`);
    return handleResponse(response);
  },
};

// Payroll API
export const payrollApi = {
  getDeductions: async (period: string): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/payroll/deductions?period=${period}`);
    return handleResponse(response);
  },

  processDeductions: async (period: string): Promise<ApiResponse> => {
    const response = await api.post('/payroll/deductions', { period });
    return handleResponse(response);
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    const response = await api.get('/dashboard/stats');
    return handleResponse(response);
  },

  getAttendanceChart: async (period: string = '7days'): Promise<ApiResponse<any>> => {
    const response = await api.get('/dashboard/attendance-chart', { params: { period } });
    return handleResponse(response);
  },

  getRecentActivities: async (limit: number = 10): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/dashboard/recent-activities', { params: { limit } });
    return handleResponse(response);
  },
};

export default api;