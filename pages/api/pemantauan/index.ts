import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration
const mockMonitoringData = {
  today_stats: {
    total_karyawan: 25,
    hadir: 20,
    terlambat: 3,
    tidak_hadir: 2,
    percentage_hadir: 80
  },
  recent_activities: [
    {
      id: 1,
      karyawan: { nama: 'John Doe', email: 'john@afms.com' },
      activity: 'Clock In',
      time: '08:00:00',
      status: 'hadir',
      lokasi: 'Kantor Utama',
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      karyawan: { nama: 'Jane Smith', email: 'jane@afms.com' },
      activity: 'Clock In',
      time: '08:15:00',
      status: 'terlambat',
      lokasi: 'Kantor Utama',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    },
    {
      id: 3,
      karyawan: { nama: 'Bob Johnson', email: 'bob@afms.com' },
      activity: 'Clock Out',
      time: '17:00:00',
      status: 'hadir',
      lokasi: 'Kantor Utama',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ],
  cabang_stats: [
    {
      cabang_id: 1,
      nama_cabang: 'Kantor Utama',
      total_karyawan: 15,
      hadir: 12,
      terlambat: 2,
      tidak_hadir: 1
    },
    {
      cabang_id: 2,
      nama_cabang: 'Cabang Jakarta',
      total_karyawan: 10,
      hadir: 8,
      terlambat: 1,
      tidak_hadir: 1
    }
  ],
  hourly_attendance: [
    { hour: '07:00', count: 2 },
    { hour: '08:00', count: 15 },
    { hour: '09:00', count: 5 },
    { hour: '10:00', count: 2 },
    { hour: '11:00', count: 1 }
  ]
};

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { type = 'dashboard' } = req.query;
        
        switch (type) {
          case 'dashboard':
            return res.status(200).json({
              success: true,
              data: {
                today_stats: mockMonitoringData.today_stats,
                recent_activities: mockMonitoringData.recent_activities.slice(0, 10),
                cabang_stats: mockMonitoringData.cabang_stats
              }
            });
            
          case 'realtime':
            // Real-time attendance data
            return res.status(200).json({
              success: true,
              data: {
                recent_activities: mockMonitoringData.recent_activities,
                hourly_attendance: mockMonitoringData.hourly_attendance,
                last_updated: new Date().toISOString()
              }
            });
            
          case 'stats':
            // Detailed statistics
            return res.status(200).json({
              success: true,
              data: mockMonitoringData
            });
            
          default:
            return res.status(400).json({
              message: 'Invalid type parameter. Use: dashboard, realtime, or stats'
            });
        }

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Monitoring API error:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

export default withAdminAuth(handler);