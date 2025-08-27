import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { DashboardStats } from '../types/index';
import { dashboardApi } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/auth/RuteTerlindungi';
import DashboardLayout from '../components/layouts/TataLetakDasbor';
import StatsCard from '../components/dashboard/KartuStatistik';
import AttendanceChart from '../components/dashboard/GrafikKehadiran';
import RecentActivities from '../components/dashboard/AktivitasTerbaru';
import {
  UsersIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const DashboardContent: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

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
          title: 'Kesalahan',
          message: error.message || 'Gagal memuat statistik dashboard',
        });
    } finally {
      setLoadingStats(false);
    }
  };



  return (
    <>
      <Head>
        <title>Dashboard - AFMS</title>
        <meta name="description" content="Dashboard AFMS" />
      </Head>
      
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">
                      Selamat datang, {user?.nama_pegawai}!
                    </h1>
                    <p className="text-blue-100 mt-1">
                      {user?.role === 'admin' ? 'Administrator' : user?.jabatan?.nama_jabatan} - {user?.cabang?.nama_cabang}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-blue-100 text-sm">
                    {new Date().toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {new Date().toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
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
              icon={<ExclamationTriangleIcon className="h-6 w-6" />}
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
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Aksi Cepat
                  </h3>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/admin/pemantauan')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 hover:text-blue-700 rounded-xl transition-all duration-200 flex items-center gap-3 group border border-transparent hover:border-blue-200"
                  >
                    <div className="h-8 w-8 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center transition-colors">
                      <ComputerDesktopIcon className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Monitoring Fingerprint</p>
                      <p className="text-xs text-gray-500">Pantau status perangkat</p>
                    </div>
                  </button>
                  <button
                    onClick={() => router.push('/admin/karyawan')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:text-green-700 rounded-xl transition-all duration-200 flex items-center gap-3 group border border-transparent hover:border-green-200"
                  >
                    <div className="h-8 w-8 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center transition-colors">
                      <UsersIcon className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Kelola Karyawan</p>
                      <p className="text-xs text-gray-500">Tambah & edit data karyawan</p>
                    </div>
                  </button>
                  <button
                    onClick={() => router.push('/admin/absensi')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 rounded-xl transition-all duration-200 flex items-center gap-3 group border border-transparent hover:border-purple-200"
                  >
                    <div className="h-8 w-8 bg-purple-100 group-hover:bg-purple-200 rounded-lg flex items-center justify-center transition-colors">
                      <CalendarDaysIcon className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Laporan Absensi</p>
                      <p className="text-xs text-gray-500">Lihat laporan kehadiran</p>
                    </div>
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

const DashboardPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
};

export default DashboardPage;