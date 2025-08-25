import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { Bon, Karyawan, BonFormData, PaginatedResponse } from '../../types';
import { karyawanApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import TataLetakDasbor from '../../components/layouts/TataLetakDasbor';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/Input';
import {
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';



const BonPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [bon, setBon] = useState<Bon[]>([]);
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<BonFormData>({
    karyawan_id: 0,
    jumlah_bon: 0,
    cicilan_per_bulan: 0,
    keterangan: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!isLoading && user?.role !== 'admin') {
      router.push('/dasbor');
      return;
    }

    if (isAuthenticated && user?.role === 'admin') {
      fetchBon();
      fetchKaryawan();
    }
  }, [isAuthenticated, isLoading, user, router, currentPage, searchTerm, statusFilter]);

  const fetchBon = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bon?page=${currentPage}&search=${searchTerm}&status=${statusFilter}`);
      const data = await response.json();
      
      if (data.success) {
        setBon(data.data);
        setTotalPages(data.pagination?.last_page || 1);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: data.message || 'Gagal mengambil data bon'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat mengambil data bon'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchKaryawan = async () => {
    try {
      const response = await karyawanApi.getKaryawan({ limit: 1000 });
      if (response.success && response.data) {
        setKaryawan(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching karyawan:', error);
    }
  };

  const checkEligibility = async (karyawanId: string, amount?: string) => {
    try {
      const url = `/api/bon/eligibility?karyawan_id=${karyawanId}${amount ? `&amount=${amount}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setEligibilityData(result.data);
        return result.data;
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setValidationErrors([]);
    setValidationWarnings([]);

    try {
      const submitData = {
        karyawan_id: formData.karyawan_id,
        jumlah_bon: formData.jumlah_bon,
        cicilan_per_bulan: formData.cicilan_per_bulan,
        keterangan: formData.keterangan
      };

      const response = await fetch('/api/bon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Bon berhasil diajukan'
        });
        setShowModal(false);
        resetForm();
        fetchBon();
      } else {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors);
        }
        if (data.validationWarnings) {
          setValidationWarnings(data.validationWarnings);
        }
        addToast({
          type: 'error',
          title: 'Error',
          message: data.message || 'Gagal mengajukan bon'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat mengajukan bon'
      });
    }
  };

  const handleKaryawanChange = async (karyawanId: string) => {
    setFormData({ ...formData, karyawan_id: parseInt(karyawanId) || 0 });
    if (karyawanId) {
      await checkEligibility(karyawanId);
    } else {
      setEligibilityData(null);
    }
  };

  const handleAmountChange = async (amount: string) => {
    setFormData({ ...formData, jumlah_bon: parseFloat(amount) || 0 });
    if (formData.karyawan_id && amount) {
      await checkEligibility(formData.karyawan_id.toString(), amount);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch(`/api/bon/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await response.json();

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Bon berhasil disetujui'
        });
        fetchBon();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: data.message || 'Gagal menyetujui bon'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat menyetujui bon'
      });
    }
  };

  const handleReject = async (id: number) => {
    try {
      const response = await fetch(`/api/bon/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reject' }),
      });

      const data = await response.json();

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Bon berhasil ditolak'
        });
        fetchBon();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: data.message || 'Gagal menolak bon'
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat menolak bon'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      karyawan_id: 0,
      jumlah_bon: 0,
      cicilan_per_bulan: 0,
      keterangan: ''
    });
    setFormErrors({});
    setEditingId(null);
    setEligibilityData(null);
    setValidationErrors([]);
    setValidationWarnings([]);
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Disetujui' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Ditolak' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Selesai' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dibatalkan' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.bg,
        config.text
      )}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TataLetakDasbor>
      <Head>
        <title>Manajemen Bon - AFMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
              Manajemen Bon
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Kelola pengajuan dan persetujuan bon karyawan
            </p>
          </div>
          <Button
            onClick={openModal}
            className="mt-4 sm:mt-0"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Ajukan Bon Baru
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Cari nama karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
                <option value="completed">Selesai</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Karyawan
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4" />
                      Jumlah Bon
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4" />
                      Sisa Bon
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4" />
                      Cicilan/Bulan
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <CalendarDaysIcon className="h-4 w-4" />
                      Tanggal Pengajuan
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : bon.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Tidak ada data bon
                    </td>
                  </tr>
                ) : (
                  bon.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.karyawan?.nama || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.karyawan?.telepon || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.jumlah_bon)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.sisa_bon)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.cicilan_per_bulan)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.tanggal_pengajuan).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {item.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => handleApprove(item.id)}
                              >
                                <CheckIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(item.id)}
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
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
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
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
                      className="rounded-r-none"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-l-none"
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Ajukan Bon Baru
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Karyawan *
                  </label>
                  <select
                    value={formData.karyawan_id}
                    onChange={(e) => handleKaryawanChange(e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                      formErrors.karyawan_id ? 'border-red-500' : 'border-gray-300'
                    )}
                    required
                  >
                    <option value="">Pilih Karyawan</option>
                    {karyawan.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama} - {k.jabatan?.nama_jabatan}
                      </option>
                    ))}
                  </select>
                  {formErrors.karyawan_id && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.karyawan_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Bon *
                  </label>
                  <Input
                    type="number"
                    value={formData.jumlah_bon}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={formErrors.jumlah_bon ? 'border-red-500' : ''}
                    placeholder="Masukkan jumlah bon"
                    required
                  />
                  {formErrors.jumlah_bon && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.jumlah_bon}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cicilan per Bulan *
                  </label>
                  <Input
                    type="number"
                    value={formData.cicilan_per_bulan}
                    onChange={(e) => setFormData({ ...formData, cicilan_per_bulan: parseFloat(e.target.value) || 0 })}
                    className={formErrors.cicilan_per_bulan ? 'border-red-500' : ''}
                    placeholder="Masukkan cicilan per bulan"
                    required
                  />
                  {formErrors.cicilan_per_bulan && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.cicilan_per_bulan}</p>
                  )}
                </div>

                {/* Eligibility Information */}
                {eligibilityData && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Informasi Kelayakan</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>Gaji Pokok: {formatCurrency(eligibilityData.gaji_pokok)}</p>
                      <p>Maksimal Bon: {formatCurrency(eligibilityData.max_bon_amount)}</p>
                      <p>Bon Aktif: {formatCurrency(eligibilityData.current_bon_amount)}</p>
                      <p>Sisa Limit: {formatCurrency(eligibilityData.remaining_limit)}</p>
                      <p className={`font-medium ${
                        eligibilityData.is_eligible ? 'text-green-600' : 'text-red-600'
                      }`}>
                        Status: {eligibilityData.is_eligible ? 'Layak' : 'Tidak Layak'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Error Validasi</h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Validation Warnings */}
                {validationWarnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-yellow-900 mb-2">Peringatan</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {validationWarnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <textarea
                    value={formData.keterangan}
                    onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Masukkan keterangan (opsional)"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                  >
                    Batal
                  </Button>
                  <Button type="submit">
                    Ajukan Bon
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </TataLetakDasbor>
  );
};

export default BonPage;