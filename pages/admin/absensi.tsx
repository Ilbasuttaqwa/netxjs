import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { Absensi, Karyawan, Cabang } from '../../types';
import { absensiApi, karyawanApi, cabangApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface FilterData {
  tanggal_mulai: string;
  tanggal_selesai: string;
  cabang_id: string;
  karyawan_id: string;
  status: string;
}

const AbsensiPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [absensi, setAbsensi] = useState<Absensi[]>([]);
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilter, setShowFilter] = useState(false);
  const [filterData, setFilterData] = useState<FilterData>({
    tanggal_mulai: '',
    tanggal_selesai: '',
    cabang_id: '',
    karyawan_id: '',
    status: '',
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchData();
    }
  }, [isAuthenticated, user, currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [absensiRes, karyawanRes, cabangRes] = await Promise.all([
        absensiApi.getAbsensi({ 
          page: currentPage, 
          ...filterData,
          cabang_id: filterData.cabang_id ? parseInt(filterData.cabang_id) : undefined,
          karyawan_id: filterData.karyawan_id ? parseInt(filterData.karyawan_id) : undefined
        }),
        karyawanApi.getKaryawan(),
          cabangApi.getCabang(),
      ]);

      if (absensiRes.success && absensiRes.data) {
        setAbsensi(absensiRes.data.data || []);
        setTotalPages(absensiRes.data.last_page || 1);
      } else {
        // Use dummy data if API fails
        setAbsensi([
          {
            id: 1,
            karyawan_id: 1,
            tanggal: '2024-01-15',
            jam_masuk: '08:00:00',
            jam_keluar: '17:00:00',
            status: 'hadir',
            keterangan: '',
            created_at: '2024-01-15 08:00:00',
            updated_at: '2024-01-15 17:00:00',
            karyawan: {
              id: 1,
              nama: 'John Doe',
              email: 'john@example.com',
              telepon: '081234567890',
              alamat: 'Jl. Sudirman No. 123',
              jenis_kelamin: 'L',
              tanggal_masuk: '2024-01-01',
              cabang_id: 1,
              jabatan_id: 1,
              fingerprint_id: 'FP001',
              status: 'aktif',
              created_at: '2024-01-01 00:00:00',
              updated_at: '2024-01-01 00:00:00',
              cabang: { id: 1, nama_cabang: 'Kantor Pusat', alamat: 'Jakarta', telepon: '', status: 'aktif', created_at: '', updated_at: '' },
            }
          },
          {
            id: 2,
            karyawan_id: 2,
            tanggal: '2024-01-15',
            jam_masuk: '08:30:00',
            jam_keluar: '17:00:00',
            status: 'terlambat',
            keterangan: 'Terlambat 30 menit',
            created_at: '2024-01-15 08:30:00',
            updated_at: '2024-01-15 17:00:00',
            karyawan: {
              id: 2,
              nama: 'Jane Smith',
              email: 'jane@example.com',
              telepon: '081234567891',
              alamat: 'Jl. Thamrin No. 456',
              jenis_kelamin: 'P',
              tanggal_masuk: '2024-01-01',
              cabang_id: 2,
              jabatan_id: 2,
              fingerprint_id: 'FP002',
              status: 'aktif',
              created_at: '2024-01-01 00:00:00',
              updated_at: '2024-01-01 00:00:00',
              cabang: { id: 2, nama_cabang: 'Cabang Jakarta', alamat: 'Jakarta Selatan', telepon: '', status: 'aktif', created_at: '', updated_at: '' },
            }
          },
          {
            id: 3,
            karyawan_id: 1,
            tanggal: '2024-01-14',
            jam_masuk: null,
            jam_keluar: null,
            status: 'alpha',
            keterangan: 'Tidak hadir tanpa keterangan',
            created_at: '2024-01-14 00:00:00',
            updated_at: '2024-01-14 00:00:00',
            karyawan: {
              id: 1,
              nama: 'John Doe',
              email: 'john@example.com',
              telepon: '081234567890',
              alamat: 'Jl. Sudirman No. 123',
              jenis_kelamin: 'L',
              tanggal_masuk: '2024-01-01',
              cabang_id: 1,
              jabatan_id: 1,
              fingerprint_id: 'FP001',
              status: 'aktif',
              created_at: '2024-01-01 00:00:00',
              updated_at: '2024-01-01 00:00:00',
              cabang: { id: 1, nama_cabang: 'Kantor Pusat', alamat: 'Jakarta', telepon: '', status: 'aktif', created_at: '', updated_at: '' }
            },
          },
        ]);
      }

      if (karyawanRes.success && karyawanRes.data) {
        setKaryawan(Array.isArray(karyawanRes.data) ? karyawanRes.data : (karyawanRes.data.data || []));
      } else {
        setKaryawan([
          {
            id: 1,
            nama: 'John Doe',
            email: 'john@example.com',
            telepon: '081234567890',
            alamat: 'Jl. Sudirman No. 123',
            jenis_kelamin: 'L',
            tanggal_masuk: '2024-01-01',
            cabang_id: 1,
            jabatan_id: 1,
            fingerprint_id: 'FP001',
            status: 'aktif',
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-01 00:00:00',
          },
          {
            id: 2,
            nama: 'Jane Smith',
            email: 'jane@example.com',
            telepon: '081234567891',
            alamat: 'Jl. Thamrin No. 456',
            jenis_kelamin: 'P',
            tanggal_masuk: '2024-01-01',
            cabang_id: 2,
            jabatan_id: 2,
            fingerprint_id: 'FP002',
            status: 'aktif',
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-01 00:00:00',
          },
        ]);
      }

      if (cabangRes.success && cabangRes.data) {
        setCabang(Array.isArray(cabangRes.data) ? cabangRes.data : (cabangRes.data.data || []));
      } else {
        setCabang([
          { id: 1, nama_cabang: 'Kantor Pusat', alamat: 'Jakarta', telepon: '', status: 'aktif', created_at: '', updated_at: '' },
          { id: 2, nama_cabang: 'Cabang Jakarta', alamat: 'Jakarta Selatan', telepon: '', status: 'aktif', created_at: '', updated_at: '' },
        ]);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal memuat data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    setCurrentPage(1);
    fetchData();
    setShowFilter(false);
  };

  const handleResetFilter = () => {
    setFilterData({
      tanggal_mulai: '',
      tanggal_selesai: '',
      cabang_id: '',
      karyawan_id: '',
      status: '',
    });
    setCurrentPage(1);
    fetchData();
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await absensiApi.export(filterData);
      if (response.success) {
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `laporan-absensi-${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Laporan berhasil diunduh',
        });
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal mengunduh laporan',
      });
    } finally {
      setExporting(false);
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

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM
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
        <title>Laporan Absensi - AFMS</title>
        <meta name="description" content="Laporan data absensi karyawan" />
      </Head>
      
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Laporan Absensi
                </h1>
                <p className="text-gray-600 mt-1">
                  Lihat dan kelola data absensi karyawan
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowFilter(!showFilter)}
                  leftIcon={<FunnelIcon className="h-4 w-4" />}
                >
                  Filter
                </Button>
                <Button
                  onClick={handleExport}
                  loading={exporting}
                  leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
                >
                  Export Excel
                </Button>
              </div>
            </div>
          </div>

          {/* Filter */}
          {showFilter && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Data</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Tanggal Mulai"
                  type="date"
                  value={filterData.tanggal_mulai}
                  onChange={(e) => setFilterData({ ...filterData, tanggal_mulai: e.target.value })}
                />
                
                <Input
                  label="Tanggal Selesai"
                  type="date"
                  value={filterData.tanggal_selesai}
                  onChange={(e) => setFilterData({ ...filterData, tanggal_selesai: e.target.value })}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cabang
                  </label>
                  <select
                    value={filterData.cabang_id}
                    onChange={(e) => setFilterData({ ...filterData, cabang_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Semua Cabang</option>
                    {cabang.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nama_cabang}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Karyawan
                  </label>
                  <select
                    value={filterData.karyawan_id}
                    onChange={(e) => setFilterData({ ...filterData, karyawan_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Semua Karyawan</option>
                    {karyawan.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nama}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filterData.status}
                    onChange={(e) => setFilterData({ ...filterData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Semua Status</option>
                    <option value="hadir">Hadir</option>
                    <option value="terlambat">Terlambat</option>
                    <option value="alpha">Alpha</option>
                    <option value="izin">Izin</option>
                    <option value="sakit">Sakit</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-4">
                <Button
                  variant="outline"
                  onClick={handleResetFilter}
                >
                  Atur Ulang
                </Button>
                <Button
                  onClick={handleFilter}
                >
                  Terapkan Filter
                </Button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Karyawan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jam Masuk
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jam Keluar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keterangan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    [...Array(5)].map((_, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse flex items-center">
                            <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                            <div className="ml-4">
                              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse h-4 bg-gray-200 rounded w-32"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse h-6 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                        </td>
                      </tr>
                    ))
                  ) : absensi.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Tidak ada data absensi
                      </td>
                    </tr>
                  ) : (
                    absensi.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-primary-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.karyawan?.nama || 'Tidak Diketahui'}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                                {item.karyawan?.cabang?.nama_cabang || 'Tidak Diketahui'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <CalendarDaysIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm text-gray-900">
                                {formatDate(item.tanggal)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.tanggal}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {formatTime(item.jam_masuk)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {formatTime(item.jam_keluar)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">
                            {item.keterangan || '-'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Selanjutnya
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Halaman <span className="font-medium">{currentPage}</span> dari{' '}
                      <span className="font-medium">{totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Selanjutnya
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default AbsensiPage;