import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration
const mockJabatan = [
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
    switch (req.method) {
      case 'GET':
        const { search = '', status } = req.query;
        
        let filteredJabatan = [...mockJabatan];
        
        // Apply filters
        if (search) {
          filteredJabatan = filteredJabatan.filter(j => 
            j.nama.toLowerCase().includes(search.toString().toLowerCase()) ||
            j.deskripsi.toLowerCase().includes(search.toString().toLowerCase())
          );
        }
        
        if (status) {
          filteredJabatan = filteredJabatan.filter(j => j.status === status);
        }
        
        // Pagination
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 15;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        
        const paginatedData = filteredJabatan.slice(startIndex, endIndex);
        
        return res.status(200).json({
          success: true,
          data: paginatedData,
          total: filteredJabatan.length,
          page,
          pageSize,
          totalPages: Math.ceil(filteredJabatan.length / pageSize)
        });

      case 'POST':
        // Only admin can create jabatan
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
        
        // Check if nama already exists
        const existingJabatan = mockJabatan.find(j => j.nama === nama);
        if (existingJabatan) {
          return res.status(400).json({
            success: false,
            message: 'Jabatan name already exists'
          });
        }
        
        const newJabatan = {
          id: Math.max(...mockJabatan.map(j => j.id)) + 1,
          nama,
          deskripsi,
          gaji_pokok: parseInt(gaji_pokok),
          tunjangan: tunjangan ? parseInt(tunjangan) : 0,
          status: 'aktif',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        mockJabatan.push(newJabatan);
        
        return res.status(201).json({
          success: true,
          message: 'Jabatan created successfully',
          data: newJabatan
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