import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import TataLetakDasbor from '../../components/layouts/TataLetakDasbor';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { cn } from '../../utils/cn';

interface Device {
  id: number;
  device_id: string;
  nama: string;
  tipe: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  cabang: {
    id: number;
    nama_cabang: string;
    kode_cabang: string;
  };
  ip_address: string;
  port: number;
  lokasi: string;
  last_sync: string | null;
  firmware_version: string | null;
  employee_count: number;
  storage_usage: number;
  temperature: number | null;
  memory_usage: number | null;
  error_message: string | null;
  today_attendance_count: number;
  total_attendance_count: number;
  created_at: string;
  updated_at: string;
}

interface MonitorSummary {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  error_devices: number;
  maintenance_devices: number;
  total_attendance_today: number;
  last_updated: string;
}

interface MonitorData {
  devices: Device[];
  summary: MonitorSummary;
}

const DeviceMonitorPage: React.FC = () => {
  const router = useRouter();
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showDeviceDetail, setShowDeviceDetail] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  // Fetch monitor data
  const fetchMonitorData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/devices/monitor', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMonitorData(result.data);
          setLastRefresh(new Date());
        }
      } else {
        console.error('Failed to fetch monitor data');
      }
    } catch (error) {
      console.error('Error fetching monitor data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchMonitorData();
  }, [fetchMonitorData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMonitorData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchMonitorData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'error':
        return '⚠️';
      case 'maintenance':
        return '🔧';
      default:
        return '⚪';
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device);
    setShowDeviceDetail(true);
  };

  if (loading) {
    return (
      <TataLetakDasbor>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </TataLetakDasbor>
    );
  }

  return (
    <TataLetakDasbor>
      <Head>
        <title>Device Monitor - AFMS</title>
        <meta name="description" content="Real-time device monitoring" />
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Device Monitor</h1>
            <p className="text-gray-600 mt-1">Real-time monitoring sistem fingerprint</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Auto Refresh:</label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(
                  'px-3 py-1 rounded text-sm font-medium transition-colors',
                  autoRefresh
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                )}
              >
                {autoRefresh ? 'ON' : 'OFF'}
              </button>
            </div>
            <Button
              onClick={fetchMonitorData}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              🔄 Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {monitorData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold text-gray-900">{monitorData.summary.total_devices}</div>
              <div className="text-sm text-gray-600">Total Devices</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold text-green-600">{monitorData.summary.online_devices}</div>
              <div className="text-sm text-gray-600">Online</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold text-gray-600">{monitorData.summary.offline_devices}</div>
              <div className="text-sm text-gray-600">Offline</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold text-red-600">{monitorData.summary.error_devices}</div>
              <div className="text-sm text-gray-600">Error</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold text-yellow-600">{monitorData.summary.maintenance_devices}</div>
              <div className="text-sm text-gray-600">Maintenance</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-2xl font-bold text-blue-600">{monitorData.summary.total_attendance_today}</div>
              <div className="text-sm text-gray-600">Attendance Today</div>
            </div>
          </div>
        )}

        {/* Last Refresh Info */}
        <div className="text-sm text-gray-500">
          Last refresh: {lastRefresh.toLocaleTimeString()}
          {autoRefresh && ` (Auto refresh every ${refreshInterval / 1000}s)`}
        </div>

        {/* Device Grid */}
        {monitorData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {monitorData.devices.map((device) => (
              <div
                key={device.id}
                onClick={() => handleDeviceClick(device)}
                className="bg-white p-4 rounded-lg shadow border hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(device.status)}</span>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium border',
                      getStatusColor(device.status)
                    )}>
                      {device.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {device.cabang.kode_cabang}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="font-medium text-gray-900">{device.nama}</div>
                    <div className="text-sm text-gray-600">{device.device_id}</div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <div>📍 {device.lokasi}</div>
                    <div>🌐 {device.ip_address}:{device.port}</div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Attendance Today:</span>
                    <span className="font-medium">{device.today_attendance_count}</span>
                  </div>

                  {device.temperature && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Temperature:</span>
                      <span className={cn(
                        'font-medium',
                        device.temperature > 70 ? 'text-red-600' : 'text-green-600'
                      )}>
                        {device.temperature}°C
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 pt-2 border-t">
                    Last sync: {formatLastSync(device.last_sync)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Device Detail Modal */}
        <Modal
          isOpen={showDeviceDetail}
          onClose={() => setShowDeviceDetail(false)}
          title={`Device Details - ${selectedDevice?.nama}`}
        >
          {selectedDevice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Device ID</label>
                  <div className="text-sm text-gray-900">{selectedDevice.device_id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={cn(
                    'inline-flex px-2 py-1 rounded text-xs font-medium border',
                    getStatusColor(selectedDevice.status)
                  )}>
                    {selectedDevice.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Branch</label>
                  <div className="text-sm text-gray-900">{selectedDevice.cabang.nama_cabang}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <div className="text-sm text-gray-900">{selectedDevice.lokasi}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <div className="text-sm text-gray-900">{selectedDevice.ip_address}:{selectedDevice.port}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Firmware</label>
                  <div className="text-sm text-gray-900">{selectedDevice.firmware_version || 'Unknown'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee Count</label>
                  <div className="text-sm text-gray-900">{selectedDevice.employee_count}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Storage Usage</label>
                  <div className="text-sm text-gray-900">{selectedDevice.storage_usage}%</div>
                </div>
                {selectedDevice.temperature && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Temperature</label>
                    <div className={cn(
                      'text-sm font-medium',
                      selectedDevice.temperature > 70 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {selectedDevice.temperature}°C
                    </div>
                  </div>
                )}
                {selectedDevice.memory_usage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Memory Usage</label>
                    <div className="text-sm text-gray-900">{selectedDevice.memory_usage}%</div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Today Attendance</label>
                  <div className="text-sm text-gray-900">{selectedDevice.today_attendance_count}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Attendance</label>
                  <div className="text-sm text-gray-900">{selectedDevice.total_attendance_count}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Sync</label>
                  <div className="text-sm text-gray-900">{formatLastSync(selectedDevice.last_sync)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <div className="text-sm text-gray-900">{new Date(selectedDevice.created_at).toLocaleString()}</div>
                </div>
              </div>

              {selectedDevice.error_message && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <label className="block text-sm font-medium text-red-700">Error Message</label>
                  <div className="text-sm text-red-600">{selectedDevice.error_message}</div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  onClick={() => setShowDeviceDetail(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </TataLetakDasbor>
  );
};

export default DeviceMonitorPage;