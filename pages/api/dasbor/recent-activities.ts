import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock data for demonstration
const generateMockActivities = (limit: number) => {
  const activities = [];
  const types = ['masuk', 'keluar', 'terlambat', 'alpha'] as const;
  const names = [
    'John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson',
    'Diana Prince', 'Edward Norton', 'Fiona Green', 'George Lucas', 'Helen Troy'
  ];
  const keteranganMap = {
    masuk: ['Masuk tepat waktu', 'Check-in berhasil', 'Hadir sesuai jadwal'],
    keluar: ['Pulang tepat waktu', 'Check-out berhasil', 'Selesai jam kerja'],
    terlambat: ['Terlambat 15 menit', 'Terlambat 30 menit', 'Terlambat karena macet', 'Terlambat 45 menit'],
    alpha: ['Tidak hadir tanpa keterangan', 'Tidak ada konfirmasi', 'Absen tanpa izin']
  };

  const now = new Date();
  
  for (let i = 0; i < limit; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const keteranganOptions = keteranganMap[type];
    const keterangan = keteranganOptions[Math.floor(Math.random() * keteranganOptions.length)];
    
    // Generate time within the last 8 hours
    const timeOffset = Math.floor(Math.random() * 8 * 60 * 60 * 1000); // 8 hours in milliseconds
    const activityTime = new Date(now.getTime() - timeOffset);
    
    let waktu: string;
    if (type === 'alpha') {
      waktu = '-';
    } else {
      waktu = activityTime.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    activities.push({
      id: i + 1,
      type,
      karyawan_nama: name,
      waktu,
      keterangan,
      created_at: activityTime.toISOString(),
    });
  }

  // Sort by most recent first
  return activities.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);
    
    // Validate limit parameter
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit parameter. Must be a number between 1 and 50',
      });
    }

    // In a real application, you would fetch this data from your database
    // For now, we'll return mock data
    const activities = generateMockActivities(limitNum);

    return res.status(200).json({
      success: true,
      message: 'Aktivitas terbaru berhasil diambil',
      data: activities,
    });
  } catch (error: any) {
    console.error('Recent activities error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message,
    });
  }
}

export default withAuth(handler);