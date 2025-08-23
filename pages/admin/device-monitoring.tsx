import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ServerIcon,
  SignalIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

interface DeviceStatus {
  device_id: string;
  nama: string;
  tipe: string;
  cabang: string;
  latest_status: 'online' | 'offline' | 'error';
  latest_sync: string;
  firmware_version?: string;
  employee_count: number;
  storage_usage: number;
  error_message?: string;
  sync_history: {
    status: string;
    timestamp: string;
    error_message?: string;
  }[];
}

const DeviceMonitoring = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<DeviceStatus | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchDeviceStatuses();
    }
  }, [user, authLoading]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh && refreshInterval > 0) {
      interval = setInterval(() => {
        fetchDeviceStatuses();
      }, refreshInterval * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const fetchDeviceStatuses = async () => {
    try {
      const response = await fetch('/api/devices/sync?hours=24');
      const data = await response.json();

      if (data.success) {
        setDeviceStatuses(data.data);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: data.message || 'Failed to fetch device statuses'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Error fetching device statuses'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'offline':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      default:
        return <XCircleIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStorageColor = (usage: number) => {
    if (usage >= 90) return 'bg-red-500';
    if (usage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const filteredDevices = deviceStatuses.filter(device => {
    const matchesSearch = device.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         device.cabang.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || device.latest_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const onlineCount = deviceStatuses.filter(d => d.latest_status === 'online').length;
  const offlineCount = deviceStatuses.filter(d => d.latest_status === 'offline').length;
  const errorCount = deviceStatuses.filter(d => d.latest_status === 'error').length;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Device Monitoring</h1>
            <p className="text-gray-600">Real-time status monitoring of fingerprint devices</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                Auto Refresh
              </label>
            </div>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              disabled={!autoRefresh}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1m</option>
              <option value={300}>5m</option>
            </select>
            <button
              onClick={fetchDeviceStatuses}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <SignalIcon className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{deviceStatuses.length}</p>
              </div>
              <ServerIcon className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online</p>
                <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Offline</p>
                <p className="text-2xl font-bold text-red-600">{offlineCount}</p>
              </div>
              <XCircleIcon className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-yellow-600">{errorCount}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
                }}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Device Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => (
            <div
              key={device.device_id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer hover:shadow-md transition-shadow ${
                getStatusColor(device.latest_status)
              }`}
              onClick={() => {
                setSelectedDevice(device);
                setShowDetailModal(true);
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(device.latest_status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{device.nama}</h3>
                    <p className="text-sm text-gray-600">{device.device_id}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(device.latest_status)}`}>
                  {device.latest_status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <WifiIcon className="h-4 w-4" />
                  <span>{device.cabang}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4" />
                  <span>Last sync: {new Date(device.latest_sync).toLocaleString()}</span>
                </div>

                {device.firmware_version && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CpuChipIcon className="h-4 w-4" />
                    <span>FW: {device.firmware_version}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Employees: {device.employee_count}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Storage:</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getStorageColor(device.storage_usage)}`}
                        style={{ width: `${device.storage_usage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{device.storage_usage}%</span>
                  </div>
                </div>

                {device.error_message && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-2">
                    <p className="text-xs text-red-700">{device.error_message}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredDevices.length === 0 && (
          <div className="text-center py-12">
            <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No devices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No devices match your current filters.
            </p>
          </div>
        )}
      </div>

      {/* Device Detail Modal */}
      {showDetailModal && selectedDevice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Device Details: {selectedDevice.nama}
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Device Info */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Device Information</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Device ID:</span>
                      <span className="font-medium">{selectedDevice.device_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{selectedDevice.tipe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Branch:</span>
                      <span className="font-medium">{selectedDevice.cabang}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedDevice.latest_status)}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedDevice.latest_status)}`}>
                          {selectedDevice.latest_status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Firmware:</span>
                      <span className="font-medium">{selectedDevice.firmware_version || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employees:</span>
                      <span className="font-medium">{selectedDevice.employee_count}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Storage Usage:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getStorageColor(selectedDevice.storage_usage)}`}
                            style={{ width: `${selectedDevice.storage_usage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{selectedDevice.storage_usage}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sync History */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Sync History (Last 24h)</h4>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-80 overflow-y-auto">
                    {selectedDevice.sync_history.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDevice.sync_history.map((sync, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(sync.status)}
                              <span className="text-sm font-medium">{sync.status}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500">
                                {new Date(sync.timestamp).toLocaleString()}
                              </div>
                              {sync.error_message && (
                                <div className="text-xs text-red-600 mt-1">
                                  {sync.error_message}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No sync history available
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedDevice.error_message && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Latest Error</h4>
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-700">{selectedDevice.error_message}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DeviceMonitoring;