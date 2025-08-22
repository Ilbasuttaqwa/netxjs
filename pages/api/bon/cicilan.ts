import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { BonCicilan } from '../../../types';

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
    tanggal_persetujuan: '2024-01-21',
    status: 'approved',
    keterangan: 'Bon untuk biaya pendidikan anak',
    approved_by: 1,
    created_at: '2024-01-20T00:00:00.000Z',
    updated_at: '2024-01-21T00:00:00.000Z'
  }
];

const mockBonCicilan: BonCicilan[] = [
  {
    id: 1,
    bon_id: 1,
    periode: '2024-01',
    jumlah_cicilan: 500000,
    tanggal_potong: '2024-01-31',
    status: 'processed',
    created_at: '2024-01-31T00:00:00.000Z',
    updated_at: '2024-01-31T00:00:00.000Z'
  },
  {
    id: 2,
    bon_id: 1,
    periode: '2024-02',
    jumlah_cicilan: 500000,
    tanggal_potong: '2024-02-29',
    status: 'processed',
    created_at: '2024-02-29T00:00:00.000Z',
    updated_at: '2024-02-29T00:00:00.000Z'
  }
];

let nextCicilanId = 3;

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { periode, karyawan_id, bon_id } = req.query;
        
        let filteredCicilan = [...mockBonCicilan];
        
        // Filter by periode
        if (periode) {
          filteredCicilan = filteredCicilan.filter(cicilan => 
            cicilan.periode === periode
          );
        }
        
        // Filter by bon_id
        if (bon_id) {
          filteredCicilan = filteredCicilan.filter(cicilan => 
            cicilan.bon_id === parseInt(bon_id.toString())
          );
        }
        
        // Filter by karyawan_id (through bon relationship)
        if (karyawan_id) {
          const employeeBons = mockBon.filter(bon => 
            bon.karyawan_id === parseInt(karyawan_id.toString())
          );
          const bonIds = employeeBons.map(bon => bon.id);
          filteredCicilan = filteredCicilan.filter(cicilan => 
            bonIds.includes(cicilan.bon_id)
          );
        }
        
        // Add bon relationship data
        const cicilanWithBon = filteredCicilan.map(cicilan => ({
          ...cicilan,
          bon: mockBon.find(bon => bon.id === cicilan.bon_id)
        }));
        
        return res.status(200).json({
          success: true,
          message: 'Data cicilan bon berhasil diambil',
          data: cicilanWithBon
        });
        
      case 'POST':
        const { periode: postPeriode } = req.body;
        
        if (!postPeriode) {
          return res.status(400).json({
            success: false,
            message: 'Periode harus diisi'
          });
        }
        
        // Process installments for all approved bon
        const processedCicilan: BonCicilan[] = [];
        const approvedBons = mockBon.filter(bon => bon.status === 'approved' && bon.sisa_bon > 0);
        
        for (const bon of approvedBons) {
          // Check if installment for this period already exists
          const existingCicilan = mockBonCicilan.find(cicilan => 
            cicilan.bon_id === bon.id && cicilan.periode === postPeriode
          );
          
          if (!existingCicilan) {
            const cicilanAmount = Math.min(bon.cicilan_per_bulan, bon.sisa_bon);
            
            const newCicilan: BonCicilan = {
              id: nextCicilanId++,
              bon_id: bon.id,
              periode: postPeriode,
              jumlah_cicilan: cicilanAmount,
              tanggal_potong: new Date().toISOString().split('T')[0],
              status: 'processed',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            mockBonCicilan.push(newCicilan);
            processedCicilan.push(newCicilan);
            
            // Update bon sisa_bon
            bon.sisa_bon -= cicilanAmount;
            
            // Mark bon as completed if fully paid
            if (bon.sisa_bon <= 0) {
              bon.status = 'completed';
            }
            
            bon.updated_at = new Date().toISOString();
          }
        }
        
        return res.status(201).json({
          success: true,
          message: `Berhasil memproses ${processedCicilan.length} cicilan bon untuk periode ${postPeriode}`,
          data: processedCicilan
        });
        
      case 'PUT':
        const { id } = req.query;
        const { status } = req.body;
        
        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'ID cicilan harus diisi'
          });
        }
        
        const cicilanIndex = mockBonCicilan.findIndex(cicilan => 
          cicilan.id === parseInt(id.toString())
        );
        
        if (cicilanIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Cicilan tidak ditemukan'
          });
        }
        
        // Update status
        if (status && ['pending', 'processed', 'cancelled'].includes(status)) {
          mockBonCicilan[cicilanIndex].status = status;
          mockBonCicilan[cicilanIndex].updated_at = new Date().toISOString();
          
          // If cancelled, add back to bon sisa_bon
          if (status === 'cancelled') {
            const bon = mockBon.find(b => b.id === mockBonCicilan[cicilanIndex].bon_id);
            if (bon) {
              bon.sisa_bon += mockBonCicilan[cicilanIndex].jumlah_cicilan;
              bon.status = 'approved'; // Revert to approved if was completed
              bon.updated_at = new Date().toISOString();
            }
          }
        }
        
        return res.status(200).json({
          success: true,
          message: 'Status cicilan berhasil diperbarui',
          data: mockBonCicilan[cicilanIndex]
        });
        
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} tidak diizinkan`
        });
    }
  } catch (error) {
    console.error('Error in bon cicilan API:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default withAdminAuth(handler);