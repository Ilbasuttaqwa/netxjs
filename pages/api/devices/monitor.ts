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

interface DeviceMonitorData {
  device_id: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  last_ping: Date;
  firmware_version?: string;
  employee_count?: number;
  storage_usage?: number;
  temperature?: number;
  memory_usage?: number;
  error_message?: string;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetMonitorData(req, res);
  } else if (req.method === 'POST') {
    return handleUpdateDeviceStatus(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetMonitorData(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { cabang_id } = req.query;
    
    // Build where clause based on user role and cabang_id
    let whereClause: any = {};
    
    if (req.user?.role !== 'admin') {
      // Non-admin users can only see devices from their branch
      whereClause.cabang_id = parseInt(req.user?.cabang_id || '0');
    } else if (cabang_id) {
      // Admin can filter by specific branch
      whereClause.cabang_id = parseInt(cabang_id as string);
    }

    const devices = await prisma.device.findMany({
      where: whereClause,
      include: {
        cabang: {
          select: {
            id: true,
            nama_cabang: true,
            kode_cabang: true
          }
        },
        statusLogs: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        },
        attendance: {
          where: {
            attendance_time: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          select: {
            id: true,
            attendance_time: true,
            user_id: true
          }
        }
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    // Calculate device statistics
    const deviceStats = devices.map(device => {
      const latestLog = device.statusLogs[0];
      const todayAttendance = device.attendance.filter(att => {
        const today = new Date();
        const attDate = new Date(att.attendance_time);
        return attDate.toDateString() === today.toDateString();
      });

      // Determine device status based on last sync and logs
      let status: 'online' | 'offline' | 'error' | 'maintenance' = 'offline';
      
      if (device.last_sync) {
        const lastSyncTime = new Date(device.last_sync);
        const timeDiff = Date.now() - lastSyncTime.getTime();
        const minutesDiff = timeDiff / (1000 * 60);
        
        if (minutesDiff <= 5) {
          status = 'online';
        } else if (minutesDiff <= 30) {
          status = latestLog?.error_message ? 'error' : 'offline';
        } else {
          status = 'offline';
        }
      }

      return {
        id: device.id,
        device_id: device.device_id,
        nama: device.nama,
        tipe: device.tipe,
        status: status,
        cabang: device.cabang,
        ip_address: device.ip_address,
        port: device.port,
        lokasi: device.lokasi,
        last_sync: device.last_sync,
        firmware_version: device.firmware_version,
        employee_count: latestLog?.employee_count || 0,
        storage_usage: latestLog?.storage_usage || 0,
        temperature: latestLog ? Math.floor(Math.random() * 40) + 30 : null, // Mock temperature
        memory_usage: latestLog ? Math.floor(Math.random() * 50) + 30 : null, // Mock memory usage
        error_message: latestLog?.error_message,
        today_attendance_count: todayAttendance.length,
        total_attendance_count: device.attendance.length,
        created_at: device.created_at,
        updated_at: device.updated_at
      };
    });

    // Calculate summary statistics
    const summary = {
      total_devices: devices.length,
      online_devices: deviceStats.filter(d => d.status === 'online').length,
      offline_devices: deviceStats.filter(d => d.status === 'offline').length,
      error_devices: deviceStats.filter(d => d.status === 'error').length,
      maintenance_devices: deviceStats.filter(d => d.status === 'maintenance').length,
      total_attendance_today: deviceStats.reduce((sum, d) => sum + d.today_attendance_count, 0),
      last_updated: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: {
        devices: deviceStats,
        summary: summary
      }
    });

  } catch (error) {
    console.error('Error fetching device monitor data:', error);
    
    // Provide fallback data in case of database errors
    const fallbackData = {
      devices: [],
      summary: {
        total_devices: 0,
        online_devices: 0,
        offline_devices: 0,
        error_devices: 0,
        maintenance_devices: 0,
        total_attendance_today: 0,
        last_updated: new Date().toISOString()
      }
    };
    
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data monitoring device',
      error: error instanceof Error ? error.message : 'Unknown error',
      data: fallbackData // Provide fallback data
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function handleUpdateDeviceStatus(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { device_id, status, firmware_version, employee_count, storage_usage, error_message } = req.body;

    if (!device_id) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    // Find the device
    const device = await prisma.device.findUnique({
      where: { device_id: device_id }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Update device status and last_sync
    const updatedDevice = await prisma.device.update({
      where: { device_id: device_id },
      data: {
        status: status || device.status,
        last_sync: new Date(),
        firmware_version: firmware_version || device.firmware_version,
        updated_at: new Date()
      }
    });

    // Create status log entry
    await prisma.deviceStatusLog.create({
      data: {
        device_id: device.id,
        status: status || device.status,
        firmware_version: firmware_version || device.firmware_version,
        employee_count: employee_count || 0,
        storage_usage: storage_usage || 0,
        error_message: error_message || null,
        timestamp: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: 'Device status updated successfully',
      data: updatedDevice
    });

  } catch (error) {
    console.error('Error updating device status:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate status device',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAuth(handler);