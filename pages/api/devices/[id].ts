import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (!id || isNaN(parseInt(id.toString()))) {
    return res.status(400).json({
      success: false,
      message: 'Invalid device ID'
    });
  }
  
  const deviceId = parseInt(id.toString());
  
  try {
    switch (req.method) {
      case 'GET':
        const device = await prisma.device.findUnique({
          where: { id: deviceId },
          include: {
            cabang: {
              select: {
                id: true,
                nama_cabang: true,
                alamat_cabang: true,
                telepon_cabang: true
              }
            },
            attendance: {
              select: {
                id: true,
                attendance_time: true,
                attendance_type: true,
                user: {
                  select: {
                    id: true,
                    nama_pegawai: true
                  }
                }
              },
              orderBy: { attendance_time: 'desc' },
              take: 10 // Last 10 attendance records
            }
          }
        });
        
        if (!device) {
          return res.status(404).json({
            success: false,
            message: 'Perangkat tidak ditemukan'
          });
        }
        
        return res.status(200).json({
          success: true,
          data: device
        });

      case 'PUT':
        const { nama, tipe, cabang_id, ip_address, port, status, lokasi, keterangan, firmware_version } = req.body;
        
        // Check if device exists
        const existingDevice = await prisma.device.findUnique({
          where: { id: deviceId }
        });
        
        if (!existingDevice) {
          return res.status(404).json({
            success: false,
            message: 'Device not found'
          });
        }
        
        // Verify cabang exists if cabang_id is provided
        if (cabang_id) {
          const cabang = await prisma.cabang.findUnique({
            where: { id: parseInt(cabang_id) }
          });
          
          if (!cabang) {
            return res.status(400).json({
              success: false,
              message: 'Invalid cabang_id'
            });
          }
        }
        
        const updatedDevice = await prisma.device.update({
          where: { id: deviceId },
          data: {
            ...(nama && { nama }),
            ...(tipe && { tipe }),
            ...(cabang_id && { cabang_id: parseInt(cabang_id) }),
            ...(ip_address !== undefined && { ip_address }),
            ...(port !== undefined && { port: port ? parseInt(port) : null }),
            ...(status && { status }),
            ...(lokasi !== undefined && { lokasi }),
            ...(keterangan !== undefined && { keterangan }),
            ...(firmware_version !== undefined && { firmware_version })
          },
          include: {
            cabang: {
              select: {
                id: true,
                nama_cabang: true,
                alamat_cabang: true
              }
            }
          }
        });
        
        return res.status(200).json({
          success: true,
          message: 'Perangkat berhasil diperbarui',
          data: updatedDevice
        });

      case 'DELETE':
        // Check if device exists
        const deviceToDelete = await prisma.device.findUnique({
          where: { id: deviceId }
        });
        
        if (!deviceToDelete) {
          return res.status(404).json({
            success: false,
            message: 'Device not found'
          });
        }
        
        // Check if device has attendance records
        const attendanceCount = await prisma.fingerprintAttendance.count({
          where: { device_id: deviceToDelete.device_id }
        });
        
        if (attendanceCount > 0) {
          // Soft delete - just mark as inactive
          await prisma.device.update({
            where: { id: deviceId },
            data: { status: 'nonaktif' }
          });
          
          return res.status(200).json({
            success: true,
            message: 'Perangkat berhasil dinonaktifkan (memiliki catatan kehadiran)'
          });
        } else {
          // Hard delete if no attendance records
          await prisma.device.delete({
            where: { id: deviceId }
          });
          
          return res.status(200).json({
            success: true,
            message: 'Perangkat berhasil dihapus'
          });
        }

      default:
        return res.status(405).json({ 
          success: false,
          message: 'Method not allowed' 
        });
    }

  } catch (error) {
    console.error('Device API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAdminAuth(handler);