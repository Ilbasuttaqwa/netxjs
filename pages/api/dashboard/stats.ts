import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration
const mockStats = {
  admin: {
    totalKaryawan: 150,
    totalCabang: 5,
    kehadiranHariIni: 142,
    keterlambatanHariIni: 8,
    alphaHariIni: 0,
    persentaseKehadiran: 94.7
  },
  user: {
    kehadiranHariIni: 1,
    keterlambatanHariIni: 0,
    jamMasuk: '08:00',
    jamKeluar: '17:00',
    statusHariIni: 'Hadir'
  }
};

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const userRole = req.user?.role;
    
    if (userRole === 'admin') {
      return res.status(200).json({
        success: true,
        data: mockStats.admin
      });
    } else {
      return res.status(200).json({
        success: true,
        data: mockStats.user
      });
    }

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

export default withAuth(handler);