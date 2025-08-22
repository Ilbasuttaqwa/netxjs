import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { getBonEligibilityStatus, calculateMaxBonAmount, calculateRecommendedInstallmentPeriod, defaultBonRules, EmployeeData, ExistingBon } from '../../../lib/bon-rules';

// Mock data - in real app, this would come from database
const mockEmployees: EmployeeData[] = [
  {
    id: 1,
    gaji_pokok: 5000000,
    tanggal_masuk: '2023-01-15',
    status: 'active'
  },
  {
    id: 2,
    gaji_pokok: 7000000,
    tanggal_masuk: '2022-06-10',
    status: 'active'
  },
  {
    id: 3,
    gaji_pokok: 4000000,
    tanggal_masuk: '2024-01-01',
    status: 'active'
  }
];

const mockBon = [
  {
    id: 1,
    karyawan_id: 1,
    jumlah_bon: 5000000,
    sisa_bon: 3000000,
    cicilan_per_bulan: 500000,
    tanggal_pengajuan: '2024-01-15',
    tanggal_persetujuan: '2024-01-16',
    status: 'approved',
    keterangan: 'Bon untuk keperluan mendesak',
    approved_by: 1,
    created_at: '2024-01-15T00:00:00.000Z',
    updated_at: '2024-01-16T00:00:00.000Z'
  }
];

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        success: false,
        message: `Method ${req.method} tidak diizinkan`
      });
    }

    const { karyawan_id, amount } = req.query;
    
    if (!karyawan_id) {
      return res.status(400).json({
        success: false,
        message: 'Karyawan ID harus diisi'
      });
    }
    
    // Find employee data
    const employeeData = mockEmployees.find(emp => emp.id === parseInt(karyawan_id.toString()));
    
    if (!employeeData) {
      return res.status(404).json({
        success: false,
        message: 'Data karyawan tidak ditemukan'
      });
    }
    
    // Convert existing bons to the format expected by validation
    const existingBons: ExistingBon[] = mockBon.map(bon => ({
      id: bon.id,
      karyawan_id: bon.karyawan_id,
      jumlah_bon: bon.jumlah_bon,
      sisa_bon: bon.sisa_bon,
      cicilan_per_bulan: bon.cicilan_per_bulan,
      status: bon.status,
      tanggal_pengajuan: bon.tanggal_pengajuan,
      tanggal_persetujuan: bon.tanggal_persetujuan
    }));
    
    // Get eligibility status
    const eligibilityStatus = getBonEligibilityStatus(
      employeeData,
      existingBons,
      defaultBonRules
    );
    
    // Calculate additional information
    const maxBonAmount = calculateMaxBonAmount(
      employeeData,
      existingBons,
      defaultBonRules
    );
    
    let recommendedPeriod = 0;
    let monthlyInstallment = 0;
    
    if (amount) {
      const requestedAmount = parseInt(amount.toString());
      recommendedPeriod = calculateRecommendedInstallmentPeriod(
        requestedAmount,
        employeeData.gaji_pokok,
        defaultBonRules
      );
      monthlyInstallment = Math.ceil(requestedAmount / recommendedPeriod);
    }
    
    // Calculate current installment burden
    const activeBons = existingBons.filter(bon => 
      bon.karyawan_id === employeeData.id && 
      ['pending', 'approved'].includes(bon.status) &&
      bon.sisa_bon > 0
    );
    
    const currentInstallmentBurden = activeBons.reduce((total, bon) => total + bon.cicilan_per_bulan, 0);
    const maxInstallmentCapacity = (employeeData.gaji_pokok * defaultBonRules.maxInstallmentPercentage) / 100;
    const availableInstallmentCapacity = maxInstallmentCapacity - currentInstallmentBurden;
    
    return res.status(200).json({
      success: true,
      message: 'Data kelayakan bon berhasil diambil',
      data: {
        employee: {
          id: employeeData.id,
          gaji_pokok: employeeData.gaji_pokok,
          tanggal_masuk: employeeData.tanggal_masuk,
          status: employeeData.status
        },
        eligibility: {
          isEligible: eligibilityStatus.isEligible,
          reasons: eligibilityStatus.reasons,
          maxAmount: maxBonAmount,
          recommendedPeriod: eligibilityStatus.recommendedPeriod
        },
        capacity: {
          maxInstallmentCapacity,
          currentInstallmentBurden,
          availableInstallmentCapacity,
          activeBonsCount: activeBons.length,
          maxActiveBons: defaultBonRules.maxActiveBonPerEmployee
        },
        calculation: amount ? {
          requestedAmount: parseInt(amount.toString()),
          recommendedPeriod,
          monthlyInstallment,
          totalInstallmentBurden: currentInstallmentBurden + monthlyInstallment,
          installmentPercentage: Math.round(((currentInstallmentBurden + monthlyInstallment) / employeeData.gaji_pokok) * 100)
        } : null,
        rules: {
          maxBonPercentage: defaultBonRules.maxBonPercentage,
          maxBonAmount: defaultBonRules.maxBonAmount,
          minInstallmentPeriod: defaultBonRules.minInstallmentPeriod,
          maxInstallmentPeriod: defaultBonRules.maxInstallmentPeriod,
          maxActiveBonPerEmployee: defaultBonRules.maxActiveBonPerEmployee,
          minEmploymentDuration: defaultBonRules.minEmploymentDuration,
          maxInstallmentPercentage: defaultBonRules.maxInstallmentPercentage,
          minTimeBetweenApplications: defaultBonRules.minTimeBetweenApplications
        }
      }
    });
    
  } catch (error) {
    console.error('Error in bon eligibility API:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default withAdminAuth(handler);