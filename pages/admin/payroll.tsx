import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useToast } from '../../contexts/ToastContext';
import TataLetakDasbor from '../../components/layouts/TataLetakDasbor';
import { Button } from '../../components/ui/button';
import {
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { payrollApi } from '../../lib/api';

interface EmployeeAttendance {
  karyawan_id: number;
  name: string;
  jabatan: string;
  basic_salary: number;
  attendance_summary: {
    total_days: number;
    present_days: number;
    late_count: number;
    absent_count: number;
    early_leave_count: number;
    total_late_minutes: number;
    total_early_leave_minutes: number;
  };
  deductions: PayrollDeduction[];
  total_deduction: number;
  net_salary: number;
}

interface PayrollDeduction {
  id: number;
  karyawan_id: number;
  period: string;
  rule_id: number;
  rule_name: string;
  violation_count: number;
  total_minutes?: number;
  deduction_amount: number;
  description: string;
  created_at: string;
}

const PayrollPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [employees, setEmployees] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeAttendance | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && !['admin', 'manager'].includes(user?.role || '')) {
      router.push('/dasbor');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && ['admin', 'manager'].includes(user?.role || '')) {
      fetchPayrollData();
    }
  }, [isAuthenticated, user, selectedPeriod]);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getDeductions(selectedPeriod);
      
      if (response.success) {
        setEmployees(response.data || []);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
          type: 'error',
          title: 'Kesalahan',
          message: error.message || 'Gagal memuat data payroll',
        });
    } finally {
      setLoading(false);
    }
  };

  const processPayroll = async () => {
    try {
      setProcessing(true);
      const response = await payrollApi.processDeductions(selectedPeriod);
      
      if (response.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: response.message,
        });
        fetchPayrollData();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      addToast({
          type: 'error',
          title: 'Kesalahan',
          message: error.message || 'Gagal memproses payroll',
        });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getTotalStats = () => {
    return {
      totalEmployees: employees.length,
      employeesWithDeductions: employees.filter(emp => emp.total_deduction > 0).length,
      totalDeductions: employees.reduce((sum, emp) => sum + emp.total_deduction, 0),
      totalNetSalary: employees.reduce((sum, emp) => sum + emp.net_salary, 0),
    };
  };

  const stats = getTotalStats();

  if (isLoading || !isAuthenticated || !['admin', 'manager'].includes(user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Payroll & Pemotongan Gaji - AFMS</title>
        <meta name="description" content="Sistem payroll dan pemotongan gaji otomatis" />
      </Head>
      
      <TataLetakDasbor>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Payroll & Pemotongan Gaji
                </h1>
                <p className="text-gray-600 mt-1">
                  Sistem pemotongan gaji otomatis berdasarkan aturan absensi
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const date = new Date();
                      date.setMonth(date.getMonth() - i);
                      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      return (
                        <option key={period} value={period}>
                          {formatPeriod(period)}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <Button
                  onClick={processPayroll}
                  loading={processing}
                  leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}
                >
                  Proses Payroll
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-primary-500 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Karyawan</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-warning-500 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Dengan Potongan</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.employeesWithDeductions}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-danger-500 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Potongan</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalDeductions)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 bg-success-500 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Gaji Bersih</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(stats.totalNetSalary)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Employee List */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Daftar Karyawan - {formatPeriod(selectedPeriod)}
              </h3>
            </div>
            
            {loading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-8 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {employees.map((employee) => (
                  <div key={employee.karyawan_id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          'h-12 w-12 rounded-lg flex items-center justify-center',
                          employee.total_deduction > 0 ? 'bg-warning-100' : 'bg-success-100'
                        )}>
                          <UserGroupIcon className={cn(
                            'h-6 w-6',
                            employee.total_deduction > 0 ? 'text-warning-600' : 'text-success-600'
                          )} />
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            {employee.name}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              {employee.jabatan}
                            </span>
                            <span className="text-sm text-gray-500">
                              Gaji Pokok: {formatCurrency(employee.basic_salary)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Potongan</p>
                          <p className={cn(
                            'text-lg font-bold',
                            employee.total_deduction > 0 ? 'text-danger-600' : 'text-gray-900'
                          )}>
                            {formatCurrency(employee.total_deduction)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Gaji Bersih</p>
                          <p className="text-lg font-bold text-success-600">
                            {formatCurrency(employee.net_salary)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setShowDetails(true);
                          }}
                          leftIcon={<DocumentTextIcon className="h-4 w-4" />}
                        >
                          Detail
                        </Button>
                      </div>
                    </div>
                    
                    {/* Attendance Summary */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Hadir</p>
                        <p className="text-lg font-semibold text-success-600">
                          {employee.attendance_summary.present_days}/{employee.attendance_summary.total_days}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Terlambat</p>
                        <p className="text-lg font-semibold text-warning-600">
                          {employee.attendance_summary.late_count}x
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Alpha</p>
                        <p className="text-lg font-semibold text-danger-600">
                          {employee.attendance_summary.absent_count}x
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Pulang Cepat</p>
                        <p className="text-lg font-semibold text-warning-600">
                          {employee.attendance_summary.early_leave_count}x
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Total Potongan</p>
                        <p className="text-lg font-semibold text-danger-600">
                          {employee.deductions.length} item
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Modal */}
        {showDetails && selectedEmployee && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Detail Pemotongan Gaji - {selectedEmployee.name}
                  </h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-4">
                  {selectedEmployee.deductions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Tidak ada pemotongan gaji untuk periode ini
                    </p>
                  ) : (
                    selectedEmployee.deductions.map((deduction) => (
                      <div key={deduction.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{deduction.rule_name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{deduction.description}</p>
                            {deduction.total_minutes && (
                              <p className="text-xs text-gray-500 mt-1">
                                Total: {deduction.total_minutes} menit
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-danger-600">
                              -{formatCurrency(deduction.deduction_amount)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {deduction.violation_count}x pelanggaran
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Potongan:</span>
                    <span className="text-xl font-bold text-danger-600">
                      {formatCurrency(selectedEmployee.total_deduction)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-lg font-medium text-gray-900">Gaji Bersih:</span>
                    <span className="text-xl font-bold text-success-600">
                      {formatCurrency(selectedEmployee.net_salary)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </TataLetakDasbor>
    </>
  );
};

export default PayrollPage;