import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { dashboardApi } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AttendanceData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}

const AttendanceChart: React.FC = () => {
  const [chartData, setChartData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7days');
  const { addToast } = useToast();

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const response = await dashboardApi.getAttendanceChart(period);
      if (response.success && response.data) {
        setChartData(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal memuat data chart',
      });
    } finally {
      setLoading(false);
    }
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
      },
    },
    hover: {
      mode: 'nearest',
      intersect: true,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Tanggal',
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Jumlah',
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
      },
    },
  };

  const defaultData: AttendanceData = {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    datasets: [
      {
        label: 'Hadir',
        data: [65, 59, 80, 81, 56, 55, 40],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Terlambat',
        data: [28, 48, 40, 19, 86, 27, 90],
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Alpha',
        data: [12, 19, 3, 5, 2, 3, 20],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Grafik Kehadiran</h3>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="7days">7 Hari Terakhir</option>
          <option value="30days">30 Hari Terakhir</option>
          <option value="3months">3 Bulan Terakhir</option>
        </select>
      </div>
      
      <div className="h-80">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="loading-spinner w-8 h-8"></div>
          </div>
        ) : (
          <Line data={chartData || defaultData} options={options} />
        )}
      </div>
    </div>
  );
};

export default AttendanceChart;
