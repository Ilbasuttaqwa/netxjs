import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAuth } from '../../../lib/auth-middleware';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Hanya admin yang bisa menghapus semua data fingerprint
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  try {
    // Mulai transaksi untuk memastikan konsistensi data
    await prisma.$transaction(async (tx) => {
      // Hapus semua data attendance deduplication
      const deletedDedup = await tx.attendanceDeduplication.deleteMany({});
      console.log(`Deleted ${deletedDedup.count} attendance deduplication records`);

      // Hapus semua data fingerprint attendance
      const deletedFingerprint = await tx.fingerprintAttendance.deleteMany({});
      console.log(`Deleted ${deletedFingerprint.count} fingerprint attendance records`);

      // Reset device_user_id di tabel users (hapus mapping fingerprint)
      const updatedUsers = await tx.user.updateMany({
        where: {
          device_user_id: {
            not: null
          }
        },
        data: {
          device_user_id: null
        }
      });
      console.log(`Reset device_user_id for ${updatedUsers.count} users`);

      // Reset last_sync untuk semua device
      const updatedDevices = await tx.device.updateMany({
        data: {
          last_sync: null
        }
      });
      console.log(`Reset last_sync for ${updatedDevices.count} devices`);
    });

    res.status(200).json({
      success: true,
      message: 'Semua data fingerprint berhasil dihapus',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing fingerprint data:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus data fingerprint',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAuth(handler);