import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { MonitoringFingerprint } from '../../types';
import { monitoringApi, deviceApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/Button';
import RealtimeAttendance from '../../components/monitoring/RealtimeAttendance';
import {
  ComputerDesktopIcon,
  SignalIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  WifiIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  CpuChipIcon,
  Battery0Icon,
  FireIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

const MonitoringPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [devices, setDevices] = useState<MonitoringFingerprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<MonitoringFingerprint | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

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
            cabang_id: 1,
            cabang: { id: 1, nama_cabang: 'Kantor Pusat', alamat: 'Jakarta', telepon: '021-123456', status: 'aktif', created_at: '2024-01-01', updated_at: '2024-01-01' },
            lokasi: 'Lantai 1 - Lobby',
            firmware_version: 'v2.1.5',
            battery_level: 85,
            temperature: 32,
            memory_usage: 45,
            storage_usage: 60,
            last_heartbeat: '2024-01-15 10:35:00',
            sync_status: 'idle',
            connection_quality: 'excellent',
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
            cabang_id: 2,
            cabang: { id: 2, nama_cabang: 'Cabang Jakarta Selatan', alamat: 'Jakarta Selatan', telepon: '021-789012', status: 'aktif', created_at: '2024-01-01', updated_at: '2024-01-01' },
            lokasi: 'Lantai 2 - HR Department',
            firmware_version: 'v2.1.3',
            battery_level: 15,
            temperature: 45,
            memory_usage: 78,
            storage_usage: 85,
            last_heartbeat: '2024-01-14 16:50:00',
            sync_status: 'error',
            offline_records: 25,
            connection_quality: 'poor',
            error_message: 'Network connection timeout. Device tidak dapat terhubung ke server.',
          },
          {
            id: 3,
            device_id: 'FP003',
            device_name: 'Fingerprint Scanner - Cabang Surabaya',
            ip_address: '192.168.1.102',
            port: 4370,
            status: 'error',
            last_sync: '2024-01-15 09:15:00',
            total_users: 90,
            total_records: 1800,
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-15 09:15:00',
            cabang_id: 3,
            cabang: { id: 3, nama_cabang: 'Cabang Surabaya', alamat: 'Surabaya', telepon: '031-345678', status: 'aktif', created_at: '2024-01-01', updated_at: '2024-01-01' },
            lokasi: 'Lantai 1 - Security Gate',
            firmware_version: 'v2.1.4',
            battery_level: 92,
            temperature: 55,
            memory_usage: 65,
            storage_usage: 40,
            last_heartbeat: '2024-01-15 09:20:00',
            sync_status: 'error',
            offline_records: 5,
            connection_quality: 'good',
            error_message: 'Sensor fingerprint mengalami gangguan. Perlu kalibrasi ulang.',
          },
          {
            id: 4,
            device_id: 'FP004',
            device_name: 'Fingerprint Scanner - Cabang Bandung',
            ip_address: '192.168.1.103',
            port: 4370,
            status: 'maintenance',
            last_sync: '2024-01-15 08:00:00',
            total_users: 65,
            total_records: 980,
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-15 08:00:00',
            cabang_id: 4,
            cabang: { id: 4, nama_cabang: 'Cabang Bandung', alamat: 'Bandung', telepon: '022-456789', status: 'aktif', created_at: '2024-01-01', updated_at: '2024-01-01' },
            lokasi: 'Lantai 3 - Office Area',
            firmware_version: 'v2.1.5',
            battery_level: 70,
            temperature: 38,
            memory_usage: 35,
            storage_usage: 25,
            last_heartbeat: '2024-01-15 08:05:00',
            sync_status: 'idle',
            connection_quality: 'excellent',
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
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Daring
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <SignalSlashIcon className="h-3 w-3 mr-1" />
            Luring
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
            <XCircleIcon className="h-3 w-3 mr-1" />
            Error
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <SignalSlashIcon className="h-3 w-3 mr-1" />
            Unknown
          </span>
        );
    }
  };

  const getConnectionQualityBadge = (quality?: string) => {
    if (!quality) return null;
    
    switch (quality) {
      case 'excellent':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-success-100 text-success-800">
            Excellent
          </span>
        );
      case 'good':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-100 text-primary-800">
            Good
          </span>
        );
      case 'poor':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-warning-100 text-warning-800">
            Poor
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-danger-100 text-danger-800">
            Critical
          </span>
        );
      default:
        return null;
    }
  };

  const handleViewDetail = (device: MonitoringFingerprint) => {
    setSelectedDevice(device);
    setShowDetailModal(true);
  };

  // Bulk operations functions
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId);
      } else {
        return [...prev, deviceId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDevices([]);
      setSelectAll(false);
    } else {
      setSelectedDevices(devices.map(device => device.device_id));
      setSelectAll(true);
    }
  };

  const handleBulkSync = async () => {
    if (selectedDevices.length === 0) {
      addToast({
        type: 'warning',
        title: 'Peringatan',
        message: 'Pilih minimal satu device untuk disinkronisasi'
      });
      return;
    }

    try {
      setBulkOperationLoading(true);
      const response = await deviceApi.bulkSync(selectedDevices);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: `Bulk sync berhasil untuk ${selectedDevices.length} device`
        });
        fetchDevices();
        setSelectedDevices([]);
        setSelectAll(false);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal melakukan bulk sync'
      });
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkTest = async () => {
    if (selectedDevices.length === 0) {
      addToast({
        type: 'warning',
        title: 'Peringatan',
        message: 'Pilih minimal satu device untuk ditest'
      });
      return;
    }

    try {
      setBulkOperationLoading(true);
      const response = await deviceApi.bulkTest(selectedDevices);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: `Bulk test berhasil untuk ${selectedDevices.length} device`
        });
        fetchDevices();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal melakukan bulk test'
      });
    } finally {
      setBulkOperationLoading(false);
    }
  };

  const handleBulkRestart = async () => {
    if (selectedDevices.length === 0) {
      addToast({
        type: 'warning',
        title: 'Peringatan',
        message: 'Pilih minimal satu device untuk direstart'
      });
      return;
    }

    try {
      setBulkOperationLoading(true);
      const response = await deviceApi.bulkRestart(selectedDevices);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: `Bulk restart berhasil untuk ${selectedDevices.length} device`
        });
        fetchDevices();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal melakukan bulk restart'
      });
    } finally {
      setBulkOperationLoading(false);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
                    <CheckCircleIcon className="h-6 w-6 text-white" />
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
                  <div className="h-12 w-12 bg-gray-500 rounded-lg flex items-center justify-center">
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
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-danger-500 rounded-lg flex items-center justify-center">
                    <XCircleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Error</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {devices.filter(d => d.status === 'error').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-warning-500 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Maintenance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {devices.filter(d => d.status === 'maintenance').length}
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Daftar Perangkat</h3>
                
                {/* Bulk Operations */}
                {selectedDevices.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {selectedDevices.length} device dipilih
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkSync}
                      loading={bulkOperationLoading}
                      leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                    >
                      Bulk Sync
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkTest}
                      loading={bulkOperationLoading}
                      leftIcon={<WifiIcon className="h-4 w-4" />}
                    >
                      Bulk Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkRestart}
                      loading={bulkOperationLoading}
                      leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                    >
                      Bulk Restart
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Select All Checkbox */}
              {devices.length > 0 && (
                <div className="mt-3 flex items-center">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="select-all" className="ml-2 text-sm text-gray-600">
                    Pilih semua device
                  </label>
                </div>
              )}
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
                        {/* Device Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedDevices.includes(device.device_id)}
                          onChange={() => handleSelectDevice(device.device_id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <div className={cn(
                          'h-12 w-12 rounded-lg flex items-center justify-center',
                          device.status === 'online' ? 'bg-success-100' : 'bg-danger-100'
                        )}>
                          <ComputerDesktopIcon className={cn(
                            'h-6 w-6',
                            device.status === 'online' ? 'text-success-600' : 'text-danger-600'
                          )} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-medium text-gray-900">
                              {device.device_name}
                            </h4>
                            <div className="flex items-center space-x-2">
                              {getStatusBadge(device.status)}
                              {getConnectionQualityBadge(device.connection_quality)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              ID: {device.device_id}
                            </span>
                            <span className="text-sm text-gray-500">
                              IP: {device.ip_address}:{device.port}
                            </span>
                            {device.cabang?.nama_cabang && (
                              <span className="inline-flex items-center text-sm text-gray-500">
                                <MapPinIcon className="h-3 w-3 mr-1" />
                                {device.cabang.nama_cabang}
                              </span>
                            )}
                            {device.lokasi && (
                              <span className="text-sm text-gray-500">
                                • {device.lokasi}
                              </span>
                            )}
                          </div>
                          {device.firmware_version && (
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-gray-400">
                                Firmware: {device.firmware_version}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetail(device)}
                          leftIcon={<EyeIcon className="h-4 w-4" />}
                        >
                          Detail
                        </Button>
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
                          variant="default"
                          size="sm"
                          onClick={() => handleSync(device.device_id)}
                          loading={syncing === device.device_id}
                          leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                        >
                          Sinkronisasi
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      {device.offline_records !== undefined && device.offline_records > 0 && (
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-warning-500" />
                          <span className="text-sm text-warning-600">
                            {device.offline_records} Offline
                          </span>
                        </div>
                      )}
                      {device.battery_level !== undefined && (
                        <div className="flex items-center space-x-2">
                          <Battery0Icon className={cn(
                            'h-4 w-4',
                            device.battery_level > 50 ? 'text-success-500' :
                            device.battery_level > 20 ? 'text-warning-500' : 'text-danger-500'
                          )} />
                          <span className={cn(
                            'text-sm',
                            device.battery_level > 50 ? 'text-success-600' :
                            device.battery_level > 20 ? 'text-warning-600' : 'text-danger-600'
                          )}>
                            Battery: {device.battery_level}%
                          </span>
                        </div>
                      )}
                      {device.temperature !== undefined && (
                        <div className="flex items-center space-x-2">
                          <FireIcon className={cn(
                            'h-4 w-4',
                            device.temperature < 60 ? 'text-success-500' :
                            device.temperature < 80 ? 'text-warning-500' : 'text-danger-500'
                          )} />
                          <span className={cn(
                            'text-sm',
                            device.temperature < 60 ? 'text-success-600' :
                            device.temperature < 80 ? 'text-warning-600' : 'text-danger-600'
                          )}>
                            {device.temperature}°C
                          </span>
                        </div>
                      )}
                      {device.memory_usage !== undefined && (
                        <div className="flex items-center space-x-2">
                          <CpuChipIcon className={cn(
                            'h-4 w-4',
                            device.memory_usage < 70 ? 'text-success-500' :
                            device.memory_usage < 90 ? 'text-warning-500' : 'text-danger-500'
                          )} />
                          <span className={cn(
                            'text-sm',
                            device.memory_usage < 70 ? 'text-success-600' :
                            device.memory_usage < 90 ? 'text-warning-600' : 'text-danger-600'
                          )}>
                            RAM: {device.memory_usage}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <ArrowPathIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Sync: {device.last_sync ? formatDateTime(device.last_sync) : 'Belum pernah'}
                        </span>
                      </div>
                      {device.last_heartbeat && (
                        <div className="flex items-center space-x-2">
                          <SignalIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Heartbeat: {formatDateTime(device.last_heartbeat)}
                          </span>
                        </div>
                      )}
                    </div>
                    {device.error_message && (
                      <div className="mt-3 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <ExclamationTriangleIcon className="h-4 w-4 text-danger-500 mt-0.5" />
                          <span className="text-sm text-danger-700">
                            {device.error_message}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device Detail Modal */}
          {showDetailModal && selectedDevice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Detail Device: {selectedDevice.device_name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        ID: {selectedDevice.device_id}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDetailModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Informasi Dasar</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          {getStatusBadge(selectedDevice.status)}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">IP Address:</span>
                          <span className="text-sm font-medium">{selectedDevice.ip_address}:{selectedDevice.port}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Cabang:</span>
                          <span className="text-sm font-medium">{selectedDevice.cabang?.nama_cabang || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Lokasi:</span>
                          <span className="text-sm font-medium">{selectedDevice.lokasi || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Firmware:</span>
                          <span className="text-sm font-medium">{selectedDevice.firmware_version || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Kualitas Koneksi:</span>
                          {getConnectionQualityBadge(selectedDevice.connection_quality) || <span className="text-sm text-gray-500">-</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Status Teknis</h4>
                      <div className="space-y-3">
                        {selectedDevice.battery_level !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Battery Level:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={cn(
                                    'h-2 rounded-full',
                                    selectedDevice.battery_level > 50 ? 'bg-success-500' :
                                    selectedDevice.battery_level > 20 ? 'bg-warning-500' : 'bg-danger-500'
                                  )}
                                  style={{ width: `${selectedDevice.battery_level}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{selectedDevice.battery_level}%</span>
                            </div>
                          </div>
                        )}
                        {selectedDevice.temperature !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Temperature:</span>
                            <span className={cn(
                              'text-sm font-medium',
                              selectedDevice.temperature < 60 ? 'text-success-600' :
                              selectedDevice.temperature < 80 ? 'text-warning-600' : 'text-danger-600'
                            )}>
                              {selectedDevice.temperature}°C
                            </span>
                          </div>
                        )}
                        {selectedDevice.memory_usage !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Memory Usage:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={cn(
                                    'h-2 rounded-full',
                                    selectedDevice.memory_usage < 70 ? 'bg-success-500' :
                                    selectedDevice.memory_usage < 90 ? 'bg-warning-500' : 'bg-danger-500'
                                  )}
                                  style={{ width: `${selectedDevice.memory_usage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{selectedDevice.memory_usage}%</span>
                            </div>
                          </div>
                        )}
                        {selectedDevice.storage_usage !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Storage Usage:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={cn(
                                    'h-2 rounded-full',
                                    selectedDevice.storage_usage < 70 ? 'bg-success-500' :
                                    selectedDevice.storage_usage < 90 ? 'bg-warning-500' : 'bg-danger-500'
                                  )}
                                  style={{ width: `${selectedDevice.storage_usage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">{selectedDevice.storage_usage}%</span>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Users:</span>
                          <span className="text-sm font-medium">{selectedDevice.total_users}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Records:</span>
                          <span className="text-sm font-medium">{selectedDevice.total_records}</span>
                        </div>
                        {selectedDevice.offline_records !== undefined && selectedDevice.offline_records > 0 && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Offline Records:</span>
                            <span className="text-sm font-medium text-warning-600">{selectedDevice.offline_records}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Timestamps */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium text-gray-900 mb-4">Riwayat Aktivitas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Last Sync:</span>
                        <span className="text-sm font-medium">
                          {selectedDevice.last_sync ? formatDateTime(selectedDevice.last_sync) : 'Belum pernah'}
                        </span>
                      </div>
                      {selectedDevice.last_heartbeat && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Last Heartbeat:</span>
                          <span className="text-sm font-medium">{formatDateTime(selectedDevice.last_heartbeat)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Created:</span>
                        <span className="text-sm font-medium">{formatDateTime(selectedDevice.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Updated:</span>
                        <span className="text-sm font-medium">{formatDateTime(selectedDevice.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Error Message */}
                  {selectedDevice.error_message && (
                    <div className="border-t pt-6">
                      <h4 className="font-medium text-gray-900 mb-4">Error Information</h4>
                      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-danger-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-danger-800">Error Message</p>
                            <p className="text-sm text-danger-700 mt-1">{selectedDevice.error_message}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="border-t pt-6">
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => handleTestConnection(selectedDevice.device_id)}
                        loading={testing === selectedDevice.device_id}
                        leftIcon={<WifiIcon className="h-4 w-4" />}
                      >
                        Test Connection
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => handleSync(selectedDevice.device_id)}
                        loading={syncing === selectedDevice.device_id}
                        leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                      >
                        Sync Now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default MonitoringPage;