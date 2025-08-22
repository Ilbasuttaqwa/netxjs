import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { Bon, BonFormData } from '../../../types';
import { validateBonApplication, getBonEligibilityStatus, defaultBonRules, EmployeeData, ExistingBon } from '../../../lib/bon-rules';

// Mock data for demonstration
const mockBon: Bon[] = [
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
    updated_at: '2024-01-16T00:00:00.000Z',
    karyawan: {
      id: 1,
      nama: 'John Doe',
      email: 'john@afms.com',
      telepon: '081234567890',
      alamat: 'Jl. Contoh No. 123',
      tanggal_lahir: '1990-01-01',
      jenis_kelamin: 'L',
      cabang_id: 1,
      jabatan_id: 1,
      tanggal_masuk: '2023-01-15',
      status: 'aktif',
      fingerprint_id: 'FP001',
      created_at: '2023-01-15T00:00:00.000Z',
      updated_at: '2023-01-15T00:00:00.000Z'
    }
  },
  {
    id: 2,
    karyawan_id: 2,
    jumlah_bon: 3000000,
    sisa_bon: 3000000,
    cicilan_per_bulan: 300000,
    tanggal_pengajuan: '2024-01-20',
    status: 'pending',
    keterangan: 'Bon untuk biaya pendidikan anak',
    created_at: '2024-01-20T00:00:00.000Z',
    updated_at: '2024-01-20T00:00:00.000Z',
    karyawan: {
      id: 2,
      nama: 'Jane Smith',
      email: 'jane@afms.com',
      telepon: '081234567891',
      alamat: 'Jl. Contoh No. 124',
      tanggal_lahir: '1992-05-15',
      jenis_kelamin: 'P',
      cabang_id: 1,
      jabatan_id: 2,
      tanggal_masuk: '2023-02-01',
      status: 'aktif',
      fingerprint_id: 'FP002',
      created_at: '2023-02-01T00:00:00.000Z',
      updated_at: '2023-02-01T00:00:00.000Z'
    }
  }
];

let nextId = 3;

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { page = 1, limit = 10, search = '', status, karyawan_id } = req.query;
        
        let filteredBon = [...mockBon];
        
        // Filter by search (nama karyawan)
        if (search) {
          filteredBon = filteredBon.filter(bon => 
            bon.karyawan?.nama.toLowerCase().includes(search.toString().toLowerCase())
          );
        }
        
        // Filter by status
        if (status && status !== 'all') {
          filteredBon = filteredBon.filter(bon => bon.status === status);
        }
        
        // Filter by karyawan_id
        if (karyawan_id) {
          filteredBon = filteredBon.filter(bon => bon.karyawan_id === parseInt(karyawan_id.toString()));
        }
        
        // Pagination
        const pageNum = parseInt(page.toString());
        const limitNum = parseInt(limit.toString());
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedBon = filteredBon.slice(startIndex, endIndex);
        
        return res.status(200).json({
          success: true,
          message: 'Data bon berhasil diambil',
          data: paginatedBon,
          pagination: {
            current_page: pageNum,
            per_page: limitNum,
            total: filteredBon.length,
            last_page: Math.ceil(filteredBon.length / limitNum),
            from: startIndex + 1,
            to: Math.min(endIndex, filteredBon.length)
          }
        });
        
      case 'POST':
        const bonData: BonFormData = req.body;
        
        // Basic validation
        if (!bonData.karyawan_id || !bonData.jumlah_bon || !bonData.cicilan_per_bulan) {
          return res.status(400).json({
            success: false,
            message: 'Data tidak lengkap',
            errors: {
              karyawan_id: !bonData.karyawan_id ? ['Karyawan harus dipilih'] : [],
              jumlah_bon: !bonData.jumlah_bon ? ['Jumlah bon harus diisi'] : [],
              cicilan_per_bulan: !bonData.cicilan_per_bulan ? ['Cicilan per bulan harus diisi'] : []
            }
          });
        }
        
        if (bonData.jumlah_bon <= 0 || bonData.cicilan_per_bulan <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Jumlah bon dan cicilan harus lebih dari 0'
          });
        }
        
        // Mock employee data (in real app, fetch from database)
        const employeeData: EmployeeData = {
          id: bonData.karyawan_id,
          gaji_pokok: 5000000, // Mock salary
          tanggal_masuk: '2023-01-15', // Mock employment date
          status: 'active'
        };
        
        // Calculate installment period
        const installmentPeriod = Math.ceil(bonData.jumlah_bon / bonData.cicilan_per_bulan);
        
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
        
        // Validate bon application using business rules
        const validation = validateBonApplication(
          employeeData,
          bonData.jumlah_bon,
          installmentPeriod,
          existingBons,
          defaultBonRules
        );
        
        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Pengajuan bon tidak valid',
            errors: validation.errors,
            warnings: validation.warnings
          });
        }
        
        const newBon: Bon = {
          id: nextId++,
          karyawan_id: bonData.karyawan_id,
          jumlah_bon: bonData.jumlah_bon,
          sisa_bon: bonData.jumlah_bon,
          cicilan_per_bulan: bonData.cicilan_per_bulan,
          tanggal_pengajuan: new Date().toISOString().split('T')[0],
          status: 'pending',
          keterangan: bonData.keterangan,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        mockBon.push(newBon);
        
        return res.status(201).json({
          success: true,
          message: 'Bon berhasil diajukan',
          data: newBon
        });
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} tidak diizinkan`
        });
    }
  } catch (error) {
    console.error('Error in bon API:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default withAdminAuth(handler);