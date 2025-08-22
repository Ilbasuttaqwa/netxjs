import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration
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

let nextId = 3;

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { page = 1, limit = 10, search = '', cabang_id, jabatan_id } = req.query;
        
        let filteredKaryawan = [...mockKaryawan];
        
        // Apply filters
        if (search) {
          filteredKaryawan = filteredKaryawan.filter(k => 
            k.nama.toLowerCase().includes(search.toString().toLowerCase()) ||
            k.email.toLowerCase().includes(search.toString().toLowerCase())
          );
        }
        
        if (cabang_id) {
          filteredKaryawan = filteredKaryawan.filter(k => 
            k.cabang_id === parseInt(cabang_id.toString())
          );
        }
        
        if (jabatan_id) {
          filteredKaryawan = filteredKaryawan.filter(k => 
            k.jabatan_id === parseInt(jabatan_id.toString())
          );
        }
        
        // Pagination
        const pageNum = parseInt(page.toString());
        const limitNum = parseInt(limit.toString());
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        
        const paginatedKaryawan = filteredKaryawan.slice(startIndex, endIndex);
        
        return res.status(200).json({
          success: true,
          data: paginatedKaryawan,
          pagination: {
            current_page: pageNum,
            per_page: limitNum,
            total: filteredKaryawan.length,
            total_pages: Math.ceil(filteredKaryawan.length / limitNum)
          }
        });

      case 'POST':
        const { nama, email, jabatan_id: jId, cabang_id: cId, telepon, alamat, tanggal_masuk, finger_id, status } = req.body;
        
        if (!nama || !email || !jId || !cId) {
          return res.status(400).json({
            message: 'Required fields: nama, email, jabatan_id, cabang_id'
          });
        }
        
        // Check if email already exists
        const existingKaryawan = mockKaryawan.find(k => k.email === email);
        if (existingKaryawan) {
          return res.status(400).json({
            message: 'Email already exists'
          });
        }
        
        const newKaryawan = {
          id: nextId++,
          nama,
          email,
          jabatan_id: parseInt(jId),
          jabatan: { nama: 'Staff' }, // Mock jabatan
          cabang_id: parseInt(cId),
          cabang: { nama: 'Cabang Utama' }, // Mock cabang
          telepon: telepon || '',
          alamat: alamat || '',
          tanggal_masuk: tanggal_masuk || new Date().toISOString().split('T')[0],
          fingerprint_id: finger_id || null,
          status: status || 'aktif',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        mockKaryawan.push(newKaryawan);
        
        return res.status(201).json({
          success: true,
          message: 'Karyawan created successfully',
          data: newKaryawan
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