import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { DashboardStats } from '@/types';
import { dashboardApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import AttendanceChart from '@/components/dashboard/AttendanceChart';
import RecentActivities from '@/components/dashboard/RecentActivities';
import {
  UsersIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const response = await dashboardApi.getStats();
      if (response.success) {
        setStats(response.data!);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal memuat statistik dashboard',
      });
    } finally {
      setLoadingStats(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - AFMS</title>
        <meta name="description" content="Dashboard AFMS" />
      </Head>
      
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Selamat datang, {user?.name}!
                </h1>
                <p className="text-gray-600 mt-1">
                  {user?.role === 'admin' ? 'Administrator' : user?.jabatan?.nama_jabatan} - {user?.cabang?.nama_cabang}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Karyawan"
              value={stats?.total_karyawan || 0}
              icon={<UsersIcon className="h-6 w-6" />}
              color="primary"
              loading={loadingStats}
            />
            <StatsCard
              title="Total Cabang"
              value={stats?.total_cabang || 0}
              icon={<BuildingOfficeIcon className="h-6 w-6" />}
              color="secondary"
              loading={loadingStats}
            />
            <StatsCard
              title="Hadir Hari Ini"
              value={stats?.total_hadir_hari_ini || 0}
              icon={<CheckCircleIcon className="h-6 w-6" />}
              color="success"
              loading={loadingStats}
            />
            <StatsCard
              title="Terlambat Hari Ini"
              value={stats?.total_terlambat_hari_ini || 0}
              icon={<ClockIcon className="h-6 w-6" />}
              color="warning"
              loading={loadingStats}
            />
          </div>

          {/* Additional Stats for Admin */}
          {user?.role === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Alpha Hari Ini"
                value={stats?.total_alpha_hari_ini || 0}
                icon={<XCircleIcon className="h-6 w-6" />}
                color="danger"
                loading={loadingStats}
              />
              <StatsCard
                title="Persentase Kehadiran"
                value={`${stats?.persentase_kehadiran || 0}%`}
                icon={<ChartBarIcon className="h-6 w-6" />}
                color="info"
                loading={loadingStats}
              />
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Aksi Cepat
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/admin/monitoring')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Monitoring Fingerprint
                  </button>
                  <button
                    onClick={() => router.push('/admin/karyawan')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Kelola Karyawan
                  </button>
                  <button
                    onClick={() => router.push('/admin/absensi')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    Laporan Absensi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Charts and Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AttendanceChart />
            <RecentActivities />
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default DashboardPage;