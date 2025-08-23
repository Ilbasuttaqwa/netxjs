import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { withAdminOrManagerAuth } from '../../lib/withManagerAuth';
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

function AdminDashboard() {
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
      // Set default data if API fails
      setStats({
        totalEmployees: 150,
        totalBranches: 5,
        todayAttendance: 142,
        lateToday: 8,
        absentToday: 8,
        attendancePercentage: 94.7
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

  if (!user || !['admin', 'manager'].includes(user.role)) {
    return null;
  }

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = currentDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
              <p className="text-gray-600 mt-1">
                Selamat datang, {user.name} ({user.role})
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {user.jabatan?.nama_jabatan} - {user.cabang?.nama_cabang}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">{formattedTime}</p>
              <p className="text-sm text-gray-600">{formattedDate}</p>
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
            title="Total Cabang"
            value={stats.totalBranches.toString()}
            icon={<BuildingOfficeIcon className="h-6 w-6" />}
            color="success"
          />
          <StatsCard
            title="Hadir Hari Ini"
            value={stats.todayAttendance.toString()}
            icon={<CheckCircleIcon className="h-6 w-6" />}
            color="primary"
          />
          <StatsCard
            title="Terlambat Hari Ini"
            value={stats.lateToday.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            color="warning"
          />
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Alpha Hari Ini"
            value={stats.absentToday.toString()}
            icon={<XCircleIcon className="h-6 w-6" />}
            color="danger"
          />
          <StatsCard
            title="Persentase Kehadiran"
            value={`${stats.attendancePercentage}%`}
            icon={<ChartBarIcon className="h-6 w-6" />}
            color="success"
          />
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h3>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/monitoring')}
                className="w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-3"
              >
                <ComputerDesktopIcon className="h-5 w-5 text-blue-600" />
                <span className="text-blue-700 font-medium">Monitoring Fingerprint</span>
              </button>
              <button
                onClick={() => router.push('/admin/karyawan')}
                className="w-full text-left px-4 py-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-3"
              >
                <UsersIcon className="h-5 w-5 text-green-600" />
                <span className="text-green-700 font-medium">Kelola Karyawan</span>
              </button>
              <button
                onClick={() => router.push('/admin/absensi')}
                className="w-full text-left px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-3"
              >
                <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
                <span className="text-purple-700 font-medium">Laporan Absensi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Charts and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AttendanceChart />
          <RecentActivities />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default withAdminOrManagerAuth(AdminDashboard);