import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TataLetakDasbor from '../../components/layouts/TataLetakDasbor';
import { withAdminOrManagerAuth } from '../../lib/withManagerAuth';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from '../../components/dashboard/StatsCard';
import RecentActivities from '../../components/dashboard/RecentActivities';
import GrafikKehadiran from '../../components/dashboard/GrafikKehadiran';
import { 
  UsersIcon, 
  BuildingOfficeIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon,
  ChevronDownIcon
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
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalBranches: 0,
    todayAttendance: 0,
    lateToday: 0,
    absentToday: 0,
    attendancePercentage: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dasbor/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep stats as initialized (all zeros) if API fails
      setStats({
        totalEmployees: 0,
        totalBranches: 0,
        todayAttendance: 0,
        lateToday: 0,
        absentToday: 0,
        attendancePercentage: 0
      });
    } finally {
      setLoadingStats(false);
    }
  };

  if (loadingStats) {
    return (
      <TataLetakDasbor>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </TataLetakDasbor>
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
    <TataLetakDasbor>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
              <p className="text-gray-600 mt-1">
                Selamat datang, {user.nama_pegawai} ({user.role})
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
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <span className="font-medium">Aksi Cepat</span>
                <ChevronDownIcon className={`h-5 w-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      router.push('/admin/pemantauan');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
                  >
                    <ComputerDesktopIcon className="h-5 w-5 text-blue-600" />
                    <span className="text-gray-700">Pemantauan Sidik Jari</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push('/admin/karyawan');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
                  >
                    <UsersIcon className="h-5 w-5 text-green-600" />
                    <span className="text-gray-700">Kelola Karyawan</span>
                  </button>
                  <button
                    onClick={() => {
                      router.push('/admin/absensi');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                  >
                    <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
                    <span className="text-gray-700">Laporan Absensi</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts and Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GrafikKehadiran />
          <RecentActivities />
        </div>
      </div>
    </TataLetakDasbor>
  );
}

export default withAdminOrManagerAuth(AdminDashboard);