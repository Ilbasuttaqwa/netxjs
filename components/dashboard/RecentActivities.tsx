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
      // Set empty activities if API fails
      setActivities([]);
      
      console.error('Error fetching activities:', error);
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
    <div className="card-glass bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg rounded-xl p-6 hover-lift transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-glow">
            <ClockIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Aktivitas Terbaru</h3>
            <p className="text-sm text-gray-600">Kegiatan karyawan hari ini</p>
          </div>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105">
          Lihat Semua
        </button>
      </div>
      
      {loading || !isAuthenticated ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl animate-pulse">
              <div className="h-12 w-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4 mb-2"></div>
                <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/2"></div>
              </div>
              <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-16"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-xl opacity-50"></div>
                <ClockIcon className="relative h-16 w-16 text-gray-400 mx-auto mb-4" />
              </div>
              <p className="text-gray-500 font-medium">Belum ada aktivitas hari ini</p>
              <p className="text-sm text-gray-400 mt-1">Aktivitas akan muncul saat karyawan melakukan absensi</p>
            </div>
          ) : (
            activities.map((activity, index) => {
              const getActivityBgColor = (type: Activity['type']) => {
                switch (type) {
                  case 'masuk':
                    return 'from-emerald-50 to-green-50 border-emerald-200';
                  case 'keluar':
                    return 'from-blue-50 to-indigo-50 border-blue-200';
                  case 'terlambat':
                    return 'from-yellow-50 to-orange-50 border-yellow-200';
                  case 'alpha':
                    return 'from-red-50 to-pink-50 border-red-200';
                  default:
                    return 'from-gray-50 to-gray-100 border-gray-200';
                }
              };
              
              const getIconBgColor = (type: Activity['type']) => {
                switch (type) {
                  case 'masuk':
                    return 'from-emerald-500 to-green-600';
                  case 'keluar':
                    return 'from-blue-500 to-indigo-600';
                  case 'terlambat':
                    return 'from-yellow-500 to-orange-600';
                  case 'alpha':
                    return 'from-red-500 to-pink-600';
                  default:
                    return 'from-gray-500 to-gray-600';
                }
              };
              
              return (
                <div 
                  key={activity.id} 
                  className={`group relative overflow-hidden bg-gradient-to-r ${getActivityBgColor(activity.type)} border rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:scale-[1.02]`}
                  style={{
                    animation: `slideUp 0.5s ease-out ${index * 0.1}s both`
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`h-12 w-12 bg-gradient-to-br ${getIconBgColor(activity.type)} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <p className="text-base font-bold text-gray-900 truncate">
                          {activity.karyawan_nama}
                        </p>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm ${getActivityColor(activity.type)} shadow-sm`}>
                          {getActivityLabel(activity.type)}
                        </span>
                      </div>
                      {activity.keterangan && (
                        <p className="text-sm text-gray-600 truncate font-medium">
                          {activity.keterangan}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-700">{activity.waktu}</p>
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mt-1 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default RecentActivities;
