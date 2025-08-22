import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { useToast } from '../../contexts/ToastContext';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import {
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';

interface PayrollRule {
  id: number;
  name: string;
  type: 'deduction' | 'allowance';
  category: 'attendance' | 'performance' | 'fixed' | 'overtime';
  calculation_method: 'fixed_amount' | 'percentage' | 'per_minute' | 'per_occurrence';
  amount: number;
  conditions: {
    min_threshold?: number;
    max_threshold?: number;
    applies_to?: string[];
  };
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SalaryComponent {
  id: number;
  name: string;
  type: 'basic' | 'allowance' | 'deduction';
  amount: number;
  is_taxable: boolean;
  is_active: boolean;
}

interface PayrollSettings {
  id: number;
  working_days_per_month: number;
  working_hours_per_day: number;
  overtime_multiplier: number;
  late_tolerance_minutes: number;
  early_leave_tolerance_minutes: number;
  minimum_working_hours: number;
  tax_percentage: number;
  updated_at: string;
}

const PayrollRulesPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'rules' | 'components' | 'settings'>('rules');
  const [rules, setRules] = useState<PayrollRule[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [editingRule, setEditingRule] = useState<PayrollRule | null>(null);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'deduction' | 'allowance'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'attendance' | 'performance' | 'fixed' | 'overtime'>('all');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      fetchData();
    }
  }, [isAuthenticated, user, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'rules') {
        const response = await fetch('/api/payroll/rules');
        const data = await response.json();
        if (data.success) {
          setRules(data.data);
        }
      } else if (activeTab === 'components') {
        const response = await fetch('/api/payroll/rules?type=components');
        const data = await response.json();
        if (data.success) {
          setComponents(data.data);
        }
      } else if (activeTab === 'settings') {
        const response = await fetch('/api/payroll/rules?type=settings');
        const data = await response.json();
        if (data.success) {
          setSettings(data.data);
        }
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal memuat data',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async (formData: any) => {
    try {
      const url = editingRule 
        ? `/api/payroll/rules?type=rule&id=${editingRule.id}`
        : '/api/payroll/rules?type=rule';
      
      const method = editingRule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: data.message,
        });
        setShowRuleModal(false);
        setEditingRule(null);
        fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal menyimpan aturan',
      });
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus aturan ini?')) return;
    
    try {
      const response = await fetch(`/api/payroll/rules?type=rule&id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: data.message,
        });
        fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal menghapus aturan',
      });
    }
  };

  const handleSaveSettings = async (formData: any) => {
    try {
      const response = await fetch('/api/payroll/rules?type=settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Berhasil',
          message: data.message,
        });
        fetchData();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Gagal menyimpan pengaturan',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deduction':
        return <ExclamationTriangleIcon className="h-5 w-5 text-danger-500" />;
      case 'allowance':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      default:
        return <CurrencyDollarIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      attendance: 'bg-blue-100 text-blue-800',
      performance: 'bg-green-100 text-green-800',
      fixed: 'bg-gray-100 text-gray-800',
      overtime: 'bg-purple-100 text-purple-800',
    };
    
    return (
      <span className={cn('px-2 py-1 text-xs font-medium rounded-full', colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800')}>
        {category}
      </span>
    );
  };

  const filteredRules = rules.filter(rule => {
    if (filterType !== 'all' && rule.type !== filterType) return false;
    if (filterCategory !== 'all' && rule.category !== filterCategory) return false;
    return true;
  });

  if (isLoading || !isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Aturan Payroll - AFMS</title>
        <meta name="description" content="Kelola aturan perhitungan gaji dan komponen payroll" />
      </Head>
      
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Aturan Payroll
                </h1>
                <p className="text-gray-600 mt-1">
                  Kelola aturan perhitungan gaji, komponen payroll, dan pengaturan sistem
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white shadow-sm rounded-lg">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {[
                  { id: 'rules', name: 'Aturan Payroll', icon: CurrencyDollarIcon },
                  { id: 'components', name: 'Komponen Gaji', icon: ClockIcon },
                  { id: 'settings', name: 'Pengaturan', icon: CogIcon },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm',
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {/* Rules Tab */}
              {activeTab === 'rules' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="all">Semua Tipe</option>
                        <option value="deduction">Potongan</option>
                        <option value="allowance">Tunjangan</option>
                      </select>
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as any)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="all">Semua Kategori</option>
                        <option value="attendance">Kehadiran</option>
                        <option value="performance">Kinerja</option>
                        <option value="fixed">Tetap</option>
                        <option value="overtime">Lembur</option>
                      </select>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingRule(null);
                        setShowRuleModal(true);
                      }}
                      leftIcon={<PlusIcon className="h-4 w-4" />}
                    >
                      Tambah Aturan
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRules.map((rule) => (
                      <div key={rule.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            {getTypeIcon(rule.type)}
                            <div>
                              <h3 className="font-medium text-gray-900">{rule.name}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                {getCategoryBadge(rule.category)}
                                <span className={cn(
                                  'px-2 py-1 text-xs font-medium rounded-full',
                                  rule.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                )}>
                                  {rule.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setEditingRule(rule);
                                setShowRuleModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">{rule.description}</p>
                          <div className="mt-2">
                            <span className="text-lg font-bold text-gray-900">
                              {rule.calculation_method === 'percentage' ? `${rule.amount}%` : formatCurrency(rule.amount)}
                            </span>
                            <span className="text-sm text-gray-500 ml-1">
                              {rule.calculation_method === 'per_minute' && '/ menit'}
                              {rule.calculation_method === 'per_occurrence' && '/ kejadian'}
                            </span>
                          </div>
                          {rule.conditions.min_threshold && (
                            <p className="text-xs text-gray-500 mt-1">
                              Min: {rule.conditions.min_threshold}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Components Tab */}
              {activeTab === 'components' && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setEditingComponent(null);
                        setShowComponentModal(true);
                      }}
                      leftIcon={<PlusIcon className="h-4 w-4" />}
                    >
                      Tambah Komponen
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nama
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipe
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jumlah
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Kena Pajak
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {components.map((component) => (
                          <tr key={component.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {component.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full',
                                component.type === 'basic' ? 'bg-blue-100 text-blue-800' :
                                component.type === 'allowance' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              )}>
                                {component.type === 'basic' ? 'Pokok' :
                                 component.type === 'allowance' ? 'Tunjangan' : 'Potongan'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {component.amount === 0 ? 'Variabel' : 
                               component.type === 'deduction' && component.amount < 10 ? `${component.amount}%` :
                               formatCurrency(component.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full',
                                component.is_taxable ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                              )}>
                                {component.is_taxable ? 'Ya' : 'Tidak'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full',
                                component.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              )}>
                                {component.is_active ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingComponent(component);
                                    setShowComponentModal(true);
                                  }}
                                  className="text-primary-600 hover:text-primary-900"
                                >
                                  Ubah
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && settings && (
                <div className="space-y-6">
                  <SettingsForm settings={settings} onSave={handleSaveSettings} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rule Modal */}
        {showRuleModal && (
          <RuleModal
            rule={editingRule}
            onSave={handleSaveRule}
            onClose={() => {
              setShowRuleModal(false);
              setEditingRule(null);
            }}
          />
        )}

        {/* Component Modal */}
        {showComponentModal && (
          <ComponentModal
            component={editingComponent}
            onSave={(data) => {
              // Handle component save
              setShowComponentModal(false);
              setEditingComponent(null);
            }}
            onClose={() => {
              setShowComponentModal(false);
              setEditingComponent(null);
            }}
          />
        )}
      </DashboardLayout>
    </>
  );
};

// Rule Modal Component
const RuleModal: React.FC<{
  rule: PayrollRule | null;
  onSave: (data: any) => void;
  onClose: () => void;
}> = ({ rule, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    type: rule?.type || 'deduction',
    category: rule?.category || 'attendance',
    calculation_method: rule?.calculation_method || 'fixed_amount',
    amount: rule?.amount || 0,
    min_threshold: rule?.conditions.min_threshold || '',
    max_threshold: rule?.conditions.max_threshold || '',
    description: rule?.description || '',
    is_active: rule?.is_active !== undefined ? rule.is_active : true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const conditions: any = {};
    if (formData.min_threshold) conditions.min_threshold = Number(formData.min_threshold);
    if (formData.max_threshold) conditions.max_threshold = Number(formData.max_threshold);
    
    onSave({
      ...formData,
      amount: Number(formData.amount),
      conditions,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={rule ? 'Edit Aturan' : 'Tambah Aturan'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama Aturan"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="form-select-modern"
              required
            >
              <option value="deduction">Potongan</option>
              <option value="allowance">Tunjangan</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="attendance">Kehadiran</option>
              <option value="performance">Kinerja</option>
              <option value="fixed">Tetap</option>
              <option value="overtime">Lembur</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metode Perhitungan
            </label>
            <select
              value={formData.calculation_method}
              onChange={(e) => setFormData({ ...formData, calculation_method: e.target.value as any })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="fixed_amount">Jumlah Tetap</option>
              <option value="percentage">Persentase</option>
              <option value="per_minute">Per Menit</option>
              <option value="per_occurrence">Per Kejadian</option>
            </select>
          </div>
          
          <Input
            label="Jumlah"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Batas Minimum (opsional)"
            type="number"
            value={formData.min_threshold}
            onChange={(e) => setFormData({ ...formData, min_threshold: e.target.value })}
          />
          
          <Input
            label="Batas Maksimum (opsional)"
            type="number"
            value={formData.max_threshold}
            onChange={(e) => setFormData({ ...formData, max_threshold: e.target.value })}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deskripsi
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="form-textarea-modern"
            rows={3}
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            Aktif
          </label>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit">
            {rule ? 'Perbarui' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Component Modal Component
const ComponentModal: React.FC<{
  component: SalaryComponent | null;
  onSave: (data: any) => void;
  onClose: () => void;
}> = ({ component, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: component?.name || '',
    type: component?.type || 'allowance',
    amount: component?.amount || 0,
    is_taxable: component?.is_taxable !== undefined ? component.is_taxable : true,
    is_active: component?.is_active !== undefined ? component.is_active : true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      amount: Number(formData.amount),
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={component ? 'Edit Komponen' : 'Tambah Komponen'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nama Komponen"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            >
              <option value="basic">Gaji Pokok</option>
              <option value="allowance">Tunjangan</option>
              <option value="deduction">Potongan</option>
            </select>
          </div>
          
          <Input
            label="Jumlah"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            required
          />
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_taxable"
              checked={formData.is_taxable}
              onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_taxable" className="text-sm text-gray-700">
              Kena Pajak
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="comp_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="comp_is_active" className="text-sm text-gray-700">
              Aktif
            </label>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit">
            {component ? 'Perbarui' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Settings Form Component
const SettingsForm: React.FC<{
  settings: PayrollSettings;
  onSave: (data: any) => void;
}> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState({
    working_days_per_month: settings.working_days_per_month,
    working_hours_per_day: settings.working_hours_per_day,
    overtime_multiplier: settings.overtime_multiplier,
    late_tolerance_minutes: settings.late_tolerance_minutes,
    early_leave_tolerance_minutes: settings.early_leave_tolerance_minutes,
    minimum_working_hours: settings.minimum_working_hours,
    tax_percentage: settings.tax_percentage,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Hari Kerja per Bulan"
          type="number"
          value={formData.working_days_per_month}
          onChange={(e) => setFormData({ ...formData, working_days_per_month: Number(e.target.value) })}
          required
        />
        
        <Input
          label="Jam Kerja per Hari"
          type="number"
          value={formData.working_hours_per_day}
          onChange={(e) => setFormData({ ...formData, working_hours_per_day: Number(e.target.value) })}
          required
        />
        
        <Input
          label="Multiplier Lembur"
          type="number"
          step="0.1"
          value={formData.overtime_multiplier}
          onChange={(e) => setFormData({ ...formData, overtime_multiplier: Number(e.target.value) })}
          required
        />
        
        <Input
          label="Toleransi Keterlambatan (menit)"
          type="number"
          value={formData.late_tolerance_minutes}
          onChange={(e) => setFormData({ ...formData, late_tolerance_minutes: Number(e.target.value) })}
          required
        />
        
        <Input
          label="Toleransi Pulang Cepat (menit)"
          type="number"
          value={formData.early_leave_tolerance_minutes}
          onChange={(e) => setFormData({ ...formData, early_leave_tolerance_minutes: Number(e.target.value) })}
          required
        />
        
        <Input
          label="Minimum Jam Kerja"
          type="number"
          value={formData.minimum_working_hours}
          onChange={(e) => setFormData({ ...formData, minimum_working_hours: Number(e.target.value) })}
          required
        />
        
        <Input
          label="Persentase Pajak (%)"
          type="number"
          value={formData.tax_percentage}
          onChange={(e) => setFormData({ ...formData, tax_percentage: Number(e.target.value) })}
          required
        />
      </div>
      
      <div className="flex justify-end">
        <Button type="submit">
          Simpan Pengaturan
        </Button>
      </div>
    </form>
  );
};

export default PayrollRulesPage;