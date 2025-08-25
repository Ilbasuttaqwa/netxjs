// User types
export interface User {
  id: number;
  name: string;
  role: 'admin' | 'manager' | 'user';
  cabang_id?: number;
  jabatan_id?: number;
  status: 'aktif' | 'tidak_aktif';
  created_at: string;
  updated_at: string;
  cabang?: Cabang;
  jabatan?: Jabatan;
}

// Cabang types
export interface Cabang {
  id: number;
  nama_cabang: string;
  alamat: string;
  telepon?: string;
  status: 'aktif' | 'tidak_aktif';
  created_at: string;
  updated_at: string;
}

// Jabatan types
export interface Jabatan {
  id: number;
  nama_jabatan: string;
  deskripsi?: string;
  gaji_pokok: number;
  created_at: string;
  updated_at: string;
}

// Karyawan types
export interface Karyawan {
  id: number;
  nama: string;
  telepon?: string;
  alamat?: string;
  tanggal_lahir?: string;
  jenis_kelamin: 'L' | 'P';
  cabang_id: number;
  jabatan_id: number;
  tanggal_masuk: string;
  status: 'aktif' | 'tidak_aktif';
  fingerprint_id?: string;
  created_at: string;
  updated_at: string;
  cabang?: Cabang;
  jabatan?: Jabatan;
}

// Absensi types
export interface Absensi {
  id: number;
  karyawan_id: number;
  tanggal: string;
  jam_masuk?: string;
  jam_keluar?: string;
  status: 'hadir' | 'terlambat' | 'alpha' | 'izin' | 'sakit';
  keterangan?: string;
  created_at: string;
  updated_at: string;
  karyawan?: Karyawan;
}

// Monitoring types
export interface MonitoringFingerprint {
  id: number;
  device_id: string;
  device_name: string;
  ip_address: string;
  port: number;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  last_sync?: string;
  total_users: number;
  total_records: number;
  created_at: string;
  updated_at: string;
  // Enhanced monitoring fields
  cabang_id?: number;
  cabang?: Cabang;
  lokasi?: string;
  firmware_version?: string;
  battery_level?: number;
  temperature?: number;
  memory_usage?: number;
  storage_usage?: number;
  last_heartbeat?: string;
  error_message?: string;
  sync_status?: 'idle' | 'syncing' | 'error';
  offline_records?: number;
  connection_quality?: 'excellent' | 'good' | 'poor' | 'critical';
}

// Device Status Log types
export interface DeviceStatusLog {
  id: number;
  device_id: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  firmware_version?: string;
  battery_level?: number;
  temperature?: number;
  memory_usage?: number;
  storage_usage?: number;
  error_message?: string;
  sync_records_count?: number;
  created_at: string;
  device?: MonitoringFingerprint;
}

// Device Sync History types
export interface DeviceSyncHistory {
  id: number;
  device_id: string;
  sync_type: 'manual' | 'auto' | 'scheduled';
  records_synced: number;
  status: 'success' | 'failed' | 'partial';
  error_message?: string;
  duration_seconds?: number;
  started_at: string;
  completed_at?: string;
  device?: MonitoringFingerprint;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// Auth types
export interface LoginCredentials {
  nama_pegawai: string;
  password: string;
  remember?: boolean;
}

export interface AuthUser {
  id: number;
  nama_pegawai: string;
  role: 'admin' | 'manager' | 'user';
  id_cabang?: number;
  id_jabatan?: number;
  cabang?: Cabang;
  jabatan?: Jabatan;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Form types
export interface FormErrors {
  [key: string]: string | string[];
}

// Dashboard types
export interface DashboardStats {
  total_karyawan: number;
  total_cabang: number;
  total_hadir_hari_ini: number;
  total_terlambat_hari_ini: number;
  total_alpha_hari_ini: number;
  persentase_kehadiran: number;
}

// Chart types
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }[];
}

// Table types
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableProps {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Toast types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  showToast: (title: string, type: 'success' | 'error' | 'warning' | 'info', message?: string) => void;
}

// Filter types
export interface FilterOptions {
  search?: string;
  status?: string;
  cabang_id?: number;
  jabatan_id?: number;
  karyawan_id?: number;
  tanggal_dari?: string;
  tanggal_sampai?: string;
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  page?: number;
  per_page?: number;
  limit?: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

// Bon/Advance types
export interface Bon {
  id: number;
  karyawan_id: number;
  jumlah_bon: number;
  sisa_bon: number;
  cicilan_per_bulan: number;
  tanggal_pengajuan: string;
  tanggal_persetujuan?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  keterangan?: string;
  approved_by?: number;
  created_at: string;
  updated_at: string;
  karyawan?: Karyawan;
  approver?: User;
}

export interface BonCicilan {
  id: number;
  bon_id: number;
  periode: string; // YYYY-MM format
  jumlah_cicilan: number;
  tanggal_potong: string;
  status: 'pending' | 'processed' | 'cancelled';
  created_at: string;
  updated_at: string;
  bon?: Bon;
}

export interface BonFormData {
  karyawan_id: number;
  jumlah_bon: number;
  cicilan_per_bulan: number;
  keterangan?: string;
}

export interface BonStats {
  total_bon_aktif: number;
  total_nilai_bon: number;
  total_cicilan_bulan_ini: number;
  total_karyawan_bon: number;
}