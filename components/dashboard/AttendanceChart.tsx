import React, { useEffect, useState } from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardApi } from '../../lib/api';

interface ChartData {
  label: string;
  value: number;
}

const AttendanceChart: React.FC = () => {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        // Mock data for now - replace with actual API call
        const mockData: ChartData[] = [
          { label: 'Sen', value: 85 },
          { label: 'Sel', value: 92 },
          { label: 'Rab', value: 78 },
          { label: 'Kam', value: 88 },
          { label: 'Jum', value: 95 },
          { label: 'Sab', value: 82 },
          { label: 'Min', value: 90 },
        ];
        setChartData(mockData);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Grafik Kehadiran</h2>
          <ChartBarIcon className="h-6 w-6 text-gray-400" />
        </div>
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(item => item.value));

  return (
    <div className="card-glass bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg rounded-xl p-6 hover-lift transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-glow">
            <ChartBarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Grafik Kehadiran</h2>
            <p className="text-sm text-gray-600">Persentase kehadiran mingguan</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {chartData.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const getBarColor = (value: number) => {
            if (value >= 90) return 'from-emerald-500 to-green-600';
            if (value >= 75) return 'from-blue-500 to-indigo-600';
            if (value >= 60) return 'from-yellow-500 to-orange-600';
            return 'from-red-500 to-pink-600';
          };
          
          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600">Hari {item.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-900">{item.value}%</span>
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getBarColor(item.value)}`}></div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div 
                    className={`h-4 rounded-full bg-gradient-to-r ${getBarColor(item.value)} transition-all duration-700 ease-out shadow-sm group-hover:shadow-md`}
                    style={{ 
                      width: `${percentage}%`,
                      animation: `slideRight 0.8s ease-out ${index * 0.1}s both`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200/50">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Rata-rata minggu ini</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-gradient-blue">
                {Math.round(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;