import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import { Absensi } from '../types/index';
import { absensiApi } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import TataLetakDasbor from '../components/layouts/TataLetakDasbor';
import { Button } from '../components/ui/button';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  CameraIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../utils/cn';

const AbsensiUserPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [todayAttendance, setTodayAttendance] = useState<Absensi | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<Absensi[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockingIn, setClockingin] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string>('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTodayAttendance();
      fetchRecentAttendance();
      getCurrentLocation();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationError('');
        },
        (error) => {
          setLocationError('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
        }
      );
    } else {
      setLocationError('Browser tidak mendukung geolocation.');
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await absensiApi.getByDate(today);
      if (response.success && response.data) {
        setTodayAttendance(response.data);
      } else {
        setTodayAttendance(null);
      }
    } catch (error: any) {
      // Use dummy data if API fails
      const today = new Date().toISOString().split('T')[0];
      if (today === '2024-01-15') {
        setTodayAttendance({
          id: 1,
          user_id: user?.id || 1,
          tanggal: today,
          jam_masuk: '08:00:00',
          jam_keluar: undefined,
          status: 'hadir',
          keterangan: '',
          created_at: '2024-01-15 08:00:00',
          updated_at: '2024-01-15 08:00:00',
        });
      } else {
        setTodayAttendance(null);
      }
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      setLoading(true);
      const response = await absensiApi.getMyAttendance({ limit: 7 });
      if (response.success && response.data) {
        setRecentAttendance(response.data.data || []);
      } else {
        // Use dummy data if API fails
        setRecentAttendance([
          {
            id: 1,
            user_id: user?.id || 1,
            tanggal: '2024-01-15',
            jam_masuk: '08:00:00',
            jam_keluar: '17:00:00',
            status: 'hadir',
            keterangan: '',
            created_at: '2024-01-15 08:00:00',
            updated_at: '2024-01-15 17:00:00',
          },
          {
            id: 2,
            user_id: user?.id || 1,
            tanggal: '2024-01-14',
            jam_masuk: '08:30:00',
            jam_keluar: '17:00:00',
            status: 'terlambat',
            keterangan: 'Terlambat 30 menit',
            created_at: '2024-01-14 08:30:00',
            updated_at: '2024-01-14 17:00:00',
          },
          {
            id: 3,
            user_id: user?.id || 1,
            tanggal: '2024-01-13',
            jam_masuk: undefined,
            jam_keluar: undefined,
            status: 'tidak_hadir',
            keterangan: 'Tidak hadir tanpa keterangan',
            created_at: '2024-01-13 00:00:00',
            updated_at: '2024-01-13 00:00:00',
          },
        ]);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal memuat riwayat absensi',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!location) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Lokasi diperlukan untuk absen masuk',
      });
      return;
    }

    try {
      setClockingin(true);
      const response = await absensiApi.clockIn({
        latitude: location.lat,
        longitude: location.lng,
      });
      
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Absen masuk berhasil dicatat',
        });
        fetchTodayAttendance();
        fetchRecentAttendance();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal melakukan absen masuk',
      });
    } finally {
      setClockingin(false);
    }
  };

  const handleClockOut = async () => {
    if (!location) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Lokasi diperlukan untuk absen keluar',
      });
      return;
    }

    try {
      setClockingOut(true);
      const response = await absensiApi.clockOut({
        latitude: location.lat,
        longitude: location.lng,
      });
      
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Absen keluar berhasil dicatat',
        });
        fetchTodayAttendance();
        fetchRecentAttendance();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal melakukan absen keluar',
      });
    } finally {
      setClockingOut(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'hadir':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Hadir
          </span>
        );
      case 'terlambat':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            Terlambat
          </span>
        );
      case 'alpha':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
            <XCircleIcon className="h-3 w-3 mr-1" />
            Alpha
          </span>
        );
      case 'izin':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Izin
          </span>
        );
      case 'sakit':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Sakit
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
        <title>Absensi - AFMS</title>
        <meta name="description" content="Sistem absensi karyawan" />
      </Head>
      
      <TataLetakDasbor>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Selamat Datang, {user?.nama_pegawai}
              </h1>
              <p className="text-gray-600 mt-1">
                {formatCurrentDate()}
              </p>
              <div className="text-3xl font-mono font-bold text-primary-600 mt-2">
                {formatCurrentTime()}
              </div>
            </div>
          </div>

          {/* Clock In/Out Section */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Absensi Hari Ini
              </h2>
              
              {locationError && (
                <div className="mb-4 p-3 bg-warning-50 border border-warning-200 rounded-md">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-warning-400 mr-2" />
                    <span className="text-sm text-warning-700">{locationError}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    className="mt-2"
                    leftIcon={<MapPinIcon className="h-4 w-4" />}
                  >
                    Coba Lagi
                  </Button>
                </div>
              )}
              
              {location && (
                <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-md">
                  <div className="flex items-center justify-center">
                    <MapPinIcon className="h-5 w-5 text-success-400 mr-2" />
                    <span className="text-sm text-success-700">
                      Lokasi terdeteksi: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
                {!todayAttendance?.jam_masuk ? (
                  <Button
                    onClick={handleClockIn}
                    loading={clockingIn}
                    disabled={!location}
                    size="lg"
                    className="h-20"
                    leftIcon={<ArrowRightOnRectangleIcon className="h-6 w-6" />}
                  >
                    <div>
                      <div className="font-semibold">Absen Masuk</div>
                      <div className="text-sm opacity-75">Clock In</div>
                    </div>
                  </Button>
                ) : (
                  <div className="h-20 bg-success-50 border-2 border-success-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <CheckCircleIcon className="h-6 w-6 text-success-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-success-800">
                        Masuk: {formatTime(todayAttendance.jam_masuk)}
                      </div>
                    </div>
                  </div>
                )}
                
                {todayAttendance?.jam_masuk && !todayAttendance?.jam_keluar ? (
                  <Button
                    onClick={handleClockOut}
                    loading={clockingOut}
                    disabled={!location}
                    variant="destructive"
                    size="lg"
                    className="h-20"
                    leftIcon={<ArrowLeftOnRectangleIcon className="h-6 w-6" />}
                  >
                    <div>
                      <div className="font-semibold">Absen Keluar</div>
                      <div className="text-sm opacity-75">Clock Out</div>
                    </div>
                  </Button>
                ) : todayAttendance?.jam_keluar ? (
                  <div className="h-20 bg-danger-50 border-2 border-danger-200 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <CheckCircleIcon className="h-6 w-6 text-danger-600 mx-auto mb-1" />
                      <div className="text-sm font-medium text-danger-800">
                        Keluar: {formatTime(todayAttendance.jam_keluar)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 bg-gray-50 border-2 border-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <ClockIcon className="h-6 w-6 mx-auto mb-1" />
                      <div className="text-sm">Belum Absen Masuk</div>
                    </div>
                  </div>
                )}
              </div>
              
              {todayAttendance && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center space-x-4">
                    <span className="text-sm text-gray-600">Status Hari Ini:</span>
                    {getStatusBadge(todayAttendance.status)}
                  </div>
                  {todayAttendance.keterangan && (
                    <div className="mt-2 text-sm text-gray-600">
                      Keterangan: {todayAttendance.keterangan}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Riwayat Absensi</h3>
            </div>
            
            {loading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recentAttendance.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    Belum ada riwayat absensi
                  </div>
                ) : (
                  recentAttendance.map((item) => (
                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <CalendarDaysIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(item.tanggal)}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center space-x-4">
                              <span className="flex items-center">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                Masuk: {formatTime(item.jam_masuk)}
                              </span>
                              <span className="flex items-center">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                Keluar: {formatTime(item.jam_keluar)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(item.status)}
                          {item.keterangan && (
                            <div className="text-xs text-gray-500 mt-1">
                              {item.keterangan}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </TataLetakDasbor>
    </>
  );
};

export default AbsensiUserPage;