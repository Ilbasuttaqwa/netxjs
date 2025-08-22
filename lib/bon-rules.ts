// Business rules and validation for Bon/Advance feature

export interface BonRules {
  // Maximum bon amount based on salary percentage
  maxBonPercentage: number;
  // Maximum bon amount in absolute value
  maxBonAmount: number;
  // Minimum installment period (months)
  minInstallmentPeriod: number;
  // Maximum installment period (months)
  maxInstallmentPeriod: number;
  // Maximum number of active bons per employee
  maxActiveBonPerEmployee: number;
  // Minimum employment duration before eligible for bon (months)
  minEmploymentDuration: number;
  // Maximum installment percentage of salary
  maxInstallmentPercentage: number;
  // Minimum time between bon applications (months)
  minTimeBetweenApplications: number;
}

// Default business rules
export const defaultBonRules: BonRules = {
  maxBonPercentage: 80, // 80% of monthly salary
  maxBonAmount: 10000000, // 10 million IDR
  minInstallmentPeriod: 3, // 3 months minimum
  maxInstallmentPeriod: 24, // 24 months maximum
  maxActiveBonPerEmployee: 1, // Only 1 active bon per employee
  minEmploymentDuration: 6, // 6 months employment minimum
  maxInstallmentPercentage: 30, // 30% of salary for installments
  minTimeBetweenApplications: 1 // 1 month between applications
};

export interface BonValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EmployeeData {
  id: number;
  gaji_pokok: number;
  tanggal_masuk: string;
  status: string;
}

export interface ExistingBon {
  id: number;
  karyawan_id: number;
  jumlah_bon: number;
  sisa_bon: number;
  cicilan_per_bulan: number;
  status: string;
  tanggal_pengajuan: string;
  tanggal_persetujuan?: string;
}

/**
 * Validate bon application based on business rules
 */
export function validateBonApplication(
  employeeData: EmployeeData,
  requestedAmount: number,
  installmentPeriod: number,
  existingBons: ExistingBon[],
  rules: BonRules = defaultBonRules
): BonValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if employee is active
  if (employeeData.status !== 'active') {
    errors.push('Karyawan harus dalam status aktif untuk mengajukan bon');
  }

  // Check employment duration
  const employmentStartDate = new Date(employeeData.tanggal_masuk);
  const currentDate = new Date();
  const employmentMonths = Math.floor(
    (currentDate.getTime() - employmentStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  if (employmentMonths < rules.minEmploymentDuration) {
    errors.push(
      `Karyawan harus bekerja minimal ${rules.minEmploymentDuration} bulan untuk mengajukan bon. ` +
      `Saat ini baru ${employmentMonths} bulan.`
    );
  }

  // Check maximum bon amount based on salary percentage
  const maxBonBySalary = (employeeData.gaji_pokok * rules.maxBonPercentage) / 100;
  if (requestedAmount > maxBonBySalary) {
    errors.push(
      `Jumlah bon tidak boleh melebihi ${rules.maxBonPercentage}% dari gaji pokok. ` +
      `Maksimal: Rp ${maxBonBySalary.toLocaleString('id-ID')}`
    );
  }

  // Check absolute maximum bon amount
  if (requestedAmount > rules.maxBonAmount) {
    errors.push(
      `Jumlah bon tidak boleh melebihi Rp ${rules.maxBonAmount.toLocaleString('id-ID')}`
    );
  }

  // Check installment period
  if (installmentPeriod < rules.minInstallmentPeriod) {
    errors.push(
      `Periode cicilan minimal ${rules.minInstallmentPeriod} bulan`
    );
  }

  if (installmentPeriod > rules.maxInstallmentPeriod) {
    errors.push(
      `Periode cicilan maksimal ${rules.maxInstallmentPeriod} bulan`
    );
  }

  // Check installment amount vs salary
  const monthlyInstallment = requestedAmount / installmentPeriod;
  const maxInstallmentBySalary = (employeeData.gaji_pokok * rules.maxInstallmentPercentage) / 100;
  
  if (monthlyInstallment > maxInstallmentBySalary) {
    errors.push(
      `Cicilan bulanan tidak boleh melebihi ${rules.maxInstallmentPercentage}% dari gaji pokok. ` +
      `Maksimal: Rp ${maxInstallmentBySalary.toLocaleString('id-ID')}, ` +
      `Cicilan yang diajukan: Rp ${monthlyInstallment.toLocaleString('id-ID')}`
    );
  }

  // Check active bons
  const activeBons = existingBons.filter(bon => 
    bon.karyawan_id === employeeData.id && 
    ['pending', 'approved'].includes(bon.status) &&
    bon.sisa_bon > 0
  );

  if (activeBons.length >= rules.maxActiveBonPerEmployee) {
    errors.push(
      `Karyawan sudah memiliki ${activeBons.length} bon aktif. ` +
      `Maksimal ${rules.maxActiveBonPerEmployee} bon aktif per karyawan.`
    );
  }

  // Check time between applications
  const recentApplications = existingBons.filter(bon => {
    const applicationDate = new Date(bon.tanggal_pengajuan);
    const monthsDiff = Math.floor(
      (currentDate.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    return bon.karyawan_id === employeeData.id && monthsDiff < rules.minTimeBetweenApplications;
  });

  if (recentApplications.length > 0) {
    errors.push(
      `Harus menunggu minimal ${rules.minTimeBetweenApplications} bulan sejak pengajuan bon terakhir`
    );
  }

  // Check total installment burden
  const totalExistingInstallments = activeBons.reduce((total, bon) => total + bon.cicilan_per_bulan, 0);
  const totalInstallmentBurden = totalExistingInstallments + monthlyInstallment;
  const maxTotalInstallment = (employeeData.gaji_pokok * rules.maxInstallmentPercentage) / 100;

  if (totalInstallmentBurden > maxTotalInstallment) {
    errors.push(
      `Total cicilan (termasuk bon aktif) tidak boleh melebihi ${rules.maxInstallmentPercentage}% dari gaji. ` +
      `Total cicilan: Rp ${totalInstallmentBurden.toLocaleString('id-ID')}, ` +
      `Maksimal: Rp ${maxTotalInstallment.toLocaleString('id-ID')}`
    );
  }

  // Warnings
  if (requestedAmount > maxBonBySalary * 0.7) {
    warnings.push(
      `Jumlah bon cukup besar (${Math.round((requestedAmount / maxBonBySalary) * 100)}% dari maksimal). ` +
      `Pastikan karyawan mampu membayar cicilan.`
    );
  }

  if (installmentPeriod > 12) {
    warnings.push(
      `Periode cicilan cukup panjang (${installmentPeriod} bulan). ` +
      `Pertimbangkan risiko perubahan status karyawan.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate recommended installment period based on amount and salary
 */
export function calculateRecommendedInstallmentPeriod(
  amount: number,
  salary: number,
  rules: BonRules = defaultBonRules
): number {
  const maxMonthlyInstallment = (salary * rules.maxInstallmentPercentage) / 100;
  const minPeriod = Math.ceil(amount / maxMonthlyInstallment);
  
  // Ensure it's within allowed range
  return Math.max(
    rules.minInstallmentPeriod,
    Math.min(minPeriod, rules.maxInstallmentPeriod)
  );
}

/**
 * Calculate maximum bon amount for an employee
 */
export function calculateMaxBonAmount(
  employeeData: EmployeeData,
  existingBons: ExistingBon[],
  rules: BonRules = defaultBonRules
): number {
  const maxBySalary = (employeeData.gaji_pokok * rules.maxBonPercentage) / 100;
  const maxByRule = rules.maxBonAmount;
  
  // Consider existing installment burden
  const activeBons = existingBons.filter(bon => 
    bon.karyawan_id === employeeData.id && 
    ['pending', 'approved'].includes(bon.status) &&
    bon.sisa_bon > 0
  );
  
  const existingInstallments = activeBons.reduce((total, bon) => total + bon.cicilan_per_bulan, 0);
  const availableInstallmentCapacity = 
    (employeeData.gaji_pokok * rules.maxInstallmentPercentage) / 100 - existingInstallments;
  
  // Assume minimum installment period for calculation
  const maxByInstallmentCapacity = availableInstallmentCapacity * rules.minInstallmentPeriod;
  
  return Math.min(maxBySalary, maxByRule, Math.max(0, maxByInstallmentCapacity));
}

/**
 * Get bon eligibility status for an employee
 */
export function getBonEligibilityStatus(
  employeeData: EmployeeData,
  existingBons: ExistingBon[],
  rules: BonRules = defaultBonRules
): {
  isEligible: boolean;
  reasons: string[];
  maxAmount: number;
  recommendedPeriod: number;
} {
  const reasons: string[] = [];
  let isEligible = true;

  // Check basic eligibility
  if (employeeData.status !== 'active') {
    isEligible = false;
    reasons.push('Status karyawan tidak aktif');
  }

  const employmentStartDate = new Date(employeeData.tanggal_masuk);
  const currentDate = new Date();
  const employmentMonths = Math.floor(
    (currentDate.getTime() - employmentStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  if (employmentMonths < rules.minEmploymentDuration) {
    isEligible = false;
    reasons.push(`Masa kerja kurang dari ${rules.minEmploymentDuration} bulan`);
  }

  const activeBons = existingBons.filter(bon => 
    bon.karyawan_id === employeeData.id && 
    ['pending', 'approved'].includes(bon.status) &&
    bon.sisa_bon > 0
  );

  if (activeBons.length >= rules.maxActiveBonPerEmployee) {
    isEligible = false;
    reasons.push('Sudah memiliki bon aktif maksimal');
  }

  const maxAmount = calculateMaxBonAmount(employeeData, existingBons, rules);
  if (maxAmount <= 0) {
    isEligible = false;
    reasons.push('Kapasitas cicilan sudah penuh');
  }

  const recommendedPeriod = calculateRecommendedInstallmentPeriod(
    maxAmount,
    employeeData.gaji_pokok,
    rules
  );

  return {
    isEligible,
    reasons,
    maxAmount,
    recommendedPeriod
  };
}