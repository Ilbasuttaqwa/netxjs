import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import TataLetakDasbor from '../../components/layouts/TataLetakDasbor';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Modal from '../../components/ui/modal';
import DataTable from '../../components/ui/DataTable';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Cabang {
  id: number;
  nama: string;
  alamat: string;
  telepon: string;
  kode: string;
  status: 'aktif' | 'nonaktif';
  created_at: string;
  updated_at: string;
}

const CabangPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCabang, setEditingCabang] = useState<Cabang | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    alamat: '',
    telepon: '',
    kode: '',
    status: 'aktif' as 'aktif' | 'nonaktif'
  });



  useEffect(() => {
    fetchCabang();
  }, []);

  const fetchCabang = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await cabangApi.getCabang();
      // setCabangList(response.data);
      setCabangList([]);
    } catch (error) {
      console.error('Error fetching cabang:', error);
      addToast({ type: 'error', title: 'Gagal memuat data cabang' });
    } finally {
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
        addToast({ type: 'success', title: 'Cabang berhasil diperbarui' });
      } else {
        // Create new cabang
        const newCabang: Cabang = {
          id: Date.now(),
          ...formData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setCabangList(prev => [...prev, newCabang]);
        addToast({ type: 'success', title: 'Cabang berhasil ditambahkan' });
      }
      
      setShowModal(false);
      setEditingCabang(null);
      setFormData({
        nama: '',
        alamat: '',
        telepon: '',
        kode: '',
        status: 'aktif'
      });
    } catch (error) {
      console.error('Error saving cabang:', error);
      addToast({ type: 'error', title: 'Gagal menyimpan data cabang' });
    }
  };

  const handleEdit = (cabang: Cabang) => {
    setEditingCabang(cabang);
    setFormData({
      nama: cabang.nama,
        alamat: cabang.alamat,
        telepon: cabang.telepon,
        kode: cabang.kode,
        status: cabang.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus cabang ini?')) {
      try {
        setCabangList(prev => prev.filter(c => c.id !== id));
        addToast({ type: 'success', title: 'Cabang berhasil dihapus' });
      } catch (error) {
        console.error('Error deleting cabang:', error);
        addToast({ type: 'error', title: 'Gagal menghapus cabang' });
      }
    }
  };

  const columns = [
    {
      key: 'kode',
      title: 'Kode',
      sortable: true
    },
    {
      key: 'nama',
      title: 'Nama Cabang',
      sortable: true
    },
    {
      key: 'alamat',
      title: 'Alamat',
      sortable: false
    },
    {
      key: 'telepon',
      title: 'Telepon',
      sortable: false
    },

    {
      key: 'status',
      title: 'Status',
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
      title: 'Aksi',
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
    <TataLetakDasbor>
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
            
            <Input
              label="Telepon"
              value={formData.telepon}
              onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
              required
              placeholder="Nomor telepon"
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
    </TataLetakDasbor>
  );
};

export default CabangPage;