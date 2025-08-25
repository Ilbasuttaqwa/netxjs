import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAuth } from '../../../../lib/auth-middleware';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    role: string;
    email: string;
    cabang_id?: string;
  };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'DELETE') {
    return handleDeleteBackup(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleDeleteBackup(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { backup_id } = req.query;
    
    if (!backup_id || typeof backup_id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'ID backup tidak valid'
      });
    }

    // Cek apakah backup exists
    const backup = await prisma.fingerprintBackup.findUnique({
      where: { id: parseInt(backup_id) },
      include: {
        device: {
          include: {
            cabang: true
          }
        }
      }
    });

    if (!backup) {
      return res.status(404).json({
        success: false,
        message: 'Backup tidak ditemukan'
      });
    }

    // Hapus backup dari database
    await prisma.fingerprintBackup.delete({
      where: { id: parseInt(backup_id) }
    });

    res.status(200).json({
      success: true,
      message: `Backup "${backup.backup_name}" berhasil dihapus`,
      data: {
        deleted_backup: {
          id: backup.id,
          backup_name: backup.backup_name,
          device_name: backup.device.nama
        }
      }
    });

  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal menghapus backup',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAuth(handler);