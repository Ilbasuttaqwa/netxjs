import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { Bon } from '../../../types';

// Import mock data from index.ts (in real app, this would be from database)
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
  }
];

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const bonId = parseInt(id as string);
  
  try {
    switch (req.method) {
      case 'GET':
        const bon = mockBon.find(b => b.id === bonId);
        
        if (!bon) {
          return res.status(404).json({
            success: false,
            message: 'Bon tidak ditemukan'
          });
        }
        
        return res.status(200).json({
          success: true,
          message: 'Data bon berhasil diambil',
          data: bon
        });
        
      case 'PUT':
        const bonIndex = mockBon.findIndex(b => b.id === bonId);
        
        if (bonIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Bon tidak ditemukan'
          });
        }
        
        const { action, ...updateData } = req.body;
        
        if (action === 'approve') {
          // Approve bon
          if (mockBon[bonIndex].status !== 'pending') {
            return res.status(400).json({
              success: false,
              message: 'Bon sudah diproses sebelumnya'
            });
          }
          
          mockBon[bonIndex] = {
            ...mockBon[bonIndex],
            status: 'approved',
            tanggal_persetujuan: new Date().toISOString().split('T')[0],
            approved_by: parseInt(req.user?.id.toString() || '0'),
            updated_at: new Date().toISOString()
          };
          
          return res.status(200).json({
            success: true,
            message: 'Bon berhasil disetujui',
            data: mockBon[bonIndex]
          });
          
        } else if (action === 'reject') {
          // Reject bon
          if (mockBon[bonIndex].status !== 'pending') {
            return res.status(400).json({
              success: false,
              message: 'Bon sudah diproses sebelumnya'
            });
          }
          
          mockBon[bonIndex] = {
            ...mockBon[bonIndex],
            status: 'rejected',
            approved_by: parseInt(req.user?.id.toString() || '0'),
            updated_at: new Date().toISOString()
          };
          
          return res.status(200).json({
            success: true,
            message: 'Bon berhasil ditolak',
            data: mockBon[bonIndex]
          });
          
        } else {
          // Update bon data
          const allowedFields = ['cicilan_per_bulan', 'keterangan'];
          const updates: Partial<Bon> = {};
          
          Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
              updates[key as keyof Bon] = updateData[key];
            }
          });
          
          mockBon[bonIndex] = {
            ...mockBon[bonIndex],
            ...updates,
            updated_at: new Date().toISOString()
          };
          
          return res.status(200).json({
            success: true,
            message: 'Bon berhasil diperbarui',
            data: mockBon[bonIndex]
          });
        }
        
      case 'DELETE':
        const deleteIndex = mockBon.findIndex(b => b.id === bonId);
        
        if (deleteIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Bon tidak ditemukan'
          });
        }
        
        // Only allow deletion if status is pending or rejected
        if (!['pending', 'rejected'].includes(mockBon[deleteIndex].status)) {
          return res.status(400).json({
            success: false,
            message: 'Bon yang sudah disetujui tidak dapat dihapus'
          });
        }
        
        mockBon.splice(deleteIndex, 1);
        
        return res.status(200).json({
          success: true,
          message: 'Bon berhasil dihapus'
        });
        
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({
          success: false,
          message: `Method ${req.method} tidak diizinkan`
        });
    }
  } catch (error) {
    console.error('Error in bon detail API:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  }
}

export default withAdminAuth(handler);