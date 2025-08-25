import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  PencilIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import DashboardLayout from '../components/layouts/DashboardLayout';
import DataTable from '../components/ui/DataTable';
import useDataTable from '../hooks/useDataTable';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { cn } from '../utils/cn';
import { useToast } from '../contexts/ToastContext';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const UsersPage = () => {
  const router = useRouter();
  const { addToast } = useToast();
  const { state, actions } = useDataTable({
    initialPageSize: 10,
    searchDebounceMs: 500,
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Fetch users data
  const fetchUsers = async () => {
    actions.setLoading(true);
    actions.setError(null);

    try {
      const params = new URLSearchParams({
        page: state.pagination.current.toString(),
        pageSize: state.pagination.pageSize.toString(),
        search: state.search,
        ...(state.sort && {
          sortField: state.sort.field,
          sortOrder: state.sort.order,
        }),
      });

      const response = await fetch(`/api/users?${params}`);
      const result = await response.json();

      if (result.success) {
        actions.setData(result.data);
        actions.setPagination(result.pagination);
        
        // Show success toast only on initial load or when search/filter changes
        if (state.pagination.current === 1 || state.search) {
          addToast({
            type: 'success',
            title: 'Data Berhasil Dimuat',
            message: `Ditemukan ${result.data.length} pengguna`,
          });
        }
      } else {
        actions.setError(result.message || 'Gagal memuat pengguna');
        addToast({
          type: 'error',
          title: 'Kesalahan',
          message: result.message || 'Gagal memuat pengguna',
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      actions.setError('Gagal memuat pengguna');
      addToast({
          type: 'error',
          title: 'Kesalahan',
          message: 'Gagal terhubung ke server',
        });
    } finally {
      actions.setLoading(false);
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [state.pagination.current, state.pagination.pageSize, state.search, state.sort]);

  const handleDeleteUser = async (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh data
        fetchUsers();
        setDeleteModalOpen(false);
        setUserToDelete(null);
      } else {
        actions.setError('Gagal menghapus pengguna');
        addToast({
          type: 'error',
          title: 'Kesalahan',
          message: 'Gagal menghapus pengguna',
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      actions.setError('Gagal menghapus pengguna');
      addToast({
        type: 'error',
        title: 'Kesalahan',
        message: 'Gagal menghapus pengguna',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'
        )}
      >
        {status}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleClasses = {
      admin: 'bg-purple-100 text-purple-800',
      moderator: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          roleClasses[role as keyof typeof roleClasses] || 'bg-gray-100 text-gray-800'
        )}
      >
        {role}
      </span>
    );
  };

  const columns = [
    {
      key: 'name',
      title: 'Nama',
      dataIndex: 'name',
      sortable: true,
      render: (value: string, record: User) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
              {value.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'username',
      title: 'Nama Pengguna',
      dataIndex: 'username',
      sortable: true,
    },
    {
      key: 'role',
      title: 'Peran',
      dataIndex: 'role',
      sortable: true,
      render: (value: string) => getRoleBadge(value),
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      sortable: true,
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'created_at',
      title: 'Dibuat Pada',
      dataIndex: 'created_at',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Aksi',
      align: 'center' as const,
      render: (_: any, record: User) => (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/users/${record.id}`)}
            className="text-blue-600 hover:text-blue-800"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/users/${record.id}/edit`)}
            className="text-green-600 hover:text-green-800"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteUser(record)}
            className="text-red-600 hover:text-red-800"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Head>
        <title>Manajemen Pengguna - AFMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
              {state.data.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {state.pagination.total} pengguna dimuat
                </span>
              )}
            </div>
            <p className="text-gray-600">Kelola pengguna sistem dan izin mereka</p>
          </div>
          <Button
            onClick={() => router.push('/users/create')}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Tambah Pengguna</span>
          </Button>
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{state.error}</div>
          </div>
        )}

        {/* Data Table */}
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={state.data}
            loading={state.loading}
            pagination={state.pagination}
            onPaginationChange={actions.handlePaginationChange}
            onSortChange={actions.handleSortChange}
            onSearch={actions.handleSearchChange}
            searchable
            searchPlaceholder="Cari pengguna berdasarkan nama, email, atau username..."
            rowSelection={{
              selectedRowKeys: selectedUsers,
              onChange: (selectedRowKeys) => setSelectedUsers(selectedRowKeys),
            }}
            emptyText="Tidak ada pengguna ditemukan"
          />
          
          {/* Status Bar */}
          {!state.loading && state.data.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-md">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                   <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                   Data berhasil dimuat
                 </span>
                 <span>Menampilkan {state.data.length} dari {state.pagination.total} pengguna</span>
              </div>
              <span>Terakhir diperbarui: {new Date().toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg border p-4 flex items-center space-x-4 z-50">
            <span className="text-sm text-gray-600">
              {selectedUsers.length} pengguna dipilih
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Handle bulk delete
                console.log('Bulk delete:', selectedUsers);
              }}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4 mr-1" />
              Hapus Terpilih
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUsers([])}
            >
              Batal
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Hapus Pengguna"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Apakah Anda yakin ingin menghapus pengguna{' '}
            <span className="font-medium">{userToDelete?.name}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Hapus
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default UsersPage;