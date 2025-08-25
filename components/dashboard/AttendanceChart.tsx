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
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Grafik Kehadiran</h2>
        <ChartBarIcon className="h-6 w-6 text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-8 text-sm font-medium text-gray-600">
              {item.label}
            </div>
            <div className="flex-1">
              <div className="bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="w-12 text-sm font-medium text-gray-900 text-right">
              {item.value}%
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Rata-rata minggu ini</span>
          <span className="font-medium text-gray-900">
            {Math.round(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;