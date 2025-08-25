import { NextApiRequest, NextApiResponse } from 'next';
import { ApiResponse } from '../../../types/index';

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

// Mock data untuk aturan payroll
const mockPayrollRules: PayrollRule[] = [
  {
    id: 1,
    name: 'Potongan Keterlambatan',
    type: 'deduction',
    category: 'attendance',
    calculation_method: 'per_minute',
    amount: 1000,
    conditions: {
      min_threshold: 15,
    },
    description: 'Potongan Rp 1.000 per menit untuk keterlambatan lebih dari 15 menit',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Potongan Alpha',
    type: 'deduction',
    category: 'attendance',
    calculation_method: 'per_occurrence',
    amount: 50000,
    conditions: {},
    description: 'Potongan Rp 50.000 per hari alpha',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Potongan Pulang Cepat',
    type: 'deduction',
    category: 'attendance',
    calculation_method: 'per_minute',
    amount: 500,
    conditions: {
      min_threshold: 30,
    },
    description: 'Potongan Rp 500 per menit untuk pulang lebih dari 30 menit sebelum jam kerja',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'Tunjangan Kehadiran',
    type: 'allowance',
    category: 'attendance',
    calculation_method: 'fixed_amount',
    amount: 100000,
    conditions: {
      min_threshold: 22, // minimal 22 hari hadir
    },
    description: 'Tunjangan kehadiran Rp 100.000 untuk minimal 22 hari hadir',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 5,
    name: 'Tunjangan Lembur',
    type: 'allowance',
    category: 'overtime',
    calculation_method: 'per_minute',
    amount: 2000,
    conditions: {},
    description: 'Tunjangan lembur Rp 2.000 per menit',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockSalaryComponents: SalaryComponent[] = [
  {
    id: 1,
    name: 'Gaji Pokok',
    type: 'basic',
    amount: 0, // varies by employee
    is_taxable: true,
    is_active: true,
  },
  {
    id: 2,
    name: 'Tunjangan Transport',
    type: 'allowance',
    amount: 300000,
    is_taxable: true,
    is_active: true,
  },
  {
    id: 3,
    name: 'Tunjangan Makan',
    type: 'allowance',
    amount: 400000,
    is_taxable: true,
    is_active: true,
  },
  {
    id: 4,
    name: 'BPJS Kesehatan',
    type: 'deduction',
    amount: 1, // 1% dari gaji pokok
    is_taxable: false,
    is_active: true,
  },
  {
    id: 5,
    name: 'BPJS Ketenagakerjaan',
    type: 'deduction',
    amount: 2, // 2% dari gaji pokok
    is_taxable: false,
    is_active: true,
  },
];

const mockPayrollSettings: PayrollSettings = {
  id: 1,
  working_days_per_month: 22,
  working_hours_per_day: 8,
  overtime_multiplier: 1.5,
  late_tolerance_minutes: 15,
  early_leave_tolerance_minutes: 30,
  minimum_working_hours: 7,
  tax_percentage: 5,
  updated_at: '2024-01-01T00:00:00Z',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      case 'PUT':
        return handlePut(req, res);
      case 'DELETE':
        return handleDelete(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error: any) {
    console.error('Payroll rules API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  const { type, category } = req.query;

  if (type === 'settings') {
    return res.status(200).json({
      success: true,
      data: mockPayrollSettings,
      message: 'Payroll settings retrieved successfully',
    });
  }

  if (type === 'components') {
    let components = mockSalaryComponents;
    
    if (category) {
      components = components.filter(comp => comp.type === category);
    }

    return res.status(200).json({
      success: true,
      data: components,
      message: 'Salary components retrieved successfully',
    });
  }

  // Default: return payroll rules
  let rules = mockPayrollRules;
  
  if (type && type !== 'all') {
    rules = rules.filter(rule => rule.type === type);
  }
  
  if (category && category !== 'all') {
    rules = rules.filter(rule => rule.category === category);
  }

  return res.status(200).json({
    success: true,
    data: rules,
    message: 'Payroll rules retrieved successfully',
  });
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  const { type } = req.query;
  
  if (type === 'rule') {
    const {
      name,
      type: ruleType,
      category,
      calculation_method,
      amount,
      conditions,
      description,
    } = req.body;

    // Validation
    if (!name || !ruleType || !category || !calculation_method || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const newRule: PayrollRule = {
      id: mockPayrollRules.length + 1,
      name,
      type: ruleType,
      category,
      calculation_method,
      amount,
      conditions: conditions || {},
      description: description || '',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockPayrollRules.push(newRule);

    return res.status(201).json({
      success: true,
      data: newRule,
      message: 'Payroll rule created successfully',
    });
  }

  if (type === 'component') {
    const { name, type: compType, amount, is_taxable } = req.body;

    if (!name || !compType || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const newComponent: SalaryComponent = {
      id: mockSalaryComponents.length + 1,
      name,
      type: compType,
      amount,
      is_taxable: is_taxable !== undefined ? is_taxable : true,
      is_active: true,
    };

    mockSalaryComponents.push(newComponent);

    return res.status(201).json({
      success: true,
      data: newComponent,
      message: 'Salary component created successfully',
    });
  }

  return res.status(400).json({
    success: false,
    message: 'Invalid request type',
  });
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  const { type, id } = req.query;
  
  if (type === 'settings') {
    const {
      working_days_per_month,
      working_hours_per_day,
      overtime_multiplier,
      late_tolerance_minutes,
      early_leave_tolerance_minutes,
      minimum_working_hours,
      tax_percentage,
    } = req.body;

    // Update settings
    Object.assign(mockPayrollSettings, {
      working_days_per_month: working_days_per_month || mockPayrollSettings.working_days_per_month,
      working_hours_per_day: working_hours_per_day || mockPayrollSettings.working_hours_per_day,
      overtime_multiplier: overtime_multiplier || mockPayrollSettings.overtime_multiplier,
      late_tolerance_minutes: late_tolerance_minutes || mockPayrollSettings.late_tolerance_minutes,
      early_leave_tolerance_minutes: early_leave_tolerance_minutes || mockPayrollSettings.early_leave_tolerance_minutes,
      minimum_working_hours: minimum_working_hours || mockPayrollSettings.minimum_working_hours,
      tax_percentage: tax_percentage || mockPayrollSettings.tax_percentage,
      updated_at: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      data: mockPayrollSettings,
      message: 'Payroll settings updated successfully',
    });
  }

  if (type === 'rule') {
    const ruleId = parseInt(id as string);
    const ruleIndex = mockPayrollRules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Payroll rule not found',
      });
    }

    const updatedRule = {
      ...mockPayrollRules[ruleIndex],
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    mockPayrollRules[ruleIndex] = updatedRule;

    return res.status(200).json({
      success: true,
      data: updatedRule,
      message: 'Payroll rule updated successfully',
    });
  }

  if (type === 'component') {
    const componentId = parseInt(id as string);
    const componentIndex = mockSalaryComponents.findIndex(comp => comp.id === componentId);
    
    if (componentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Salary component not found',
      });
    }

    const updatedComponent = {
      ...mockSalaryComponents[componentIndex],
      ...req.body,
    };

    mockSalaryComponents[componentIndex] = updatedComponent;

    return res.status(200).json({
      success: true,
      data: updatedComponent,
      message: 'Salary component updated successfully',
    });
  }

  return res.status(400).json({
    success: false,
    message: 'Invalid request type',
  });
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  const { type, id } = req.query;
  
  if (type === 'rule') {
    const ruleId = parseInt(id as string);
    const ruleIndex = mockPayrollRules.findIndex(rule => rule.id === ruleId);
    
    if (ruleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Payroll rule not found',
      });
    }

    const deletedRule = mockPayrollRules.splice(ruleIndex, 1)[0];

    return res.status(200).json({
      success: true,
      data: deletedRule,
      message: 'Payroll rule deleted successfully',
    });
  }

  if (type === 'component') {
    const componentId = parseInt(id as string);
    const componentIndex = mockSalaryComponents.findIndex(comp => comp.id === componentId);
    
    if (componentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Salary component not found',
      });
    }

    const deletedComponent = mockSalaryComponents.splice(componentIndex, 1)[0];

    return res.status(200).json({
      success: true,
      data: deletedComponent,
      message: 'Salary component deleted successfully',
    });
  }

  return res.status(400).json({
    success: false,
    message: 'Invalid request type',
  });
}