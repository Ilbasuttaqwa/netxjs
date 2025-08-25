import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { BonStats } from '../../../types/index';

// Mock data for demonstration
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
    updated_at: '2024-01-20T00:00:00.000Z'
  },
  {
    id: 3,
    karyawan_id: 3,
    jumlah_bon: 2000000,
    sisa_bon: 1000000,
    cicilan_per_bulan: 200000,
    tanggal_pengajuan: '2024-01-10',
    tanggal_persetujuan: '2024-01-11',
    status: 'approved',
    keterangan: 'Bon untuk renovasi rumah',
    approved_by: 1,
    created_at: '2024-01-10T00:00:00.000Z',
    updated_at: '2024-01-11T00:00:00.000Z'
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
    
    // Calculate statistics
    const activeBon = mockBon.filter(bon => ['approved', 'pending'].includes(bon.status));
    const approvedBon = mockBon.filter(bon => bon.status === 'approved');
    
    const stats: BonStats = {
      total_bon_aktif: activeBon.length,
      total_nilai_bon: activeBon.reduce((total, bon) => total + bon.sisa_bon, 0),
      total_cicilan_bulan_ini: approvedBon.reduce((total, bon) => total + bon.cicilan_per_bulan, 0),
      total_karyawan_bon: new Set(activeBon.map(bon => bon.karyawan_id)).size
    };
    
    return res.status(200).json({
      success: true,
      message: 'Statistik bon berhasil diambil',
      data: stats
    });
    
  } catch (error) {
    console.error('Error in bon stats API:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default withAdminAuth(handler);