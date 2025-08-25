import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Device {
  id: number;
  device_id: string;
  nama: string;
  tipe: 'fingerprint' | 'face' | 'card';
  cabang_id: number;
  ip_address?: string;
  port?: number;
  status: 'aktif' | 'nonaktif' | 'maintenance';
  lokasi?: string;
  keterangan?: string;
  last_sync?: string;
  firmware_version?: string;
  created_at: string;
  cabang: {
    id: number;
    nama: string;
    alamat: string;
  };
}

interface Cabang {
  id: number;
  nama_cabang: string;
  alamat_cabang: string;
}

const DeviceManagement = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [cabangList, setCabangList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCabang, setFilterCabang] = useState('');
  const [filterTipe, setFilterTipe] = useState('');

  const [formData, setFormData] = useState({
    device_id: '',
    nama: '',
    tipe: 'fingerprint' as 'fingerprint' | 'face' | 'card',
    cabang_id: '',
    ip_address: '',
    port: '',
    lokasi: '',
    keterangan: '',
    firmware_version: ''
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchDevices();
      fetchCabangList();
    }
  }, [user, authLoading, currentPage, searchTerm, filterStatus, filterCabang, filterTipe]);

  const fetchDevices = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterCabang && { cabang_id: filterCabang }),
        ...(filterTipe && { tipe: filterTipe })
      });

      const response = await fetch(`/api/devices?${params}`);
      const data = await response.json();

      if (data.success) {
        setDevices(data.data);
        setTotalPages(data.pagination.total_pages);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: data.message || 'Failed to fetch devices'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Error fetching devices'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCabangList = async () => {
    try {
      const response = await fetch('/api/cabang');
      const data = await response.json();
      if (data.success) {
        setCabangList(data.data);
      }
    } catch (error) {
      console.error('Error fetching cabang list:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = editingDevice ? `/api/devices/${editingDevice.id}` : '/api/devices';
      const method = editingDevice ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          cabang_id: parseInt(formData.cabang_id),
          port: formData.port ? parseInt(formData.port) : null
        }),
      });

      const data = await response.json();

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          message: data.message
        });
        setShowModal(false);
        resetForm();
        fetchDevices();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: data.message || 'Operation failed'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Error saving device'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      device_id: device.device_id,
      nama: device.nama,
      tipe: device.tipe,
      cabang_id: device.cabang_id.toString(),
      ip_address: device.ip_address || '',
      port: device.port?.toString() || '',
      lokasi: device.lokasi || '',
      keterangan: device.keterangan || '',
      firmware_version: device.firmware_version || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (device: Device) => {
    if (!confirm(`Are you sure you want to delete device "${device.nama}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/devices/${device.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          message: data.message
        });
        fetchDevices();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: data.message || 'Failed to delete device'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Error deleting device'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      device_id: '',
      nama: '',
      tipe: 'fingerprint',
      cabang_id: '',
      ip_address: '',
      port: '',
      lokasi: '',
      keterangan: '',
      firmware_version: ''
    });
    setEditingDevice(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aktif':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'nonaktif':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aktif':
        return 'bg-green-100 text-green-800';
      case 'nonaktif':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Device Management</h1>
              <p className="text-gray-600">Manage fingerprint devices and their configurations</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add Device
            </button>
          </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <option value="aktif">Active</option>
                <option value="nonaktif">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <select
                value={filterTipe}
                onChange={(e) => setFilterTipe(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="fingerprint">Fingerprint</option>
                <option value="face">Face Recognition</option>
                <option value="card">Card Reader</option>
              </select>
            </div>
            <div>
              <select
                value={filterCabang}
                onChange={(e) => setFilterCabang(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Branches</option>
                {cabangList.map((cabang) => (
                  <option key={cabang.id} value={cabang.id}>
                    {cabang.nama_cabang}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('');
                  setFilterTipe('');
                  setFilterCabang('');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Device List */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sync
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device) => (
                  <tr key={device.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {device.nama}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {device.device_id} • {device.tipe}
                        </div>
                        {device.lokasi && (
                          <div className="text-xs text-gray-400">
                            📍 {device.lokasi}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{device.cabang.nama}</div>
                      <div className="text-xs text-gray-500">{device.cabang.alamat}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {device.ip_address || 'N/A'}
                        {device.port && `:${device.port}`}
                      </div>
                      {device.firmware_version && (
                        <div className="text-xs text-gray-500">
                          FW: {device.firmware_version}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(device.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {device.last_sync
                        ? new Date(device.last_sync).toLocaleString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(device)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(device)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {devices.length === 0 && (
            <div className="text-center py-12">
              <WifiIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No devices found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding a new device.
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingDevice ? 'Edit Device' : 'Add New Device'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.device_id}
                      onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., FP001"
                      disabled={!!editingDevice}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Main Entrance Scanner"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Device Type *
                    </label>
                    <select
                      required
                      value={formData.tipe}
                      onChange={(e) => setFormData({ ...formData, tipe: e.target.value as 'fingerprint' | 'face' | 'card' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fingerprint">Fingerprint</option>
                      <option value="face">Face Recognition</option>
                      <option value="card">Card Reader</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch *
                    </label>
                    <select
                      required
                      value={formData.cabang_id}
                      onChange={(e) => setFormData({ ...formData, cabang_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Branch</option>
                      {cabangList.map((cabang) => (
                        <option key={cabang.id} value={cabang.id}>
                          {cabang.nama_cabang}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IP Address
                    </label>
                    <input
                      type="text"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 192.168.1.100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 4370"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.lokasi}
                      onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Main Entrance, Floor 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Firmware Version
                    </label>
                    <input
                      type="text"
                      value={formData.firmware_version}
                      onChange={(e) => setFormData({ ...formData, firmware_version: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., v2.1.0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes about this device..."
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : editingDevice ? 'Update Device' : 'Add Device'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DeviceManagement;