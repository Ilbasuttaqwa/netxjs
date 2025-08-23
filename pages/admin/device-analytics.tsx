import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { deviceApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/cn';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  ClockIcon,
  ComputerDesktopIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CpuChipIcon,
  ThermometerIcon,
  BatteryIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AnalyticsData {
  uptime: {
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    error_devices: number;
    uptime_percentage: number;
    trends: {
      date: string;
      uptime: number;
      online: number;
      offline: number;
    }[];
  };
  sync: {
    total_syncs: number;
    successful_syncs: number;
    failed_syncs: number;
    success_rate: number;
    trends: {
      date: string;
      successful: number;
      failed: number;
    }[];
  };
  hardware: {
    avg_temperature: number;
    avg_memory_usage: number;
    avg_battery_level: number;
    devices_with_issues: number;
    trends: {
      date: string;
      temperature: number;
      memory: number;
      battery: number;
    }[];
  };
  performance: {
    response_time: number;
    throughput: number;
    error_rate: number;
    trends: {
      date: string;
      response_time: number;
      throughput: number;
      errors: number;
    }[];
  };
}

interface ReportConfig {
  type: 'uptime' | 'sync' | 'hardware' | 'performance' | 'comprehensive';
  date_from: string;
  date_to: string;
  device_ids?: string[];
  group_by: 'day' | 'week' | 'month';
  format: 'pdf' | 'excel' | 'csv';
}

export default function DeviceAnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    type: 'comprehensive',
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    group_by: 'day',
    format: 'pdf'
  });
  const [generatingReport, setGeneratingReport] = useState(false);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    
    if (user) {
      fetchAnalytics();
    }
  }, [user, authLoading, router, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = {
        date_range: dateRange,
        group_by: 'day'
      };
      
      const response = await deviceApi.getAnalytics(params);
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal memuat data analytics'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const response = await deviceApi.generateReport(reportConfig);
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: 'Laporan berhasil dibuat dan akan diunduh'
        });
        
        // Simulate file download
        const link = document.createElement('a');
        link.href = response.data.download_url || '#';
        link.download = `device-analytics-${reportConfig.type}-${Date.now()}.${reportConfig.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setShowReportModal(false);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal membuat laporan'
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const getStatusColor = (value: number, type: 'uptime' | 'success' | 'performance') => {
    if (type === 'uptime' || type === 'success') {
      if (value >= 95) return 'text-success-600';
      if (value >= 85) return 'text-warning-600';
      return 'text-danger-600';
    } else {
      if (value <= 100) return 'text-success-600';
      if (value <= 200) return 'text-warning-600';
      return 'text-danger-600';
    }
  };

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada data</h3>
          <p className="mt-1 text-sm text-gray-500">Data analytics tidak tersedia.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Device Analytics</h1>
              <p className="mt-2 text-gray-600">
                Analisis performa dan statistik device fingerprint
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="7d">7 Hari Terakhir</option>
                <option value="30d">30 Hari Terakhir</option>
                <option value="90d">90 Hari Terakhir</option>
                <option value="1y">1 Tahun Terakhir</option>
              </select>
              <Button
                onClick={() => setShowReportModal(true)}
                leftIcon={<DocumentArrowDownIcon className="h-5 w-5" />}
              >
                Generate Report
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-success-100 rounded-lg flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-success-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Uptime</p>
                <p className={cn('text-2xl font-bold', getStatusColor(analytics.uptime.uptime_percentage, 'uptime'))}>
                  {analytics.uptime.uptime_percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {analytics.uptime.online_devices}/{analytics.uptime.total_devices} devices online
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-primary-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sync Success Rate</p>
                <p className={cn('text-2xl font-bold', getStatusColor(analytics.sync.success_rate, 'success'))}>
                  {analytics.sync.success_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {analytics.sync.successful_syncs}/{analytics.sync.total_syncs} syncs
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-warning-100 rounded-lg flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-warning-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className={cn('text-2xl font-bold', getStatusColor(analytics.performance.response_time, 'performance'))}>
                  {analytics.performance.response_time}ms
                </p>
                <p className="text-xs text-gray-500">
                  {analytics.performance.throughput} req/min
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-danger-100 rounded-lg flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-danger-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Hardware Issues</p>
                <p className="text-2xl font-bold text-danger-600">
                  {analytics.hardware.devices_with_issues}
                </p>
                <p className="text-xs text-gray-500">
                  devices with issues
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Uptime Trend */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Uptime Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.uptime.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="online" stackId="1" stroke="#10B981" fill="#10B981" />
                <Area type="monotone" dataKey="offline" stackId="1" stroke="#EF4444" fill="#EF4444" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sync Performance */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.sync.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="successful" fill="#10B981" />
                <Bar dataKey="failed" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hardware Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Hardware Trends */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hardware Metrics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.hardware.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="temperature" stroke="#F59E0B" strokeWidth={2} />
                <Line type="monotone" dataKey="memory" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="battery" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Device Status Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Online', value: analytics.uptime.online_devices },
                    { name: 'Offline', value: analytics.uptime.offline_devices },
                    { name: 'Error', value: analytics.uptime.error_devices }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Online', value: analytics.uptime.online_devices },
                    { name: 'Offline', value: analytics.uptime.offline_devices },
                    { name: 'Error', value: analytics.uptime.error_devices }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hardware Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hardware Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <ThermometerIcon className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Avg Temperature</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.hardware.avg_temperature}°C</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <CpuChipIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Avg Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.hardware.avg_memory_usage}%</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <BatteryIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Avg Battery Level</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.hardware.avg_battery_level}%</p>
            </div>
          </div>
        </div>

        {/* Report Generation Modal */}
        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="Generate Analytics Report"
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Report Type
                </label>
                <select
                  value={reportConfig.type}
                  onChange={(e) => setReportConfig({ ...reportConfig, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="comprehensive">Comprehensive Report</option>
                  <option value="uptime">Uptime Report</option>
                  <option value="sync">Sync Performance Report</option>
                  <option value="hardware">Hardware Metrics Report</option>
                  <option value="performance">Performance Report</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format
                </label>
                <select
                  value={reportConfig.format}
                  onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date From
                </label>
                <input
                  type="date"
                  value={reportConfig.date_from}
                  onChange={(e) => setReportConfig({ ...reportConfig, date_from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date To
                </label>
                <input
                  type="date"
                  value={reportConfig.date_to}
                  onChange={(e) => setReportConfig({ ...reportConfig, date_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group By
                </label>
                <select
                  value={reportConfig.group_by}
                  onChange={(e) => setReportConfig({ ...reportConfig, group_by: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowReportModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateReport}
              loading={generatingReport}
              leftIcon={<DocumentArrowDownIcon className="h-4 w-4" />}
            >
              Generate Report
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}