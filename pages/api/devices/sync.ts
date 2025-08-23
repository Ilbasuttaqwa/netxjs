import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SyncRequest {
  device_id: string;
  status: 'online' | 'offline' | 'error';
  firmware_version?: string;
  last_heartbeat?: string;
  error_message?: string;
  employee_count?: number;
  storage_usage?: number;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'POST':
        const { device_id, status, firmware_version, last_heartbeat, error_message, employee_count, storage_usage } = req.body as SyncRequest;
        
        if (!device_id || !status) {
          return res.status(400).json({
            success: false,
            message: 'Required fields: device_id, status'
          });
        }
        
        // Find device by device_id
        const device = await prisma.device.findFirst({
          where: { device_id }
        });
        
        if (!device) {
          return res.status(404).json({
            success: false,
            message: 'Device not found'
          });
        }
        
        // Update device status and sync information
        const updatedDevice = await prisma.device.update({
          where: { id: device.id },
          data: {
            status: status === 'online' ? 'aktif' : status === 'offline' ? 'nonaktif' : 'maintenance',
            last_sync: new Date(),
            ...(firmware_version && { firmware_version }),
            ...(error_message && { keterangan: error_message })
          }
        });
        
        // Create or update device status log
        await prisma.deviceStatusLog.create({
          data: {
            device_id: device.id,
            status,
            firmware_version: firmware_version || device.firmware_version,
            error_message,
            employee_count: employee_count || 0,
            storage_usage: storage_usage || 0,
            timestamp: new Date()
          }
        });
        
        return res.status(200).json({
          success: true,
          message: 'Device sync successful',
          data: {
            device_id: updatedDevice.device_id,
            status: updatedDevice.status,
            last_sync: updatedDevice.last_sync
          }
        });

      case 'GET':
        // Get sync status for all devices or specific device
        const { device_id: queryDeviceId, hours = 24 } = req.query;
        
        const hoursNum = parseInt(hours.toString());
        const since = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
        
        let whereClause: any = {
          timestamp: {
            gte: since
          }
        };
        
        if (queryDeviceId) {
          const device = await prisma.device.findFirst({
            where: { device_id: queryDeviceId.toString() }
          });
          
          if (!device) {
            return res.status(404).json({
              success: false,
              message: 'Device not found'
            });
          }
          
          whereClause.device_id = device.id;
        }
        
        const statusLogs = await prisma.deviceStatusLog.findMany({
          where: whereClause,
          include: {
            device: {
              select: {
                device_id: true,
                nama: true,
                tipe: true,
                cabang: {
                  select: {
                    nama: true
                  }
                }
              }
            }
          },
          orderBy: { timestamp: 'desc' }
        });
        
        // Group by device and get latest status
        const deviceStatuses = statusLogs.reduce((acc: any, log: any) => {
          const deviceId = log.device.device_id;
          if (!acc[deviceId]) {
            acc[deviceId] = {
              device_id: deviceId,
              nama: log.device.nama,
              tipe: log.device.tipe,
              cabang: log.device.cabang.nama,
              latest_status: log.status,
              latest_sync: log.timestamp,
              firmware_version: log.firmware_version,
              employee_count: log.employee_count,
              storage_usage: log.storage_usage,
              error_message: log.error_message,
              sync_history: []
            };
          }
          
          acc[deviceId].sync_history.push({
            status: log.status,
            timestamp: log.timestamp,
            error_message: log.error_message
          });
          
          return acc;
        }, {});
        
        return res.status(200).json({
          success: true,
          data: Object.values(deviceStatuses)
        });

      default:
        return res.status(405).json({ 
          success: false,
          message: 'Method not allowed' 
        });
    }

  } catch (error) {
    console.error('Device sync API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAdminAuth(handler);