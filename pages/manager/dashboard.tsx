import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { withManagerAuth } from '../../lib/withManagerAuth';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivities from '../../components/dashboard/RecentActivities';
import AttendanceChart from '../../components/dashboard/AttendanceChart';
import { 
  UsersIcon, 
  BuildingOfficeIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalEmployees: number;
  totalBranches: number;
  todayAttendance: number;
  lateToday: number;
  absentToday: number;
  attendancePercentage: number;
}

function ManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalBranches: 0,
    todayAttendance: 0,
    lateToday: 0,
    absentToday: 0,
    attendancePercentage: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default data for manager (limited to their branch)
      setStats({
        totalEmployees: 25, // Only employees in manager's branch
        totalBranches: 1,   // Manager only manages one branch
        todayAttendance: 23,
        lateToday: 2,
        absentToday: 2,
        attendancePercentage: 92.0
      });
    } finally {
      setLoadingStats(false);
    }
  };

  if (loadingStats) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard Manager
              </h1>
              <p className="text-gray-600">
                Selamat datang, {user?.nama_pegawai} - {user?.cabang?.nama_cabang || 'Cabang Utama'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Manager
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Karyawan"
            value={stats.totalEmployees.toString()}
            icon={<UsersIcon className="h-6 w-6" />}
            color="info"
          />
          <StatsCard
            title="Hadir Hari Ini"
            value={stats.todayAttendance.toString()}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            color="success"
          />
          <StatsCard
            title="Terlambat"
            value={stats.lateToday.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            color="warning"
          />
          <StatsCard
            title="Tidak Hadir"
            value={stats.absentToday.toString()}
            icon={<XCircleIcon className="h-6 w-6" />}
            color="danger"
          />
        </div>

        {/* Attendance Percentage */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Persentase Kehadiran Cabang
            </h2>
            <ChartBarIcon className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex items-center">
            <div className="flex-1">
              <div className="bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${stats.attendancePercentage}%` }}
                ></div>
              </div>
            </div>
            <span className="ml-4 text-2xl font-bold text-blue-600">
              {stats.attendancePercentage}%
            </span>
          </div>
        </div>

        {/* Charts and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Grafik Kehadiran Mingguan
            </h2>
            <AttendanceChart />
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Aktivitas Terbaru
            </h2>
            <RecentActivities />
          </div>
        </div>

        {/* Quick Actions for Manager */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Aksi Cepat Manager
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/admin/karyawan"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UsersIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Kelola Karyawan</div>
                <div className="text-sm text-gray-500">Tambah, edit, hapus karyawan</div>
              </div>
            </a>
            
            <a 
              href="/admin/absensi"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CalendarDaysIcon className="h-8 w-8 text-green-600 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Data Absensi</div>
                <div className="text-sm text-gray-500">Lihat dan kelola absensi</div>
              </div>
            </a>
            
            <a 
              href="/admin/monitoring"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ComputerDesktopIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Monitoring</div>
                <div className="text-sm text-gray-500">Monitor perangkat fingerprint</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withManagerAuth(ManagerDashboard);