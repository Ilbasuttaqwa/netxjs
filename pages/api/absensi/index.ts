import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration
const mockAbsensi = [
  {
    id: 1,
    karyawan_id: 1,
    karyawan: { nama: 'John Doe', email: 'john@afms.com' },
    tanggal: '2024-01-15',
    jam_masuk: '08:00:00',
    jam_keluar: '17:00:00',
    status: 'hadir',
    keterangan: '',
    lokasi_masuk: 'Kantor Utama',
    lokasi_keluar: 'Kantor Utama',
    created_at: '2024-01-15T08:00:00.000Z',
    updated_at: '2024-01-15T17:00:00.000Z'
  },
  {
    id: 2,
    karyawan_id: 2,
    karyawan: { nama: 'Jane Smith', email: 'jane@afms.com' },
    tanggal: '2024-01-15',
    jam_masuk: '08:15:00',
    jam_keluar: '17:00:00',
    status: 'terlambat',
    keterangan: 'Terlambat 15 menit',
    lokasi_masuk: 'Kantor Utama',
    lokasi_keluar: 'Kantor Utama',
    created_at: '2024-01-15T08:15:00.000Z',
    updated_at: '2024-01-15T17:00:00.000Z'
  },
  {
    id: 3,
    karyawan_id: 1,
    karyawan: { nama: 'John Doe', email: 'john@afms.com' },
    tanggal: '2024-01-16',
    jam_masuk: '07:55:00',
    jam_keluar: null,
    status: 'hadir',
    keterangan: '',
    lokasi_masuk: 'Kantor Utama',
    lokasi_keluar: null,
    created_at: '2024-01-16T07:55:00.000Z',
    updated_at: '2024-01-16T07:55:00.000Z'
  }
];

let nextId = 4;

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { 
          page = 1, 
          limit = 10, 
          tanggal_mulai, 
          tanggal_selesai, 
          karyawan_id, 
          status,
          cabang_id 
        } = req.query;
        
        let filteredAbsensi = [...mockAbsensi];
        
        // For non-admin users, only show their own attendance
        if (req.user?.role !== 'admin') {
          filteredAbsensi = filteredAbsensi.filter(a => a.karyawan_id === req.user?.userId);
        }
        
        // Apply filters
        if (tanggal_mulai) {
          filteredAbsensi = filteredAbsensi.filter(a => a.tanggal >= tanggal_mulai);
        }
        
        if (tanggal_selesai) {
          filteredAbsensi = filteredAbsensi.filter(a => a.tanggal <= tanggal_selesai);
        }
        
        if (karyawan_id && req.user?.role === 'admin') {
          filteredAbsensi = filteredAbsensi.filter(a => 
            a.karyawan_id === parseInt(karyawan_id.toString())
          );
        }
        
        if (status) {
          filteredAbsensi = filteredAbsensi.filter(a => a.status === status);
        }
        
        // Pagination
        const pageNum = parseInt(page.toString());
        const limitNum = parseInt(limit.toString());
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        
        const paginatedAbsensi = filteredAbsensi.slice(startIndex, endIndex);
        
        return res.status(200).json({
          success: true,
          data: {
            data: paginatedAbsensi,
            current_page: pageNum,
            per_page: limitNum,
            total: filteredAbsensi.length,
            last_page: Math.ceil(filteredAbsensi.length / limitNum)
          }
        });

      case 'POST':
        const { type, lokasi, keterangan } = req.body;
        
        if (!type || !['masuk', 'keluar'].includes(type)) {
          return res.status(400).json({
            success: false,
            message: 'Type must be either "masuk" or "keluar"'
          });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0];
        
        if (type === 'masuk') {
          // Check if already clocked in today
          const existingAbsensi = mockAbsensi.find(a => 
            a.karyawan_id === req.user?.userId && 
            a.tanggal === today
          );
          
          if (existingAbsensi) {
            return res.status(400).json({
              success: false,
              message: 'Already clocked in today'
            });
          }
          
          // Determine status based on time (assuming work starts at 08:00)
          const workStartTime = '08:00:00';
          const status = currentTime > workStartTime ? 'terlambat' : 'hadir';
          
          const newAbsensi = {
            id: nextId++,
            karyawan_id: req.user?.userId!,
            karyawan: { nama: 'Current User', email: req.user?.email! },
            tanggal: today,
            jam_masuk: currentTime,
            jam_keluar: null,
            status,
            keterangan: keterangan || (status === 'terlambat' ? 'Terlambat' : ''),
            lokasi_masuk: lokasi || 'Unknown',
            lokasi_keluar: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          mockAbsensi.push(newAbsensi);
          
          return res.status(201).json({
            success: true,
            message: 'Clock in successful',
            data: newAbsensi
          });
          
        } else { // type === 'keluar'
          // Find today's attendance record
          const absensiIndex = mockAbsensi.findIndex(a => 
            a.karyawan_id === req.user?.userId && 
            a.tanggal === today
          );
          
          if (absensiIndex === -1) {
            return res.status(400).json({
              success: false,
              message: 'No clock in record found for today'
            });
          }
          
          if (mockAbsensi[absensiIndex].jam_keluar) {
            return res.status(400).json({
              success: false,
              message: 'Already clocked out today'
            });
          }
          
          // Update the record
          mockAbsensi[absensiIndex] = {
            ...mockAbsensi[absensiIndex],
            jam_keluar: currentTime,
            lokasi_keluar: lokasi || 'Unknown',
            updated_at: new Date().toISOString()
          };
          
          return res.status(200).json({
            success: true,
            message: 'Clock out successful',
            data: mockAbsensi[absensiIndex]
          });
        }

      default:
        return res.status(405).json({ 
          success: false,
          message: 'Method not allowed' 
        });
    }

  } catch (error) {
    console.error('Absensi API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

export default withAuth(handler);