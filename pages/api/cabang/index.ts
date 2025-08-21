import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration
const mockCabang = [
  {
    id: 1,
    nama: 'Cabang Utama',
    alamat: 'Jl. Sudirman No. 123, Jakarta',
    no_telp: '021-12345678',
    email: 'utama@afms.com',
    status: 'aktif',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    nama: 'Cabang Bandung',
    alamat: 'Jl. Asia Afrika No. 456, Bandung',
    no_telp: '022-87654321',
    email: 'bandung@afms.com',
    status: 'aktif',
    created_at: '2023-01-15T00:00:00.000Z',
    updated_at: '2023-01-15T00:00:00.000Z'
  },
  {
    id: 3,
    nama: 'Cabang Surabaya',
    alamat: 'Jl. Tunjungan No. 789, Surabaya',
    no_telp: '031-11223344',
    email: 'surabaya@afms.com',
    status: 'aktif',
    created_at: '2023-02-01T00:00:00.000Z',
    updated_at: '2023-02-01T00:00:00.000Z'
  }
];

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { search = '', status } = req.query;
        
        let filteredCabang = [...mockCabang];
        
        // Apply filters
        if (search) {
          filteredCabang = filteredCabang.filter(c => 
            c.nama.toLowerCase().includes(search.toString().toLowerCase()) ||
            c.alamat.toLowerCase().includes(search.toString().toLowerCase())
          );
        }
        
        if (status) {
          filteredCabang = filteredCabang.filter(c => c.status === status);
        }
        
        return res.status(200).json({
          success: true,
          data: filteredCabang
        });

      case 'POST':
        // Only admin can create cabang
        if (req.user?.role !== 'admin') {
          return res.status(403).json({
            message: 'Insufficient permissions'
          });
        }
        
        const { nama, alamat, no_telp, email } = req.body;
        
        if (!nama || !alamat) {
          return res.status(400).json({
            message: 'Required fields: nama, alamat'
          });
        }
        
        // Check if nama already exists
        const existingCabang = mockCabang.find(c => c.nama === nama);
        if (existingCabang) {
          return res.status(400).json({
            message: 'Cabang name already exists'
          });
        }
        
        const newCabang = {
          id: Math.max(...mockCabang.map(c => c.id)) + 1,
          nama,
          alamat,
          no_telp: no_telp || '',
          email: email || '',
          status: 'aktif',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        mockCabang.push(newCabang);
        
        return res.status(201).json({
          success: true,
          message: 'Cabang created successfully',
          data: newCabang
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Cabang API error:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

export default withAuth(handler);