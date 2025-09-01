import { NextApiRequest, NextApiResponse } from 'next';
import { requireRole } from '../../../middleware/auth';
import { ApiResponse } from '../../../types/index';

interface AttendanceRule {
  id: number;
  name: string;
  type: 'late' | 'absent' | 'early_leave';
  threshold_minutes?: number; // For late/early leave
  deduction_type: 'fixed' | 'percentage' | 'per_minute';
  deduction_amount: number;
  max_deduction?: number;
  is_active: boolean;
}

interface PayrollDeduction {
  id: number;
  karyawan_id: number;
  period: string; // YYYY-MM format
  rule_id: number;
  rule_name: string;
  violation_count: number;
  total_minutes?: number;
  deduction_amount: number;
  description: string;
  created_at: string;
}

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
  bon_deduction: number;
  total_deduction: number;
  net_salary: number;
}

// Mock data untuk aturan pemotongan gaji
const attendanceRules: AttendanceRule[] = [
  {
    id: 1,
    name: 'Keterlambatan 1-15 menit',
    type: 'late',
    threshold_minutes: 15,
    deduction_type: 'fixed',
    deduction_amount: 25000,
    is_active: true,
  },
  {
    id: 2,
    name: 'Keterlambatan 16-30 menit',
    type: 'late',
    threshold_minutes: 30,
    deduction_type: 'fixed',
    deduction_amount: 50000,
    is_active: true,
  },
  {
    id: 3,
    name: 'Keterlambatan lebih dari 30 menit',
    type: 'late',
    threshold_minutes: 999,
    deduction_type: 'per_minute',
    deduction_amount: 2000,
    max_deduction: 200000,
    is_active: true,
  },
  {
    id: 4,
    name: 'Tidak masuk kerja (Alpha)',
    type: 'absent',
    deduction_type: 'percentage',
    deduction_amount: 3.33, // 1/30 dari gaji pokok
    is_active: true,
  },
  {
    id: 5,
    name: 'Pulang lebih awal',
    type: 'early_leave',
    threshold_minutes: 30,
    deduction_type: 'per_minute',
    deduction_amount: 1500,
    max_deduction: 100000,
    is_active: true,
  },
];

// Mock data karyawan
const employees = [
  { id: 1, name: 'John Doe', jabatan: 'Manager', basic_salary: 8000000 },
  { id: 2, name: 'Jane Smith', jabatan: 'Staff', basic_salary: 5000000 },
  { id: 3, name: 'Bob Johnson', jabatan: 'Supervisor', basic_salary: 6500000 },
];

const handler = async (req: NextApiRequest, res: NextApiResponse<ApiResponse<any>>) => {
  if (req.method === 'GET') {
    const { period, karyawan_id } = req.query;
    
    if (!period) {
      return res.status(400).json({
        success: false,
        message: 'Parameter period (YYYY-MM) diperlukan',
      });
    }

    try {
      if (karyawan_id) {
        // Get deductions for specific employee
        const employeeDeductions = await calculateEmployeeDeductions(
          parseInt(karyawan_id as string),
          period as string
        );
        
        return res.status(200).json({
          success: true,
          message: 'Data pemotongan karyawan berhasil diambil',
          data: employeeDeductions,
        });
      } else {
        // Get deductions for all employees
        const allDeductions = await calculateAllEmployeesDeductions(period as string);
        
        return res.status(200).json({
          success: true,
          message: 'Data pemotongan semua karyawan berhasil diambil',
          data: allDeductions,
        });
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Gagal menghitung pemotongan gaji',
      });
    }
  }

  if (req.method === 'POST') {
    const { period } = req.body;
    
    if (!period) {
      return res.status(400).json({
        success: false,
        message: 'Parameter period diperlukan',
      });
    }

    try {
      // Process payroll deductions for the period
      const results = await processPayrollDeductions(period);
      
      return res.status(200).json({
        success: true,
        message: `Pemotongan gaji untuk periode ${period} berhasil diproses`,
        data: results,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Gagal memproses pemotongan gaji',
      });
    }
  }

  if (req.method === 'PUT') {
    const { rule_id, ...updateData } = req.body;
    
    if (!rule_id) {
      return res.status(400).json({
        success: false,
        message: 'Rule ID diperlukan',
      });
    }

    try {
      const ruleIndex = attendanceRules.findIndex(rule => rule.id === rule_id);
      
      if (ruleIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Aturan tidak ditemukan',
        });
      }

      // Update rule
      attendanceRules[ruleIndex] = { ...attendanceRules[ruleIndex], ...updateData };
      
      return res.status(200).json({
        success: true,
        message: 'Aturan berhasil diperbarui',
        data: attendanceRules[ruleIndex],
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Gagal memperbarui aturan',
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: 'Method tidak diizinkan',
  });
};

async function calculateEmployeeDeductions(
  karyawanId: number,
  period: string
): Promise<EmployeeAttendance> {
  const employee = employees.find(emp => emp.id === karyawanId);
  
  if (!employee) {
    throw new Error('Karyawan tidak ditemukan');
  }

  // Mock attendance data - in real implementation, fetch from database
  const attendanceSummary = {
    total_days: 22,
    present_days: 20,
    late_count: 5,
    absent_count: 2,
    early_leave_count: 1,
    total_late_minutes: 75, // 5 times late, average 15 minutes
    total_early_leave_minutes: 45,
  };

  const deductions: PayrollDeduction[] = [];
  let totalDeduction = 0;

  // Calculate late deductions
  if (attendanceSummary.late_count > 0) {
    const lateDeduction = calculateLateDeduction(
      attendanceSummary.late_count,
      attendanceSummary.total_late_minutes,
      employee.basic_salary
    );
    
    if (lateDeduction.amount > 0) {
      deductions.push({
        id: Date.now() + 1,
        karyawan_id: karyawanId,
        period,
        rule_id: lateDeduction.rule_id,
        rule_name: lateDeduction.rule_name,
        violation_count: attendanceSummary.late_count,
        total_minutes: attendanceSummary.total_late_minutes,
        deduction_amount: lateDeduction.amount,
        description: `Keterlambatan ${attendanceSummary.late_count} kali, total ${attendanceSummary.total_late_minutes} menit`,
        created_at: new Date().toISOString(),
      });
      totalDeduction += lateDeduction.amount;
    }
  }

  // Calculate absent deductions
  if (attendanceSummary.absent_count > 0) {
    const absentRule = attendanceRules.find(rule => rule.type === 'absent' && rule.is_active);
    if (absentRule) {
      const absentDeduction = (employee.basic_salary * absentRule.deduction_amount / 100) * attendanceSummary.absent_count;
      
      deductions.push({
        id: Date.now() + 2,
        karyawan_id: karyawanId,
        period,
        rule_id: absentRule.id,
        rule_name: absentRule.name,
        violation_count: attendanceSummary.absent_count,
        deduction_amount: absentDeduction,
        description: `Tidak masuk kerja ${attendanceSummary.absent_count} hari`,
        created_at: new Date().toISOString(),
      });
      totalDeduction += absentDeduction;
    }
  }

  // Calculate early leave deductions
  if (attendanceSummary.early_leave_count > 0) {
    const earlyLeaveRule = attendanceRules.find(rule => rule.type === 'early_leave' && rule.is_active);
    if (earlyLeaveRule) {
      let earlyLeaveDeduction = attendanceSummary.total_early_leave_minutes * earlyLeaveRule.deduction_amount;
      
      if (earlyLeaveRule.max_deduction && earlyLeaveDeduction > earlyLeaveRule.max_deduction) {
        earlyLeaveDeduction = earlyLeaveRule.max_deduction;
      }
      
      deductions.push({
        id: Date.now() + 3,
        karyawan_id: karyawanId,
        period,
        rule_id: earlyLeaveRule.id,
        rule_name: earlyLeaveRule.name,
        violation_count: attendanceSummary.early_leave_count,
        total_minutes: attendanceSummary.total_early_leave_minutes,
        deduction_amount: earlyLeaveDeduction,
        description: `Pulang cepat ${attendanceSummary.early_leave_count} kali, total ${attendanceSummary.total_early_leave_minutes} menit`,
        created_at: new Date().toISOString(),
      });
      totalDeduction += earlyLeaveDeduction;
    }
  }

  // Calculate bon deductions
  const bonDeduction = await calculateBonDeduction(karyawanId, period);
  if (bonDeduction > 0) {
    deductions.push({
      id: Date.now() + 4,
      karyawan_id: karyawanId,
      period,
      rule_id: 999, // Special rule ID for bon
      rule_name: 'Cicilan Bon Karyawan',
      violation_count: 1,
      deduction_amount: bonDeduction,
      description: `Cicilan bon bulan ${period}`,
      created_at: new Date().toISOString(),
    });
    totalDeduction += bonDeduction;
  }

  return {
    karyawan_id: karyawanId,
    name: employee.name,
    jabatan: employee.jabatan,
    basic_salary: employee.basic_salary,
    attendance_summary: attendanceSummary,
    deductions,
    bon_deduction: bonDeduction,
    total_deduction: totalDeduction,
    net_salary: employee.basic_salary - totalDeduction,
  };
}

async function calculateAllEmployeesDeductions(period: string): Promise<EmployeeAttendance[]> {
  const results: EmployeeAttendance[] = [];
  
  for (const employee of employees) {
    const employeeDeductions = await calculateEmployeeDeductions(employee.id, period);
    results.push(employeeDeductions);
  }
  
  return results;
}

function calculateLateDeduction(
  lateCount: number,
  totalLateMinutes: number,
  basicSalary: number
): { amount: number; rule_id: number; rule_name: string } {
  let totalDeduction = 0;
  let appliedRule = attendanceRules[0];
  
  // Apply progressive late deduction rules
  const avgLateMinutes = totalLateMinutes / lateCount;
  
  if (avgLateMinutes <= 15) {
    const rule = attendanceRules.find(r => r.type === 'late' && r.threshold_minutes === 15);
    if (rule) {
      totalDeduction = rule.deduction_amount * lateCount;
      appliedRule = rule;
    }
  } else if (avgLateMinutes <= 30) {
    const rule = attendanceRules.find(r => r.type === 'late' && r.threshold_minutes === 30);
    if (rule) {
      totalDeduction = rule.deduction_amount * lateCount;
      appliedRule = rule;
    }
  } else {
    const rule = attendanceRules.find(r => r.type === 'late' && r.threshold_minutes === 999);
    if (rule) {
      totalDeduction = totalLateMinutes * rule.deduction_amount;
      if (rule.max_deduction && totalDeduction > rule.max_deduction) {
        totalDeduction = rule.max_deduction;
      }
      appliedRule = rule;
    }
  }
  
  return {
    amount: totalDeduction,
    rule_id: appliedRule.id,
    rule_name: appliedRule.name,
  };
}

async function calculateBonDeduction(karyawanId: number, period: string): Promise<number> {
  try {
    // In real implementation, this would fetch from database
    // For now, we'll use mock data that simulates approved bon with active installments
    const mockActiveBon = [
      { karyawan_id: 1, cicilan_per_bulan: 500000, status: 'approved' },
      { karyawan_id: 2, cicilan_per_bulan: 300000, status: 'approved' },
    ];
    
    const employeeBon = mockActiveBon.find(bon => 
      bon.karyawan_id === karyawanId && bon.status === 'approved'
    );
    
    return employeeBon ? employeeBon.cicilan_per_bulan : 0;
  } catch (error) {
    console.error('Error calculating bon deduction:', error);
    return 0;
  }
}

async function processPayrollDeductions(period: string) {
  const allEmployees = await calculateAllEmployeesDeductions(period);
  
  // Process bon installments (mock)
  for (const employee of allEmployees) {
    if (employee.bon_deduction > 0) {
      // In real implementation, this would:
      // 1. Create bon_cicilan record
      // 2. Update bon sisa_bon amount
      // 3. Mark bon as completed if fully paid
    }
  }
  
  // In real implementation, save to database
  
  const summary = {
    period,
    total_employees: allEmployees.length,
    total_deductions: allEmployees.reduce((sum, emp) => sum + emp.total_deduction, 0),
    employees_with_deductions: allEmployees.filter(emp => emp.total_deduction > 0).length,
    processed_at: new Date().toISOString(),
  };
  
  return {
    summary,
    details: allEmployees,
  };
}

export default requireRole(['admin', 'manager'])(handler);