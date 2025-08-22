import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DataTable from '../../components/ui/DataTable';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Cabang {
  id: number;
  nama: string;
  alamat: string;
  telepon: string;
  email: string;
  kode: string;
  status: 'aktif' | 'nonaktif';
  created_at: string;
  updated_at: string;
}

const CabangPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCabang, setEditingCabang] = useState<Cabang | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    alamat: '',
    telepon: '',
    email: '',
    kode: '',
    status: 'aktif' as 'aktif' | 'nonaktif'
  });

  // Mock data for demonstration
  const mockCabang: Cabang[] = [
    {
      id: 1,
      nama: 'Cabang Pusat',
      alamat: 'Jl. Sudirman No. 123, Jakarta',
      telepon: '021-12345678',
      email: 'pusat@afms.com',
      kode: 'CP001',
      status: 'aktif',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      nama: 'Cabang Bandung',
      alamat: 'Jl. Asia Afrika No. 456, Bandung',
      telepon: '022-87654321',
      email: 'bandung@afms.com',
      kode: 'CB002',
      status: 'aktif',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z'
    }
  ];

  useEffect(() => {
    fetchCabang();
  }, []);

  const fetchCabang = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setCabangList(mockCabang);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching cabang:', error);
      showToast('Gagal memuat data cabang', 'error');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCabang) {
        // Update existing cabang
        const updatedCabang = {
          ...editingCabang,
          ...formData,
          updated_at: new Date().toISOString()
        };
        setCabangList(prev => prev.map(c => c.id === editingCabang.id ? updatedCabang : c));
        showToast('Cabang berhasil diperbarui', 'success');
      } else {
        // Create new cabang
        const newCabang: Cabang = {
          id: Date.now(),
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setCabangList(prev => [...prev, newCabang]);
        showToast('Cabang berhasil ditambahkan', 'success');
      }
      
      setShowModal(false);
      setEditingCabang(null);
      setFormData({
        nama: '',
        alamat: '',
        telepon: '',
        email: '',
        kode: '',
        status: 'aktif'
      });
    } catch (error) {
      console.error('Error saving cabang:', error);
      showToast('Gagal menyimpan data cabang', 'error');
    }
  };

  const handleEdit = (cabang: Cabang) => {
    setEditingCabang(cabang);
    setFormData({
      nama: cabang.nama,
      alamat: cabang.alamat,
      telepon: cabang.telepon,
      email: cabang.email,
      kode: cabang.kode,
      status: cabang.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus cabang ini?')) {
      try {
        setCabangList(prev => prev.filter(c => c.id !== id));
        showToast('Cabang berhasil dihapus', 'success');
      } catch (error) {
        console.error('Error deleting cabang:', error);
        showToast('Gagal menghapus cabang', 'error');
      }
    }
  };

  const columns = [
    {
      key: 'kode',
      label: 'Kode',
      sortable: true
    },
    {
      key: 'nama',
      label: 'Nama Cabang',
      sortable: true
    },
    {
      key: 'alamat',
      label: 'Alamat',
      sortable: false
    },
    {
      key: 'telepon',
      label: 'Telepon',
      sortable: false
    },
    {
      key: 'email',
      label: 'Email',
      sortable: false
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'aktif' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value === 'aktif' ? 'Aktif' : 'Nonaktif'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      render: (_: any, row: Cabang) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-800"
            title="Hapus"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Cabang</h1>
            <p className="text-gray-600">Kelola data cabang perusahaan</p>
          </div>
          <Button
            onClick={() => {
              setEditingCabang(null);
              setFormData({
                nama: '',
                alamat: '',
                telepon: '',
                email: '',
                kode: '',
                status: 'aktif'
              });
              setShowModal(true);
            }}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Tambah Cabang</span>
          </Button>
        </div>

        <DataTable
          data={cabangList}
          columns={columns}
          loading={loading}
          searchable
          searchPlaceholder="Cari cabang..."
        />

        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingCabang(null);
          }}
          title={editingCabang ? 'Edit Cabang' : 'Tambah Cabang'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Kode Cabang"
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                required
                placeholder="Contoh: CP001"
              />
              <Input
                label="Nama Cabang"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                required
                placeholder="Nama cabang"
              />
            </div>
            
            <Input
              label="Alamat"
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              required
              placeholder="Alamat lengkap cabang"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Telepon"
                value={formData.telepon}
                onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                required
                placeholder="Nomor telepon"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="Email cabang"
              />
            </div>
            
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
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  setEditingCabang(null);
                }}
              >
                Batal
              </Button>
              <Button type="submit">
                {editingCabang ? 'Perbarui' : 'Simpan'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default CabangPage;