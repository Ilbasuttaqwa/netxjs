import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { deviceApi } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Dropdown';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { cn } from '../../utils/cn';
import {
  ComputerDesktopIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  WifiIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MapPinIcon,
  SignalIcon,
  CpuChipIcon,
  FireIcon,
  Battery0Icon
} from '@heroicons/react/24/outline';

interface Device {
  id: number;
  device_id: string;
  nama: string;
  tipe: string;
  cabang_id: number;
  ip_address: string;
  port: number;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  lokasi?: string;
  keterangan?: string;
  firmware_version?: string;
  last_sync?: string;
  created_at: string;
  updated_at: string;
  cabang?: {
    id: number;
    nama_cabang: string;
  };
}

interface DeviceConfig {
  device_id: string;
  nama: string;
  tipe: string;
  cabang_id: number;
  ip_address: string;
  port: number;
  lokasi: string;
  keterangan: string;
  firmware_version: string;
}

interface TroubleshootResult {
  device_id: string;
  status: 'success' | 'error';
  message: string;
  details?: {
    ping_test?: boolean;
    connection_test?: boolean;
    sync_test?: boolean;
    hardware_status?: {
      temperature?: number;
      memory_usage?: number;
      battery_level?: number;
    };
  };
}

export default function DeviceConfigPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [configForm, setConfigForm] = useState<DeviceConfig>({
    device_id: '',
    nama: '',
    tipe: 'fingerprint',
    cabang_id: 0,
    ip_address: '',
    port: 4370,
    lokasi: '',
    keterangan: '',
    firmware_version: ''
  });
  const [troubleshootResult, setTroubleshootResult] = useState<TroubleshootResult | null>(null);
  const [troubleshooting, setTroubleshooting] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    
    if (user) {
      fetchDevices();
      fetchBranches();
    }
  }, [user, authLoading, router]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await deviceApi.getDevices();
      if (response.success) {
        setDevices(response.data?.data || []);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal memuat data device'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      // Assuming there's a cabang API
      // const response = await cabangApi.getCabang();
      // setBranches(response.data || []);
      
      // Mock data for now
      setBranches([
        { id: 1, nama_cabang: 'Kantor Pusat' },
        { id: 2, nama_cabang: 'Cabang Jakarta' },
        { id: 3, nama_cabang: 'Cabang Surabaya' }
      ]);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const handleCreateDevice = () => {
    setSelectedDevice(null);
    setConfigForm({
      device_id: '',
      nama: '',
      tipe: 'fingerprint',
      cabang_id: 0,
      ip_address: '',
      port: 4370,
      lokasi: '',
      keterangan: '',
      firmware_version: ''
    });
    setShowConfigModal(true);
  };

  const handleEditDevice = (device: Device) => {
    setSelectedDevice(device);
    setConfigForm({
      device_id: device.device_id,
      nama: device.nama,
      tipe: device.tipe,
      cabang_id: device.cabang_id,
      ip_address: device.ip_address,
      port: device.port,
      lokasi: device.lokasi || '',
      keterangan: device.keterangan || '',
      firmware_version: device.firmware_version || ''
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    try {
      setConfigLoading(true);
      
      if (selectedDevice) {
        // Update existing device
        const response = await deviceApi.updateDevice(selectedDevice.id.toString(), configForm);
        if (response.success) {
          addToast({
            type: 'success',
            title: 'Berhasil',
            message: 'Konfigurasi device berhasil diperbarui'
          });
          fetchDevices();
          setShowConfigModal(false);
        }
      } else {
        // Create new device
        const response = await deviceApi.createDevice(configForm);
        if (response.success) {
          addToast({
            type: 'success',
            title: 'Berhasil',
            message: 'Device baru berhasil ditambahkan'
          });
          fetchDevices();
          setShowConfigModal(false);
        }
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal menyimpan konfigurasi device'
      });
    } finally {
      setConfigLoading(false);
    }
  };

  const handleDeleteDevice = async (device: Device) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus device ${device.nama}?`)) {
      return;
    }

    try {
      const response = await deviceApi.deleteDevice(device.id.toString());
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Device berhasil dihapus'
        });
        fetchDevices();
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal menghapus device'
      });
    }
  };

  const handleTroubleshoot = async (device: Device) => {
    setSelectedDevice(device);
    setTroubleshootResult(null);
    setShowTroubleshootModal(true);
    setTroubleshooting(true);

    try {
      // Simulate troubleshooting process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock troubleshoot result
      const mockResult: TroubleshootResult = {
        device_id: device.device_id,
        status: device.status === 'online' ? 'success' : 'error',
        message: device.status === 'online' 
          ? 'Device berfungsi normal' 
          : 'Device mengalami masalah koneksi',
        details: {
          ping_test: device.status === 'online',
          connection_test: device.status === 'online',
          sync_test: device.status === 'online',
          hardware_status: {
            temperature: Math.floor(Math.random() * 40) + 30,
            memory_usage: Math.floor(Math.random() * 50) + 30,
            battery_level: Math.floor(Math.random() * 50) + 50
          }
        }
      };
      
      setTroubleshootResult(mockResult);
    } catch (error: any) {
      setTroubleshootResult({
        device_id: device.device_id,
        status: 'error',
        message: 'Gagal melakukan troubleshoot'
      });
    } finally {
      setTroubleshooting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      online: { color: 'bg-success-100 text-success-800', label: 'Aktif', icon: CheckCircleIcon },
      offline: { color: 'bg-gray-100 text-gray-800', label: 'Tidak Aktif', icon: XCircleIcon },
      error: { color: 'bg-danger-100 text-danger-800', label: 'Error', icon: ExclamationTriangleIcon },
      maintenance: { color: 'bg-warning-100 text-warning-800', label: 'Pemeliharaan', icon: ClockIcon }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    const IconComponent = config.icon;
    
    return (
      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.color)}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Konfigurasi Device - AFMS</title>
      </Head>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Konfigurasi Device</h1>
              <p className="mt-2 text-gray-600">
                Kelola konfigurasi dan troubleshooting device fingerprint
              </p>
            </div>
            <Button
              onClick={handleCreateDevice}
              leftIcon={<PlusIcon className="h-5 w-5" />}
            >
              Tambah Device
            </Button>
          </div>
        </div>

        {/* Device List */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Daftar Device</h3>
          </div>
          
          {devices.length === 0 ? (
            <div className="p-6 text-center">
              <ComputerDesktopIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada device</h3>
              <p className="mt-1 text-sm text-gray-500">
                Mulai dengan menambahkan device fingerprint pertama Anda.
              </p>
              <div className="mt-6">
                <Button
                  onClick={handleCreateDevice}
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                >
                  Tambah Device
                </Button>
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
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-lg font-medium text-gray-900">
                            {device.nama}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(device.status)}
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
                        onClick={() => handleTroubleshoot(device)}
                        leftIcon={<WrenchScrewdriverIcon className="h-4 w-4" />}
                      >
                        Troubleshoot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditDevice(device)}
                        leftIcon={<PencilIcon className="h-4 w-4" />}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDevice(device)}
                        leftIcon={<TrashIcon className="h-4 w-4" />}
                        className="text-danger-600 hover:text-danger-700 border-danger-300 hover:border-danger-400"
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Configuration Modal */}
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title={selectedDevice ? 'Edit Device' : 'Tambah Device Baru'}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Device ID"
                  type="text"
                  value={configForm.device_id}
                  onChange={(e) => setConfigForm({ ...configForm, device_id: e.target.value })}
                  placeholder="Masukkan Device ID"
                  disabled={!!selectedDevice}
                />
              </div>
              
              <div>
                <Input
                  label="Nama Device"
                  type="text"
                  value={configForm.nama}
                  onChange={(e) => setConfigForm({ ...configForm, nama: e.target.value })}
                  placeholder="Masukkan nama device"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Device
                </label>
                <Select
                  options={[
                    { label: 'Sidik Jari', value: 'fingerprint' },
                    { label: 'Pengenalan Wajah', value: 'face_recognition' },
                    { label: 'Pembaca Kartu', value: 'card_reader' }
                  ]}
                  value={configForm.tipe}
                  onChange={(value) => setConfigForm({ ...configForm, tipe: value })}
                  placeholder="Pilih tipe device"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cabang
                </label>
                <Select
                  options={[
                    { label: 'Pilih Cabang', value: '0' },
                    ...branches.map((branch) => ({
                      label: branch.nama_cabang,
                      value: branch.id.toString()
                    }))
                  ]}
                  value={configForm.cabang_id.toString()}
                  onChange={(value) => setConfigForm({ ...configForm, cabang_id: parseInt(value) })}
                  placeholder="Pilih Cabang"
                />
              </div>
              
              <div>
                <Input
                  label="IP Address"
                  type="text"
                  value={configForm.ip_address}
                  onChange={(e) => setConfigForm({ ...configForm, ip_address: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </div>
              
              <div>
                <Input
                  label="Port"
                  type="number"
                  value={configForm.port.toString()}
                  onChange={(e) => setConfigForm({ ...configForm, port: parseInt(e.target.value) || 0 })}
                  placeholder="4370"
                />
              </div>
            </div>
            
            <div>
              <Input
                label="Lokasi"
                type="text"
                value={configForm.lokasi}
                onChange={(e) => setConfigForm({ ...configForm, lokasi: e.target.value })}
                placeholder="Ruang lobby, lantai 1"
              />
            </div>
            
            <div>
              <Input
                label="Firmware Version"
                type="text"
                value={configForm.firmware_version}
                onChange={(e) => setConfigForm({ ...configForm, firmware_version: e.target.value })}
                placeholder="v1.0.0"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keterangan
              </label>
              <textarea
                value={configForm.keterangan}
                onChange={(e) => setConfigForm({ ...configForm, keterangan: e.target.value })}
                rows={3}
                className="form-input-modern w-full focus:shadow-glow transition-all duration-300"
                placeholder="Keterangan tambahan..."
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowConfigModal(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveConfig}
              loading={configLoading}
              leftIcon={<CogIcon className="h-4 w-4" />}
            >
              {selectedDevice ? 'Update' : 'Simpan'}
            </Button>
          </div>
        </Modal>

        {/* Troubleshoot Modal */}
        <Modal
          isOpen={showTroubleshootModal}
          onClose={() => setShowTroubleshootModal(false)}
          title={`Troubleshoot - ${selectedDevice?.nama}`}
          size="lg"
        >
          <div className="space-y-6">
            {troubleshooting ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Melakukan troubleshoot device...</p>
              </div>
            ) : troubleshootResult ? (
              <div className="space-y-4">
                <div className={cn(
                  'p-4 rounded-lg',
                  troubleshootResult.status === 'success' ? 'bg-success-50 border border-success-200' : 'bg-danger-50 border border-danger-200'
                )}>
                  <div className="flex items-center">
                    {troubleshootResult.status === 'success' ? (
                      <CheckCircleIcon className="h-5 w-5 text-success-600 mr-2" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-danger-600 mr-2" />
                    )}
                    <span className={cn(
                      'font-medium',
                      troubleshootResult.status === 'success' ? 'text-success-800' : 'text-danger-800'
                    )}>
                      {troubleshootResult.message}
                    </span>
                  </div>
                </div>
                
                {troubleshootResult.details && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Detail Hasil Test:</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Test Ping</span>
                        {troubleshootResult.details.ping_test ? (
                          <CheckCircleIcon className="h-5 w-5 text-success-600" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-danger-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Test Koneksi</span>
                        {troubleshootResult.details.connection_test ? (
                          <CheckCircleIcon className="h-5 w-5 text-success-600" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-danger-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Test Sinkronisasi</span>
                        {troubleshootResult.details.sync_test ? (
                          <CheckCircleIcon className="h-5 w-5 text-success-600" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-danger-600" />
                        )}
                      </div>
                    </div>
                    
                    {troubleshootResult.details.hardware_status && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Status Perangkat Keras:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {troubleshootResult.details.hardware_status.temperature && (
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <FireIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                Suhu: {troubleshootResult.details.hardware_status.temperature}°C
                              </span>
                            </div>
                          )}
                          
                          {troubleshootResult.details.hardware_status.memory_usage && (
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <CpuChipIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                Memori: {troubleshootResult.details.hardware_status.memory_usage}%
                              </span>
                            </div>
                          )}
                          
                          {troubleshootResult.details.hardware_status.battery_level && (
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                              <Battery0Icon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                Baterai: {troubleshootResult.details.hardware_status.battery_level}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-gray-600">Klik tombol di bawah untuk memulai troubleshoot</p>
                <div className="mt-6">
                  <Button
                    onClick={() => selectedDevice && handleTroubleshoot(selectedDevice)}
                    leftIcon={<WrenchScrewdriverIcon className="h-4 w-4" />}
                  >
                    Mulai Troubleshoot
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowTroubleshootModal(false)}
            >
              Tutup
            </Button>
            {troubleshootResult && (
              <Button
                onClick={() => selectedDevice && handleTroubleshoot(selectedDevice)}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              >
                Test Ulang
              </Button>
            )}
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}