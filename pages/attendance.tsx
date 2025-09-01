import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import TataLetakDasbor from '../components/layouts/TataLetakDasbor';
import DataTable from '../components/ui/DataTable';
import useDataTable from '../hooks/useDataTable';
import { Button } from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Select } from '../components/ui/Dropdown';
import { cn } from '../utils/cn';

interface AttendanceRecord {
  id: string;
  user_id: string;
  tanggal: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  status: string;
  keterangan: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
  };
}

const AttendancePage = () => {
  const router = useRouter();
  const { state, actions } = useDataTable({
    initialPageSize: 15,
    searchDebounceMs: 500,
  });

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
  });

  const [showFilters, setShowFilters] = useState(false);

  // Fetch attendance data
  const fetchAttendance = async () => {
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
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await fetch(`/api/attendance?${params}`);
      const result = await response.json();

      if (result.success) {
        actions.setData(result.data);
        actions.setPagination(result.pagination);
      } else {
        actions.setError(result.message || 'Gagal memuat data kehadiran');
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      actions.setError('Gagal memuat data kehadiran');
    } finally {
      actions.setLoading(false);
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    fetchAttendance();
  }, [state.pagination.current, state.pagination.pageSize, state.search, state.sort, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Reset to first page when filters change
    actions.handlePaginationChange(1, state.pagination.pageSize);
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      hadir: { bg: 'bg-green-100', text: 'text-green-800', label: 'Hadir' },
      terlambat: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Terlambat' },
      tidak_hadir: { bg: 'bg-red-100', text: 'text-red-800', label: 'Tidak Hadir' },
      izin: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Izin' },
      sakit: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Sakit' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: status,
    };

    return (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          config.bg,
          config.text
        )}
      >
        {config.label}
      </span>
    );
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time.substring(0, 5); // Format HH:MM
  };

  const calculateWorkingHours = (jamMasuk: string | null, jamKeluar: string | null) => {
    if (!jamMasuk || !jamKeluar) return '-';
    
    const masuk = new Date(`2000-01-01T${jamMasuk}`);
    const keluar = new Date(`2000-01-01T${jamKeluar}`);
    const diff = keluar.getTime() - masuk.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const columns = [
    {
      key: 'user',
      title: 'Karyawan',
      sortable: true,
      render: (_: any, record: AttendanceRecord) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
              {record.user.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{record.user.name}</div>
            <div className="text-sm text-gray-500">{record.user.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'tanggal',
      title: 'Tanggal',
      dataIndex: 'tanggal',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center">
          <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
          {new Date(value).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      ),
    },
    {
      key: 'jam_masuk',
      title: 'Jam Masuk',
      dataIndex: 'jam_masuk',
      sortable: true,
      render: (value: string | null) => (
        <div className="flex items-center">
          <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
          <span className={cn(
            'font-mono text-sm',
            value ? 'text-gray-900' : 'text-gray-400'
          )}>
            {formatTime(value)}
          </span>
        </div>
      ),
    },
    {
      key: 'jam_keluar',
      title: 'Jam Keluar',
      dataIndex: 'jam_keluar',
      sortable: true,
      render: (value: string | null) => (
        <div className="flex items-center">
          <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
          <span className={cn(
            'font-mono text-sm',
            value ? 'text-gray-900' : 'text-gray-400'
          )}>
            {formatTime(value)}
          </span>
        </div>
      ),
    },
    {
      key: 'working_hours',
      title: 'Jam Kerja',
      render: (_: any, record: AttendanceRecord) => (
        <span className="font-mono text-sm text-gray-900">
          {calculateWorkingHours(record.jam_masuk, record.jam_keluar)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      sortable: true,
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'keterangan',
      title: 'Keterangan',
      dataIndex: 'keterangan',
      render: (value: string | null) => (
        <span className="text-sm text-gray-600">
          {value || '-'}
        </span>
      ),
    },
  ];

  const statusOptions = [
    { label: 'Semua Status', value: '' },
    { label: 'Hadir', value: 'hadir' },
    { label: 'Terlambat', value: 'terlambat' },
    { label: 'Tidak Hadir', value: 'tidak_hadir' },
    { label: 'Izin', value: 'izin' },
    { label: 'Sakit', value: 'sakit' },
  ];

  return (
    <TataLetakDasbor>
      <Head>
        <title>Catatan Kehadiran - AFMS</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catatan Kehadiran</h1>
            <p className="text-gray-600">Pantau kehadiran karyawan dan jam kerja</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <FunnelIcon className="w-5 h-5" />
              <span>Saring</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Handle export functionality
                console.log('Export attendance data');
              }}
              className="flex items-center space-x-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>Ekspor</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  options={statusOptions}
                  value={filters.status}
                  onChange={(value) => handleFilterChange('status', value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Hapus Filter
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Error Message */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{state.error}</div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Hadir Hari Ini</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Terlambat Hari Ini</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tidak Hadir Hari Ini</p>
                <p className="text-2xl font-semibold text-gray-900">-</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Catatan</p>
                <p className="text-2xl font-semibold text-gray-900">{state.pagination.total}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={state.data}
          loading={state.loading}
          pagination={state.pagination}
          onPaginationChange={actions.handlePaginationChange}
          onSortChange={actions.handleSortChange}
          onSearch={actions.handleSearchChange}
          searchable
          searchPlaceholder="Cari berdasarkan nama karyawan atau username..."
          emptyText="Tidak ada catatan kehadiran ditemukan"
          pageSizeOptions={[10, 15, 25, 50]}
        />
      </div>
    </TataLetakDasbor>
  );
};

export default AttendancePage;