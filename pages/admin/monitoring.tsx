import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { MonitoringFingerprint } from '@/types';
import { monitoringApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import RealtimeAttendance from '@/components/monitoring/RealtimeAttendance';
import {
  ComputerDesktopIcon,
  SignalIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  WifiIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

const MonitoringPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [devices, setDevices] = useState<MonitoringFingerprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchDevices();
      // Auto refresh every 30 seconds
      const interval = setInterval(fetchDevices, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await monitoringApi.getDevices();
      if (response.success && response.data) {
        setDevices(response.data);
      } else {
        // Use dummy data if API fails
        setDevices([
          {
            id: 1,
            device_id: 'FP001',
            device_name: 'Fingerprint Scanner - Kantor Pusat',
            ip_address: '192.168.1.100',
            port: 4370,
            status: 'online',
            last_sync: '2024-01-15 10:30:00',
            total_users: 150,
            total_records: 2500,
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-15 10:30:00',
          },
          {
            id: 2,
            device_id: 'FP002',
            device_name: 'Fingerprint Scanner - Cabang Jakarta',
            ip_address: '192.168.1.101',
            port: 4370,
            status: 'offline',
            last_sync: '2024-01-14 16:45:00',
            total_users: 75,
            total_records: 1200,
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-14 16:45:00',
          },
          {
            id: 3,
            device_id: 'FP003',
            device_name: 'Fingerprint Scanner - Cabang Surabaya',
            ip_address: '192.168.1.102',
            port: 4370,
            status: 'online',
            last_sync: '2024-01-15 09:15:00',
            total_users: 90,
            total_records: 1800,
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-15 09:15:00',
          },
        ]);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal memuat data monitoring',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (deviceId: string) => {
    try {
      setSyncing(deviceId);
      const response = await monitoringApi.syncDevice(deviceId);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Sinkronisasi berhasil',
        });
        fetchDevices();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal melakukan sinkronisasi',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleTestConnection = async (deviceId: string) => {
    try {
      setTesting(deviceId);
      const response = await monitoringApi.testConnection(deviceId);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Koneksi berhasil',
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal menguji koneksi',
      });
    } finally {
      setTesting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'online') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
          <SignalIcon className="h-3 w-3 mr-1" />
          Daring
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
          <SignalSlashIcon className="h-3 w-3 mr-1" />
          Luring
        </span>
      );
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  if (isLoading || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Monitoring Fingerprint - AFMS</title>
        <meta name="description" content="Monitoring perangkat fingerprint" />
      </Head>
      
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Monitoring Fingerprint
                </h1>
                <p className="text-gray-600 mt-1">
                  Monitor status dan kelola perangkat fingerprint
                </p>
              </div>
              <Button
                onClick={fetchDevices}
                loading={loading}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              >
                Segarkan
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-primary-500 rounded-lg flex items-center justify-center">
                    <ComputerDesktopIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Perangkat</p>
                  <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-success-500 rounded-lg flex items-center justify-center">
                    <WifiIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Daring</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {devices.filter(d => d.status === 'online').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-danger-500 rounded-lg flex items-center justify-center">
                    <SignalSlashIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Luring</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {devices.filter(d => d.status === 'offline').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Attendance Monitoring */}
          <RealtimeAttendance />

          {/* Devices List */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Daftar Perangkat</h3>
            </div>
            
            {loading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-8 w-20 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {devices.map((device) => (
                  <div key={device.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          'h-12 w-12 rounded-lg flex items-center justify-center',
                          device.status === 'online' ? 'bg-success-100' : 'bg-danger-100'
                        )}>
                          <ComputerDesktopIcon className={cn(
                            'h-6 w-6',
                            device.status === 'online' ? 'text-success-600' : 'text-danger-600'
                          )} />
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {device.device_name}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              ID: {device.device_id}
                            </span>
                            <span className="text-sm text-gray-500">
                              IP: {device.ip_address}:{device.port}
                            </span>
                            {getStatusBadge(device.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(device.device_id)}
                          loading={testing === device.device_id}
                          leftIcon={<WifiIcon className="h-4 w-4" />}
                        >
                          Tes
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSync(device.device_id)}
                          loading={syncing === device.device_id}
                          leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                        >
                          Sinkronisasi
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <UsersIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {device.total_users} Pengguna
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ClipboardDocumentListIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {device.total_records} Rekaman
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ArrowPathIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Sinkronisasi terakhir: {device.last_sync ? formatDateTime(device.last_sync) : 'Belum pernah'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default MonitoringPage;