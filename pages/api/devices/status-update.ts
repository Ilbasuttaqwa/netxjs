import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DeviceStatusUpdate {
  device_id: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  firmware_version?: string;
  employee_count?: number;
  storage_usage?: number;
  memory_usage?: number;
  temperature?: number;
  error_message?: string;
  timestamp?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow CORS for device communication
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const updateData: DeviceStatusUpdate = req.body;
    
    if (!updateData.device_id) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    // Find the device
    const device = await prisma.device.findUnique({
      where: { device_id: updateData.device_id }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Update device status and last_sync
    const updatedDevice = await prisma.device.update({
      where: { device_id: updateData.device_id },
      data: {
        status: updateData.status || device.status,
        last_sync: new Date(),
        firmware_version: updateData.firmware_version || device.firmware_version,
        updated_at: new Date()
      }
    });

    // Create status log entry
    await prisma.deviceStatusLog.create({
      data: {
        device_id: device.id,
        status: updateData.status || device.status,
        firmware_version: updateData.firmware_version || device.firmware_version,
        employee_count: updateData.employee_count || 0,
        storage_usage: updateData.storage_usage || 0,
        error_message: updateData.error_message || null,
        timestamp: updateData.timestamp ? new Date(updateData.timestamp) : new Date()
      }
    });

    // Log the status update for debugging
    console.log(`Device ${updateData.device_id} status updated to ${updateData.status}`);

    res.status(200).json({
      success: true,
      message: 'Device status updated successfully',
      data: {
        device_id: updatedDevice.device_id,
        status: updatedDevice.status,
        last_sync: updatedDevice.last_sync
      }
    });

  } catch (error) {
    console.error('Error updating device status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

