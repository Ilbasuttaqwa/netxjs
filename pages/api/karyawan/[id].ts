import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data (same as in index.ts - in real app, this would be in a database)
const mockKaryawan = [
  {
    id: 1,
    nama: 'John Doe',
    email: 'john@afms.com',
    jabatan_id: 1,
    jabatan: { nama: 'Manager' },
    cabang_id: 1,
    cabang: { nama: 'Cabang Utama' },
    telepon: '081234567890',
    alamat: 'Jl. Contoh No. 123',
    tanggal_masuk: '2023-01-15',
    fingerprint_id: 'FP001',
    status: 'aktif',
    created_at: '2023-01-15T00:00:00.000Z',
    updated_at: '2023-01-15T00:00:00.000Z'
  },
  {
    id: 2,
    nama: 'Jane Smith',
    email: 'jane@afms.com',
    jabatan_id: 2,
    jabatan: { nama: 'Staff' },
    cabang_id: 1,
    cabang: { nama: 'Cabang Utama' },
    telepon: '081234567891',
    alamat: 'Jl. Contoh No. 124',
    tanggal_masuk: '2023-02-01',
    fingerprint_id: 'FP002',
    status: 'aktif',
    created_at: '2023-02-01T00:00:00.000Z',
    updated_at: '2023-02-01T00:00:00.000Z'
  }
];

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const karyawanId = parseInt(id as string);

  try {
    switch (req.method) {
      case 'GET':
        const karyawan = mockKaryawan.find(k => k.id === karyawanId);
        
        if (!karyawan) {
          return res.status(404).json({
            message: 'Karyawan not found'
          });
        }
        
        return res.status(200).json({
          success: true,
          data: karyawan
        });

      case 'PUT':
        const karyawanIndex = mockKaryawan.findIndex(k => k.id === karyawanId);
        
        if (karyawanIndex === -1) {
          return res.status(404).json({
            message: 'Karyawan not found'
          });
        }
        
        const { nama, email, jabatan_id, cabang_id, telepon, alamat, tanggal_masuk, finger_id, status } = req.body;
        
        // Check if email already exists (excluding current karyawan)
        if (email) {
          const existingKaryawan = mockKaryawan.find(k => k.email === email && k.id !== karyawanId);
          if (existingKaryawan) {
            return res.status(400).json({
              message: 'Email already exists'
            });
          }
        }
        
        // Update karyawan
        const updatedKaryawan = {
          ...mockKaryawan[karyawanIndex],
          nama: nama || mockKaryawan[karyawanIndex].nama,
          email: email || mockKaryawan[karyawanIndex].email,
          jabatan_id: jabatan_id ? parseInt(jabatan_id) : mockKaryawan[karyawanIndex].jabatan_id,
          cabang_id: cabang_id ? parseInt(cabang_id) : mockKaryawan[karyawanIndex].cabang_id,
          telepon: telepon !== undefined ? telepon : mockKaryawan[karyawanIndex].telepon,
          alamat: alamat !== undefined ? alamat : mockKaryawan[karyawanIndex].alamat,
          tanggal_masuk: tanggal_masuk || mockKaryawan[karyawanIndex].tanggal_masuk,
          fingerprint_id: finger_id !== undefined ? finger_id : mockKaryawan[karyawanIndex].fingerprint_id,
          status: status || mockKaryawan[karyawanIndex].status,
          updated_at: new Date().toISOString()
        };
        
        mockKaryawan[karyawanIndex] = updatedKaryawan;
        
        return res.status(200).json({
          success: true,
          message: 'Karyawan updated successfully',
          data: updatedKaryawan
        });

      case 'DELETE':
        const deleteIndex = mockKaryawan.findIndex(k => k.id === karyawanId);
        
        if (deleteIndex === -1) {
          return res.status(404).json({
            message: 'Karyawan not found'
          });
        }
        
        mockKaryawan.splice(deleteIndex, 1);
        
        return res.status(200).json({
          success: true,
          message: 'Karyawan deleted successfully'
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Karyawan API error:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

export default withAdminAuth(handler);