// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

// User Types
export interface User {
  id: number;
  nama_pegawai: string;
  role: string;
  device_user_id?: string;
  cabang_id?: number;
  created_at: string;
  updated_at: string;
}

// Device Types
export interface Device {
  id: number;
  device_id: string;
  device_name: string;
  ip_address: string;
  port: number;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  cabang_id: number;
  created_at: string;
  updated_at: string;
}

// Fingerprint Attendance Types
export interface FingerprintAttendance {
  id: number;
  user_id: number;
  device_user_id: string;
  device_id: string;
  attendance_time: string;
  attendance_type: number; // 0 = check-in, 1 = check-out
  verification_type: string;
  is_realtime: boolean;
  processing_status: string;
  work_code?: number;
  created_at: string;
  updated_at: string;
  user?: User;
  device?: Device;
}

// Branch Types
export interface Cabang {
  id: number;
  nama_cabang: string;
  alamat: string;
  telepon?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// Attendance Types
export interface Absensi {
  id: number;
  user_id: number;
  tanggal: string;
  jam_masuk?: string;
  jam_keluar?: string;
  status: 'hadir' | 'tidak_hadir' | 'terlambat' | 'pulang_cepat';
  keterangan?: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

// Event Types
export interface Event {
  id: number;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  type: 'holiday' | 'meeting' | 'training' | 'other';
  status: 'active' | 'cancelled';
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Pagination Types
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

// Form Types
export interface LoginForm {
  nama_pegawai: string;
  password: string;
}

export interface DeviceForm {
  device_id: string;
  device_name: string;
  ip_address: string;
  port: number;
  location: string;
  status: 'active' | 'inactive' | 'maintenance';
  cabang_id: number;
}

export interface UserForm {
  nama_pegawai: string;
  password?: string;
  role: string;
  device_user_id?: string;
  cabang_id?: number;
}

// Filter Types
export interface AttendanceFilter {
  start_date?: string;
  end_date?: string;
  user_id?: number;
  device_id?: string;
  attendance_type?: number;
  processing_status?: string;
}

export interface DeviceFilter {
  status?: string;
  cabang_id?: number;
  search?: string;
}

// Dashboard Types
export interface DashboardStats {
  total_users: number;
  total_devices: number;
  online_devices: number;
  today_attendance: number;
  pending_records: number;
}

// Real-time Types
export interface RealtimeAttendanceData {
  id: number;
  user_id: number;
  device_user_id: string;
  device_id: string;
  attendance_time: string;
  attendance_type: number;
  verification_type: string;
  user_name?: string;
  device_name?: string;
  timestamp: string;
}

export interface SSEMessage {
  type: 'attendance' | 'device_status' | 'system_alert';
  data: any;
  timestamp: string;
}

// Testing Types
export interface TestResult {
  operation: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface TestSummary {
  total_tests: number;
  passed: number;
  failed: number;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  response_time: number;
  timestamp: string;
}