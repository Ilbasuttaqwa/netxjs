import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration
const mockLaporanData = {
  monthly_report: [
    {
      karyawan_id: 1,
      karyawan: { nama: 'John Doe', email: 'john@afms.com', jabatan: 'Manager' },
      total_hari_kerja: 22,
      total_hadir: 20,
      total_terlambat: 2,
      total_tidak_hadir: 0,
      total_jam_kerja: 176,
      percentage_kehadiran: 90.9
    },
    {
      karyawan_id: 2,
      karyawan: { nama: 'Jane Smith', email: 'jane@afms.com', jabatan: 'Staff' },
      total_hari_kerja: 22,
      total_hadir: 18,
      total_terlambat: 3,
      total_tidak_hadir: 1,
      total_jam_kerja: 162,
      percentage_kehadiran: 81.8
    }
  ],
  daily_report: [
    {
      tanggal: '2024-01-15',
      total_karyawan: 25,
      hadir: 20,
      terlambat: 3,
      tidak_hadir: 2,
      percentage_hadir: 80
    },
    {
      tanggal: '2024-01-16',
      total_karyawan: 25,
      hadir: 22,
      terlambat: 2,
      tidak_hadir: 1,
      percentage_hadir: 88
    }
  ],
  cabang_report: [
    {
      cabang_id: 1,
      nama_cabang: 'Kantor Utama',
      alamat: 'Jl. Sudirman No. 123',
      total_karyawan: 15,
      avg_kehadiran: 85.5,
      total_terlambat: 12,
      total_tidak_hadir: 8
    },
    {
      cabang_id: 2,
      nama_cabang: 'Cabang Jakarta',
      alamat: 'Jl. Thamrin No. 456',
      total_karyawan: 10,
      avg_kehadiran: 82.3,
      total_terlambat: 8,
      total_tidak_hadir: 5
    }
  ]
};

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { 
          type = 'monthly',
          bulan,
          tahun,
          tanggal_mulai,
          tanggal_selesai,
          karyawan_id,
          cabang_id,
          format = 'json'
        } = req.query;
        
        // For non-admin users, only allow their own reports
        if (req.user?.role !== 'admin' && karyawan_id && karyawan_id !== req.user?.userId?.toString()) {
          return res.status(403).json({
            message: 'Insufficient permissions'
          });
        }
        
        let reportData;
        
        switch (type) {
          case 'monthly':
            reportData = mockLaporanData.monthly_report;
            
            // Filter by karyawan_id if specified
            if (karyawan_id) {
              reportData = reportData.filter(r => r.karyawan_id === parseInt(karyawan_id.toString()));
            }
            
            // For non-admin users, only show their own data
            if (req.user?.role !== 'admin') {
              reportData = reportData.filter(r => r.karyawan_id === req.user?.userId);
            }
            
            break;
            
          case 'daily':
            if (req.user?.role !== 'admin') {
              return res.status(403).json({
                message: 'Daily reports are only available for admin users'
              });
            }
            
            reportData = mockLaporanData.daily_report;
            
            // Filter by date range if specified
            if (tanggal_mulai) {
              reportData = reportData.filter(r => r.tanggal >= tanggal_mulai);
            }
            if (tanggal_selesai) {
              reportData = reportData.filter(r => r.tanggal <= tanggal_selesai);
            }
            
            break;
            
          case 'cabang':
            if (req.user?.role !== 'admin') {
              return res.status(403).json({
                message: 'Branch reports are only available for admin users'
              });
            }
            
            reportData = mockLaporanData.cabang_report;
            
            // Filter by cabang_id if specified
            if (cabang_id) {
              reportData = reportData.filter(r => r.cabang_id === parseInt(cabang_id.toString()));
            }
            
            break;
            
          case 'summary':
            // Summary report for current user or all users (admin)
            const summaryData = {
              period: bulan && tahun ? `${bulan}/${tahun}` : 'Current Month',
              total_karyawan: req.user?.role === 'admin' ? 25 : 1,
              avg_kehadiran: 84.2,
              total_hari_kerja: 22,
              best_performer: {
                nama: 'John Doe',
                percentage_kehadiran: 95.5
              },
              worst_performer: req.user?.role === 'admin' ? {
                nama: 'Jane Smith',
                percentage_kehadiran: 75.0
              } : null
            };
            
            return res.status(200).json({
              success: true,
              data: summaryData
            });
            
          default:
            return res.status(400).json({
              message: 'Invalid report type. Use: monthly, daily, cabang, or summary'
            });
        }
        
        // Handle different output formats
        if (format === 'csv') {
          // In a real implementation, you would generate CSV here
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="laporan_${type}_${new Date().toISOString().split('T')[0]}.csv"`);
          
          // Mock CSV content
          const csvContent = 'Name,Email,Attendance\nJohn Doe,john@afms.com,90.9%\nJane Smith,jane@afms.com,81.8%';
          return res.status(200).send(csvContent);
        }
        
        return res.status(200).json({
          success: true,
          data: reportData,
          meta: {
            type,
            generated_at: new Date().toISOString(),
            period: bulan && tahun ? `${bulan}/${tahun}` : 'Current Period'
          }
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Laporan API error:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

export default withAuth(handler);