import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration - in real app, this would be in database
let mockJabatan = [
  {
    id: 1,
    nama: 'Manager',
    deskripsi: 'Mengelola operasional dan tim',
    gaji_pokok: 15000000,
    tunjangan: 2000000,
    status: 'aktif',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    nama: 'Staff',
    deskripsi: 'Melaksanakan tugas operasional',
    gaji_pokok: 8000000,
    tunjangan: 1000000,
    status: 'aktif',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 3,
    nama: 'Supervisor',
    deskripsi: 'Mengawasi dan membimbing staff',
    gaji_pokok: 12000000,
    tunjangan: 1500000,
    status: 'aktif',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 4,
    nama: 'Admin',
    deskripsi: 'Mengelola administrasi dan sistem',
    gaji_pokok: 10000000,
    tunjangan: 1200000,
    status: 'aktif',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  }
];

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;
    const jabatanId = parseInt(id as string);

    if (isNaN(jabatanId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid jabatan ID'
      });
    }

    switch (req.method) {
      case 'GET':
        const jabatan = mockJabatan.find(j => j.id === jabatanId);
        
        if (!jabatan) {
          return res.status(404).json({
            success: false,
            message: 'Jabatan not found'
          });
        }
        
        return res.status(200).json({
          success: true,
          data: jabatan
        });

      case 'PUT':
        // Only admin can update jabatan
        if (req.user?.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }
        
        const { nama, deskripsi, gaji_pokok, tunjangan } = req.body;
        
        if (!nama || !deskripsi || gaji_pokok === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Required fields: nama, deskripsi, gaji_pokok'
          });
        }
        
        const jabatanIndex = mockJabatan.findIndex(j => j.id === jabatanId);
        
        if (jabatanIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Jabatan not found'
          });
        }
        
        // Check if nama already exists (excluding current jabatan)
        const existingJabatan = mockJabatan.find(j => j.nama === nama && j.id !== jabatanId);
        if (existingJabatan) {
          return res.status(400).json({
            success: false,
            message: 'Jabatan name already exists'
          });
        }
        
        const updatedJabatan = {
          ...mockJabatan[jabatanIndex],
          nama,
          deskripsi,
          gaji_pokok: parseInt(gaji_pokok),
          tunjangan: tunjangan ? parseInt(tunjangan) : 0,
          updated_at: new Date().toISOString()
        };
        
        mockJabatan[jabatanIndex] = updatedJabatan;
        
        return res.status(200).json({
          success: true,
          message: 'Jabatan updated successfully',
          data: updatedJabatan
        });

      case 'DELETE':
        // Only admin can delete jabatan
        if (req.user?.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
          });
        }
        
        const deleteIndex = mockJabatan.findIndex(j => j.id === jabatanId);
        
        if (deleteIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Jabatan not found'
          });
        }
        
        // TODO: Check if jabatan is being used by any karyawan
        // const karyawanUsingJabatan = await checkKaryawanByJabatan(jabatanId);
        // if (karyawanUsingJabatan.length > 0) {
        //   return res.status(400).json({
        //     success: false,
        //     message: 'Cannot delete jabatan that is being used by employees'
        //   });
        // }
        
        const deletedJabatan = mockJabatan[deleteIndex];
        mockJabatan.splice(deleteIndex, 1);
        
        return res.status(200).json({
          success: true,
          message: 'Jabatan deleted successfully',
          data: deletedJabatan
        });

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }

  } catch (error) {
    console.error('Jabatan API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

export default withAuth(handler);