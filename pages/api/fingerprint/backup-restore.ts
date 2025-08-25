import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAuth } from '../../../lib/auth-middleware';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    role: string;
    email: string;
    cabang_id?: string;
  };
}

interface FingerprintTemplate {
  device_user_id: string;
  user_id: string;
  template_data: string;
  template_quality: number;
  finger_index: number;
  created_at: string;
}

interface BackupData {
  device_id: string;
  backup_timestamp: string;
  templates: FingerprintTemplate[];
  metadata: {
    total_templates: number;
    device_info: {
      nama: string;
      tipe: string;
      firmware_version: string;
      cabang: string;
    };
  };
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'POST' && req.query.action === 'backup') {
    return handleBackupTemplates(req, res);
  } else if (req.method === 'POST' && req.query.action === 'restore') {
    return handleRestoreTemplates(req, res);
  } else if (req.method === 'GET') {
    return handleGetBackupList(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleBackupTemplates(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    // Find the device
    const device = await prisma.device.findUnique({
      where: { device_id: device_id },
      include: {
        cabang: {
          select: {
            nama_cabang: true,
            kode_cabang: true
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Get all users with fingerprint data for this device's branch
    const users = await prisma.user.findMany({
      where: {
        cabang_id: device.cabang_id,
        device_user_id: {
          not: null
        }
      },
      select: {
        id: true,
        device_user_id: true,
        nama: true,
        email: true
      }
    });

    // Mock fingerprint templates (in real implementation, this would come from the actual device)
    const templates: FingerprintTemplate[] = users.map(user => ({
      device_user_id: user.device_user_id!,
      user_id: user.id,
      template_data: `template_${user.device_user_id}_${Date.now()}`, // Mock template data
      template_quality: Math.floor(Math.random() * 40) + 60, // Quality between 60-100
      finger_index: Math.floor(Math.random() * 10), // Finger index 0-9
      created_at: new Date().toISOString()
    }));

    const backupData: BackupData = {
      device_id: device_id,
      backup_timestamp: new Date().toISOString(),
      templates: templates,
      metadata: {
        total_templates: templates.length,
        device_info: {
          nama: device.nama,
          tipe: device.tipe,
          firmware_version: device.firmware_version || 'Unknown',
          cabang: device.cabang.nama_cabang
        }
      }
    };

    // Store backup in database (you might want to store this in a file system or cloud storage)
    const backup = await prisma.fingerprintBackup.create({
      data: {
        device_id: device.id,
        backup_name: `Backup_${device.nama}_${new Date().toISOString().split('T')[0]}`,
        backup_data: JSON.stringify(backupData),
        template_count: templates.length,
        created_by: req.user!.id,
        created_at: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: `Successfully created backup with ${templates.length} templates`,
      data: {
        backup_id: backup.id,
        backup_name: backup.backup_name,
        template_count: templates.length,
        device_id: device_id,
        created_at: backup.created_at
      }
    });

  } catch (error) {
    console.error('Error creating fingerprint backup:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal membuat backup template sidik jari',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleRestoreTemplates(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { backup_id, target_device_id } = req.body;

    if (!backup_id || !target_device_id) {
      return res.status(400).json({
        success: false,
        message: 'Backup ID and target device ID are required'
      });
    }

    // Find the backup
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
        message: 'Backup not found'
      });
    }

    // Find the target device
    const targetDevice = await prisma.device.findUnique({
      where: { device_id: target_device_id },
      include: {
        cabang: true
      }
    });

    if (!targetDevice) {
      return res.status(404).json({
        success: false,
        message: 'Target device not found'
      });
    }

    // Parse backup data
    const backupData: BackupData = JSON.parse(backup.backup_data);

    // Validate users exist in target device's branch
    const validTemplates = [];
    const errors = [];

    for (const template of backupData.templates) {
      try {
        const user = await prisma.user.findFirst({
          where: {
            device_user_id: template.device_user_id,
            cabang_id: targetDevice.cabang_id
          }
        });

        if (user) {
          validTemplates.push({
            ...template,
            target_user_id: user.id
          });
        } else {
          errors.push({
            device_user_id: template.device_user_id,
            error: 'User not found in target branch'
          });
        }
      } catch (error) {
        errors.push({
          device_user_id: template.device_user_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // In a real implementation, you would send these templates to the actual device
    // For now, we'll just log the restore operation
    console.log(`Restoring ${validTemplates.length} templates to device ${target_device_id}`);

    // Create restore log
    await prisma.fingerprintRestore.create({
      data: {
        backup_id: backup.id,
        target_device_id: targetDevice.id,
        restored_template_count: validTemplates.length,
        error_count: errors.length,
        restore_data: JSON.stringify({
          valid_templates: validTemplates,
          errors: errors
        }),
        restored_by: req.user!.id,
        restored_at: new Date()
      }
    });

    // Update target device last_sync
    await prisma.device.update({
      where: { id: targetDevice.id },
      data: {
        last_sync: new Date(),
        updated_at: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: `Successfully restored ${validTemplates.length} templates to device ${target_device_id}`,
      data: {
        backup_name: backup.backup_name,
        source_device: backup.device.nama,
        target_device: targetDevice.nama,
        restored_count: validTemplates.length,
        error_count: errors.length,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error restoring fingerprint templates:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan restore template sidik jari',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGetBackupList(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { device_id } = req.query;

    let whereClause: any = {};
    
    if (device_id) {
      const device = await prisma.device.findUnique({
        where: { device_id: device_id as string }
      });
      if (device) {
        whereClause.device_id = device.id;
      }
    }

    const backups = await prisma.fingerprintBackup.findMany({
      where: whereClause,
      include: {
        device: {
          include: {
            cabang: {
              select: {
                nama_cabang: true,
                kode_cabang: true
              }
            }
          }
        },
        creator: {
          select: {
            nama: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const backupList = backups.map(backup => ({
      id: backup.id,
      backup_name: backup.backup_name,
      device: {
        device_id: backup.device.device_id,
        nama: backup.device.nama,
        cabang: backup.device.cabang.nama_cabang
      },
      template_count: backup.template_count,
      created_by: backup.creator.nama,
      created_at: backup.created_at,
      file_size: backup.backup_data.length // Approximate size
    }));

    res.status(200).json({
      success: true,
      data: backupList
    });

  } catch (error) {
    console.error('Error fetching backup list:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar backup',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}


export default withAuth(handler);