import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BulkSyncRequest {
  device_ids: string[];
  operation: 'sync' | 'restart' | 'update_firmware' | 'test_connection';
  firmware_version?: string;
}

interface BulkUpdateRequest {
  device_ids: string[];
  updates: {
    status?: 'aktif' | 'nonaktif' | 'maintenance';
    lokasi?: string;
    keterangan?: string;
    firmware_version?: string;
  };
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'POST':
        const { action } = req.body;
        
        switch (action) {
          case 'bulk_sync':
            return await handleBulkSync(req, res);
          case 'bulk_update':
            return await handleBulkUpdate(req, res);
          case 'bulk_test':
            return await handleBulkTest(req, res);
          case 'bulk_restart':
            return await handleBulkRestart(req, res);
          default:
            return res.status(400).json({
              success: false,
              message: 'Invalid action. Supported actions: bulk_sync, bulk_update, bulk_test, bulk_restart'
            });
        }

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Bulk operations API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function handleBulkSync(req: AuthenticatedRequest, res: NextApiResponse) {
  const { device_ids } = req.body as BulkSyncRequest;
  
  if (!device_ids || !Array.isArray(device_ids) || device_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'device_ids array is required'
    });
  }

  const results = [];
  
  for (const deviceId of device_ids) {
    try {
      // Find device
      const device = await prisma.device.findFirst({
        where: { device_id: deviceId },
        include: { cabang: true }
      });
      
      if (!device) {
        results.push({
          device_id: deviceId,
          success: false,
          message: 'Device not found'
        });
        continue;
      }

      // Simulate sync operation (in real implementation, this would connect to actual device)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Update device sync status
      const updatedDevice = await prisma.device.update({
        where: { id: device.id },
        data: {
          last_sync: new Date(),
          status: 'aktif'
        }
      });
      
      // Create status log
      await prisma.deviceStatusLog.create({
        data: {
          device_id: device.id,
          status: 'online',
          firmware_version: device.firmware_version,
          storage_usage: Math.floor(Math.random() * 40) + 30,
          timestamp: new Date()
        }
      });
      
      results.push({
        device_id: deviceId,
        success: true,
        message: 'Sync completed successfully',
        last_sync: updatedDevice.last_sync
      });
      
    } catch (error: any) {
      results.push({
        device_id: deviceId,
        success: false,
        message: error.message || 'Sync failed'
      });
    }
  }
  
  return res.status(200).json({
    success: true,
    message: `Bulk sync completed for ${results.filter(r => r.success).length}/${device_ids.length} devices`,
    data: results
  });
}

async function handleBulkUpdate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { device_ids, updates } = req.body as BulkUpdateRequest;
  
  if (!device_ids || !Array.isArray(device_ids) || device_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'device_ids array is required'
    });
  }
  
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'updates object is required'
    });
  }

  const results = [];
  
  for (const deviceId of device_ids) {
    try {
      const device = await prisma.device.findFirst({
        where: { device_id: deviceId }
      });
      
      if (!device) {
        results.push({
          device_id: deviceId,
          success: false,
          message: 'Device not found'
        });
        continue;
      }

      const updatedDevice = await prisma.device.update({
        where: { id: device.id },
        data: {
          ...updates,
          updated_at: new Date()
        }
      });
      
      results.push({
        device_id: deviceId,
        success: true,
        message: 'Device updated successfully'
      });
      
    } catch (error: any) {
      results.push({
        device_id: deviceId,
        success: false,
        message: error.message || 'Update failed'
      });
    }
  }
  
  return res.status(200).json({
    success: true,
    message: `Bulk update completed for ${results.filter(r => r.success).length}/${device_ids.length} devices`,
    data: results
  });
}

async function handleBulkTest(req: AuthenticatedRequest, res: NextApiResponse) {
  const { device_ids } = req.body as BulkSyncRequest;
  
  if (!device_ids || !Array.isArray(device_ids) || device_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'device_ids array is required'
    });
  }

  const results = [];
  
  for (const deviceId of device_ids) {
    try {
      const device = await prisma.device.findFirst({
        where: { device_id: deviceId },
        include: { cabang: true }
      });
      
      if (!device) {
        results.push({
          device_id: deviceId,
          success: false,
          message: 'Device not found',
          connection_status: 'unknown'
        });
        continue;
      }

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));
      
      const isOnline = Math.random() > 0.2; // 80% success rate
      const responseTime = Math.floor(Math.random() * 200) + 50;
      
      // Update device status based on test result
      await prisma.device.update({
        where: { id: device.id },
        data: {
          status: isOnline ? 'aktif' : 'nonaktif',
          last_sync: isOnline ? new Date() : device.last_sync
        }
      });
      
      // Create status log
      await prisma.deviceStatusLog.create({
        data: {
          device_id: device.id,
          status: isOnline ? 'online' : 'offline',
          firmware_version: device.firmware_version,
          error_message: isOnline ? null : 'Connection timeout',
          timestamp: new Date()
        }
      });
      
      results.push({
        device_id: deviceId,
        success: isOnline,
        message: isOnline ? 'Connection test successful' : 'Connection test failed',
        connection_status: isOnline ? 'online' : 'offline',
        response_time: isOnline ? responseTime : null
      });
      
    } catch (error: any) {
      results.push({
        device_id: deviceId,
        success: false,
        message: error.message || 'Test failed',
        connection_status: 'error'
      });
    }
  }
  
  return res.status(200).json({
    success: true,
    message: `Connection test completed for ${device_ids.length} devices`,
    data: results
  });
}

async function handleBulkRestart(req: AuthenticatedRequest, res: NextApiResponse) {
  const { device_ids } = req.body as BulkSyncRequest;
  
  if (!device_ids || !Array.isArray(device_ids) || device_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'device_ids array is required'
    });
  }

  const results = [];
  
  for (const deviceId of device_ids) {
    try {
      const device = await prisma.device.findFirst({
        where: { device_id: deviceId }
      });
      
      if (!device) {
        results.push({
          device_id: deviceId,
          success: false,
          message: 'Device not found'
        });
        continue;
      }

      // Simulate restart operation
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      
      // Update device status
      await prisma.device.update({
        where: { id: device.id },
        data: {
          status: 'aktif',
          last_sync: new Date()
        }
      });
      
      // Create status log
      await prisma.deviceStatusLog.create({
        data: {
          device_id: device.id,
          status: 'online',
          firmware_version: device.firmware_version,
          error_message: 'Device restarted successfully',
          timestamp: new Date()
        }
      });
      
      results.push({
        device_id: deviceId,
        success: true,
        message: 'Device restarted successfully'
      });
      
    } catch (error: any) {
      results.push({
        device_id: deviceId,
        success: false,
        message: error.message || 'Restart failed'
      });
    }
  }
  
  return res.status(200).json({
    success: true,
    message: `Bulk restart completed for ${results.filter(r => r.success).length}/${device_ids.length} devices`,
    data: results
  });
}

export default withAdminAuth(handler);