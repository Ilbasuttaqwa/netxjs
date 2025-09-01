import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Card from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/modal';
import {
  CircleStackIcon as Database,
  ArrowDownTrayIcon as Download,
  ArrowUpTrayIcon as Upload,
  TrashIcon as Trash2,
  ArrowPathIcon as RefreshCw,
  ComputerDesktopIcon as HardDrive,
  CalendarIcon as Calendar,
  UserIcon as User,
  BuildingOfficeIcon as Building,
  CheckCircleIcon as CheckCircle,
  ExclamationTriangleIcon as AlertTriangle,
  InformationCircleIcon as Info
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface Device {
  id: number;
  device_id: string;
  nama: string;
  cabang: {
    nama_cabang: string;
  };
}

interface Backup {
  id: number;
  backup_name: string;
  device: {
    device_id: string;
    nama: string;
    cabang: string;
  };
  template_count: number;
  created_by: string;
  created_at: string;
  file_size: number;
}

const FingerprintBackupPage: NextPage = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  
  const [devices, setDevices] = useState<Device[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [targetDevice, setTargetDevice] = useState<string>('');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);

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
      fetchBackups();
    }
  }, [user, authLoading, router]);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDevices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fingerprint/backup-restore', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackups(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Gagal mengambil daftar backup'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!selectedDevice) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Pilih device terlebih dahulu'
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/fingerprint/backup-restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'backup',
          device_id: selectedDevice
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          message: data.message
        });
        setShowBackupModal(false);
        setSelectedDevice('');
        fetchBackups();
      } else {
        throw new Error(data.message || 'Gagal membuat backup');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal membuat backup'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup || !targetDevice) {
      addToast({
         type: 'error',
         title: 'Error',
         message: 'Pilih backup dan target device terlebih dahulu'
       });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/fingerprint/backup-restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'restore',
          backup_id: selectedBackup.id,
          target_device_id: targetDevice
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          message: data.message
        });
        setShowRestoreModal(false);
        setSelectedBackup(null);
        setTargetDevice('');
      } else {
        throw new Error(data.message || 'Gagal melakukan restore');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal melakukan restore'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!backupToDelete) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/fingerprint/backup-restore/${backupToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Success',
          message: 'Backup berhasil dihapus'
        });
        setShowDeleteModal(false);
        setBackupToDelete(null);
        fetchBackups();
      } else {
        throw new Error('Gagal menghapus backup');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal menghapus backup'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Backup & Restore Template Sidik Jari - AFMS</title>
        <meta name="description" content="Manajemen backup dan restore template sidik jari" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backup & Restore Template</h1>
            <p className="text-gray-600">Kelola backup dan restore template sidik jari antar device</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowBackupModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Database className="h-4 w-4 mr-2" />
              Buat Backup
            </Button>
            <Button
              onClick={fetchBackups}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
            <p className="text-sm text-blue-700">
              Backup template sidik jari memungkinkan Anda untuk menyimpan dan memindahkan template antar device. 
              Pastikan device target berada dalam cabang yang sama dengan device sumber.
            </p>
          </div>
        </div>

        {/* Backup List */}
        <Card className="bg-white shadow-lg rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Daftar Backup Template
            </h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Memuat data backup...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Belum ada backup template</p>
                <p className="text-sm">Buat backup pertama Anda dengan mengklik tombol "Buat Backup"</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Nama Backup</th>
                      <th className="text-left py-3 px-4">Device</th>
                      <th className="text-left py-3 px-4">Cabang</th>
                      <th className="text-left py-3 px-4">Template</th>
                      <th className="text-left py-3 px-4">Ukuran</th>
                      <th className="text-left py-3 px-4">Dibuat</th>
                      <th className="text-left py-3 px-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup) => (
                      <tr key={backup.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{backup.backup_name}</div>
                          <div className="text-sm text-gray-500">ID: {backup.id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{backup.device.nama}</div>
                          <div className="text-sm text-gray-500">{backup.device.device_id}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {backup.device.cabang}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{backup.template_count}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm">{formatFileSize(backup.file_size)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">
                            <div>{formatDate(backup.created_at)}</div>
                            <div className="text-gray-500">oleh {backup.created_by}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBackup(backup);
                                setShowRestoreModal(true);
                              }}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setBackupToDelete(backup);
                                setShowDeleteModal(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        {/* Create Backup Modal */}
        <Modal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          title="Buat Backup Template"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Device
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Device --</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.device_id}>
                    {device.nama} ({device.device_id}) - {device.cabang.nama_cabang}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                <p className="text-sm text-blue-700">
                  Backup akan menyimpan semua template sidik jari dari device yang dipilih. 
                  Proses ini mungkin membutuhkan waktu beberapa menit tergantung jumlah template.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowBackupModal(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                onClick={handleCreateBackup}
                disabled={loading || !selectedDevice}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Buat Backup
              </Button>
            </div>
          </div>
        </Modal>

        {/* Restore Modal */}
        <Modal
          isOpen={showRestoreModal}
          onClose={() => setShowRestoreModal(false)}
          title="Restore Template"
        >
          <div className="space-y-4">
            {selectedBackup && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Backup yang dipilih:</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Nama:</strong> {selectedBackup.backup_name}</div>
                  <div><strong>Device Sumber:</strong> {selectedBackup.device.nama}</div>
                  <div><strong>Cabang:</strong> {selectedBackup.device.cabang}</div>
                  <div><strong>Jumlah Template:</strong> {selectedBackup.template_count}</div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Target Device
              </label>
              <select
                value={targetDevice}
                onChange={(e) => setTargetDevice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Pilih Target Device --</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.device_id}>
                    {device.nama} ({device.device_id}) - {device.cabang.nama_cabang}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
                <p className="text-sm text-yellow-700">
                  <strong>Peringatan:</strong> Restore akan menimpa template yang ada di device target. 
                  Pastikan device target berada dalam cabang yang sama dengan device sumber.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowRestoreModal(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                onClick={handleRestoreBackup}
                disabled={loading || !targetDevice}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Restore Template
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Konfirmasi Hapus Backup"
        >
          <div className="space-y-4">
            {backupToDelete && (
              <div>
                <p className="text-gray-700 mb-4">
                  Apakah Anda yakin ingin menghapus backup berikut?
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div><strong>Nama:</strong> {backupToDelete.backup_name}</div>
                    <div><strong>Device:</strong> {backupToDelete.device.nama}</div>
                    <div><strong>Template:</strong> {backupToDelete.template_count}</div>
                  </div>
                </div>
                <p className="text-sm text-red-600 mt-4">
                  <strong>Peringatan:</strong> Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button
                onClick={handleDeleteBackup}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Hapus Backup
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default FingerprintBackupPage;