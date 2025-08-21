import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { Karyawan, Cabang, Jabatan, PaginatedResponse } from '@/types';
import { karyawanApi, cabangApi, jabatanApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  UserIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

interface KaryawanFormData {
  nama: string;
  email: string;
  no_hp: string;
  alamat: string;
  cabang_id: string;
  jabatan_id: string;
  finger_id?: string;
  status: 'aktif' | 'nonaktif';
}

const KaryawanPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [jabatan, setJabatan] = useState<Jabatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<KaryawanFormData>({
    nama: '',
    email: '',
    no_hp: '',
    alamat: '',
    cabang_id: '',
    jabatan_id: '',
    finger_id: '',
    status: 'aktif',
  });
  const [formErrors, setFormErrors] = useState<Partial<KaryawanFormData>>({});
  const [submitting, setSubmitting] = useState(false);

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
  }, [isAuthenticated, user, currentPage, searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [karyawanRes, cabangRes, jabatanRes] = await Promise.all([
        karyawanApi.getKaryawan({ page: currentPage, search: searchTerm }),
          cabangApi.getCabang(),
        jabatanApi.getJabatan(),
      ]);

      if (karyawanRes.success && karyawanRes.data) {
        setKaryawan(karyawanRes.data.data || []);
        setTotalPages(karyawanRes.data.last_page || 1);
      } else {
        // Use dummy data if API fails
        setKaryawan([
          {
            id: 1,
            nama: 'John Doe',
            email: 'john@example.com',
            no_hp: '081234567890',
            alamat: 'Jl. Sudirman No. 123',
            cabang_id: 1,
            jabatan_id: 1,
            finger_id: 'FP001',
            status: 'aktif',
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-01 00:00:00',
            cabang: { id: 1, nama: 'Kantor Pusat', alamat: 'Jakarta', created_at: '', updated_at: '' },
            jabatan: { id: 1, nama: 'Manager', deskripsi: 'Manager', created_at: '', updated_at: '' },
          },
          {
            id: 2,
            nama: 'Jane Smith',
            email: 'jane@example.com',
            no_hp: '081234567891',
            alamat: 'Jl. Thamrin No. 456',
            cabang_id: 2,
            jabatan_id: 2,
            finger_id: 'FP002',
            status: 'aktif',
            created_at: '2024-01-01 00:00:00',
            updated_at: '2024-01-01 00:00:00',
            cabang: { id: 2, nama: 'Cabang Jakarta', alamat: 'Jakarta Selatan', created_at: '', updated_at: '' },
            jabatan: { id: 2, nama: 'Staff', deskripsi: 'Staff', created_at: '', updated_at: '' },
          },
        ]);
      }

      if (cabangRes.success && cabangRes.data) {
        setCabang(cabangRes.data);
      } else {
        setCabang([
          { id: 1, nama: 'Kantor Pusat', alamat: 'Jakarta', created_at: '', updated_at: '' },
          { id: 2, nama: 'Cabang Jakarta', alamat: 'Jakarta Selatan', created_at: '', updated_at: '' },
        ]);
      }

      if (jabatanRes.success && jabatanRes.data) {
        setJabatan(jabatanRes.data);
      } else {
        setJabatan([
          { id: 1, nama: 'Manager', deskripsi: 'Manager', created_at: '', updated_at: '' },
          { id: 2, nama: 'Staff', deskripsi: 'Staff', created_at: '', updated_at: '' },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitting(true);

    try {
      const response = editingId
        ? await karyawanApi.update(editingId, formData)
        : await karyawanApi.create(formData);

      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: editingId ? 'Karyawan berhasil diperbarui' : 'Karyawan berhasil ditambahkan',
        });
        setShowModal(false);
        resetForm();
        fetchData();
      } else {
        if (response.errors) {
          setFormErrors(response.errors);
        } else {
          throw new Error(response.message);
        }
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal menyimpan data',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: Karyawan) => {
    setEditingId(item.id);
    setFormData({
      nama: item.nama,
      email: item.email,
      no_hp: item.no_hp,
      alamat: item.alamat,
      cabang_id: item.cabang_id.toString(),
      jabatan_id: item.jabatan_id.toString(),
      finger_id: item.finger_id || '',
      status: item.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus karyawan ini?')) return;

    try {
      const response = await karyawanApi.delete(id);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Karyawan berhasil dihapus',
        });
        fetchData();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal menghapus karyawan',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      nama: '',
      email: '',
      no_hp: '',
      alamat: '',
      cabang_id: '',
      jabatan_id: '',
      finger_id: '',
      status: 'aktif',
    });
    setFormErrors({});
    setEditingId(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const getStatusBadge = (status: string) => {
    if (status === 'aktif') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
          Aktif
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
          Nonaktif
        </span>
      );
    }
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
        <title>Manajemen Karyawan - AFMS</title>
        <meta name="description" content="Kelola data karyawan" />
      </Head>
      
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Manajemen Karyawan
                </h1>
                <p className="text-gray-600 mt-1">
                  Kelola data karyawan perusahaan
                </p>
              </div>
              <Button
                onClick={() => setShowModal(true)}
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                Tambah Karyawan
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="max-w-md">
              <Input
                type="text"
                placeholder="Cari karyawan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
              />
            </div>
          </div>

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
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cabang
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jabatan
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
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse h-4 bg-gray-200 rounded w-20"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse h-4 bg-gray-200 rounded w-16"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse h-6 bg-gray-200 rounded w-12"></div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="animate-pulse flex space-x-2">
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                            <div className="h-8 w-8 bg-gray-200 rounded"></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : karyawan.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Tidak ada data karyawan
                      </td>
                    </tr>
                  ) : (
                    karyawan.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-primary-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.nama}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {item.finger_id || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.email}</div>
                          <div className="text-sm text-gray-500">{item.no_hp}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {item.cabang?.nama || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <BriefcaseIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {item.jabatan?.nama || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              leftIcon={<PencilIcon className="h-4 w-4" />}
                            >
                              Ubah
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              leftIcon={<TrashIcon className="h-4 w-4" />}
                            >
                              Hapus
                            </Button>
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingId ? 'Edit Karyawan' : 'Tambah Karyawan'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nama"
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  error={formErrors.nama}
                  required
                />
                
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  error={formErrors.email}
                  required
                />
                
                <Input
                  label="No. HP"
                  type="text"
                  value={formData.no_hp}
                  onChange={(e) => setFormData({ ...formData, no_hp: e.target.value })}
                  error={formErrors.no_hp}
                  required
                />
                
                <Input
                  label="Alamat"
                  type="text"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  error={formErrors.alamat}
                  required
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cabang
                  </label>
                  <select
                    value={formData.cabang_id}
                    onChange={(e) => setFormData({ ...formData, cabang_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pilih Cabang</option>
                    {cabang.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nama}
                      </option>
                    ))}
                  </select>
                  {formErrors.cabang_id && (
                    <p className="mt-1 text-sm text-danger-600">{formErrors.cabang_id}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jabatan
                  </label>
                  <select
                    value={formData.jabatan_id}
                    onChange={(e) => setFormData({ ...formData, jabatan_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pilih Jabatan</option>
                    {jabatan.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nama}
                      </option>
                    ))}
                  </select>
                  {formErrors.jabatan_id && (
                    <p className="mt-1 text-sm text-danger-600">{formErrors.jabatan_id}</p>
                  )}
                </div>
                
                <Input
                  label="Finger ID (Opsional)"
                  type="text"
                  value={formData.finger_id}
                  onChange={(e) => setFormData({ ...formData, finger_id: e.target.value })}
                  error={formErrors.finger_id}
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'aktif' | 'nonaktif' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    loading={submitting}
                  >
                    {editingId ? 'Perbarui' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardLayout>
    </>
  );
};

export default KaryawanPage;