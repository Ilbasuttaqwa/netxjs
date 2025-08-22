import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Activity {
  id: number;
  type: 'masuk' | 'keluar' | 'terlambat' | 'alpha';
  karyawan_nama: string;
  waktu: string;
  keterangan?: string;
}

const RecentActivities: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Add small delay to ensure token is properly set
      const timer = setTimeout(() => {
        fetchActivities();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getRecentActivities(10);
      if (response.success && response.data) {
        setActivities(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      // Use dummy data if API fails
      setActivities([
        {
          id: 1,
          type: 'masuk',
          karyawan_nama: 'John Doe',
          waktu: '08:00',
          keterangan: 'Masuk tepat waktu',
        },
        {
          id: 2,
          type: 'terlambat',
          karyawan_nama: 'Jane Smith',
          waktu: '08:30',
          keterangan: 'Terlambat 30 menit',
        },
        {
          id: 3,
          type: 'keluar',
          karyawan_nama: 'Bob Johnson',
          waktu: '17:00',
          keterangan: 'Pulang tepat waktu',
        },
        {
          id: 4,
          type: 'alpha',
          karyawan_nama: 'Alice Brown',
          waktu: '-',
          keterangan: 'Tidak hadir tanpa keterangan',
        },
      ]);
      
      addToast({
        type: 'warning',
        title: 'Peringatan',
        message: 'Menggunakan data dummy untuk aktivitas terbaru',
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'masuk':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'keluar':
        return <ClockIcon className="h-5 w-5 text-primary-500" />;
      case 'terlambat':
        return <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" />;
      case 'alpha':
        return <XCircleIcon className="h-5 w-5 text-danger-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'masuk':
        return 'text-success-600';
      case 'keluar':
        return 'text-primary-600';
      case 'terlambat':
        return 'text-warning-600';
      case 'alpha':
        return 'text-danger-600';
      default:
        return 'text-gray-600';
    }
  };

  const getActivityLabel = (type: Activity['type']) => {
    switch (type) {
      case 'masuk':
        return 'Masuk';
      case 'keluar':
        return 'Keluar';
      case 'terlambat':
        return 'Terlambat';
      case 'alpha':
        return 'Alpha';
      default:
        return 'Tidak Diketahui';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h3>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Lihat Semua
        </button>
      </div>
      
      {loading || !isAuthenticated ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center space-x-3 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada aktivitas hari ini</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.karyawan_nama}
                    </p>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full bg-gray-100 ${getActivityColor(activity.type)}`}>
                      {getActivityLabel(activity.type)}
                    </span>
                  </div>
                  {activity.keterangan && (
                    <p className="text-sm text-gray-500 truncate">
                      {activity.keterangan}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <p className="text-sm text-gray-500">{activity.waktu}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RecentActivities;
