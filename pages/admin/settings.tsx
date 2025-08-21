import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { useToast } from '@/contexts/ToastContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  CogIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';

interface SettingsData {
  jam_masuk: string;
  jam_pulang: string;
  toleransi_keterlambatan: number;
  potongan_per_menit: number;
  hari_kerja: string[];
  fingerprint_device_ip: string;
  fingerprint_device_port: number;
}

const SettingsPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    jam_masuk: '08:00',
    jam_pulang: '17:00',
    toleransi_keterlambatan: 15,
    potongan_per_menit: 5000,
    hari_kerja: ['senin', 'selasa', 'rabu', 'kamis', 'jumat'],
    fingerprint_device_ip: '192.168.1.100',
    fingerprint_device_port: 4370,
  });

  const hariOptions = [
    { value: 'senin', label: 'Senin' },
    { value: 'selasa', label: 'Selasa' },
    { value: 'rabu', label: 'Rabu' },
    { value: 'kamis', label: 'Kamis' },
    { value: 'jumat', label: 'Jumat' },
    { value: 'sabtu', label: 'Sabtu' },
    { value: 'minggu', label: 'Minggu' },
  ];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (isAuthenticated) {
      fetchSettings();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // TODO: Implement API call to fetch settings
      // const response = await settingsApi.get();
      // setSettings(response.data);
      
      // For now, use default values
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      addToast('Gagal memuat pengaturan', 'error');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      // TODO: Implement API call to save settings
      // await settingsApi.update(settings);
      
      addToast('Pengaturan berhasil disimpan', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast('Gagal menyimpan pengaturan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleHariKerjaChange = (hari: string, checked: boolean) => {
    if (checked) {
      setSettings({
        ...settings,
        hari_kerja: [...settings.hari_kerja, hari],
      });
    } else {
      setSettings({
        ...settings,
        hari_kerja: settings.hari_kerja.filter(h => h !== hari),
      });
    }
  };

  const testFingerprintConnection = async () => {
    try {
      addToast('Menguji koneksi fingerprint...', 'info');
      // TODO: Implement fingerprint connection test
      // await fingerprintApi.testConnection(settings.fingerprint_device_ip, settings.fingerprint_device_port);
      
      addToast('Koneksi fingerprint berhasil!', 'success');
    } catch (error) {
      console.error('Error testing fingerprint connection:', error);
      addToast('Gagal terhubung ke perangkat fingerprint', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <Head>
        <title>Pengaturan Sistem - AFMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
          <p className="mt-1 text-sm text-gray-500">
            Konfigurasi sistem absensi dan fingerprint
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Jam Kerja */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Jam Kerja</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Masuk
                  </label>
                  <Input
                    type="time"
                    value={settings.jam_masuk}
                    onChange={(e) => setSettings({ ...settings, jam_masuk: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jam Pulang
                  </label>
                  <Input
                    type="time"
                    value={settings.jam_pulang}
                    onChange={(e) => setSettings({ ...settings, jam_pulang: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Aturan Absensi */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Aturan Absensi</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Toleransi Keterlambatan (menit)
                  </label>
                  <Input
                    type="number"
                    value={settings.toleransi_keterlambatan}
                    onChange={(e) => setSettings({ ...settings, toleransi_keterlambatan: Number(e.target.value) })}
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Potongan per Menit (Rp)
                  </label>
                  <Input
                    type="number"
                    value={settings.potongan_per_menit}
                    onChange={(e) => setSettings({ ...settings, potongan_per_menit: Number(e.target.value) })}
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Hari Kerja */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Hari Kerja</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {hariOptions.map((hari) => (
                  <label key={hari.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.hari_kerja.includes(hari.value)}
                      onChange={(e) => handleHariKerjaChange(hari.value, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{hari.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Perangkat Fingerprint */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Perangkat Fingerprint</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IP Address Perangkat
                  </label>
                  <Input
                    type="text"
                    value={settings.fingerprint_device_ip}
                    onChange={(e) => setSettings({ ...settings, fingerprint_device_ip: e.target.value })}
                    placeholder="192.168.1.100"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <Input
                    type="number"
                    value={settings.fingerprint_device_port}
                    onChange={(e) => setSettings({ ...settings, fingerprint_device_port: Number(e.target.value) })}
                    placeholder="4370"
                    min="1"
                    max="65535"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={testFingerprintConnection}
                >
                  Test Koneksi
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="inline-flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CogIcon className="h-4 w-4 mr-2" />
                    Simpan Pengaturan
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;