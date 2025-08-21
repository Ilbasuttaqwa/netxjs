import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../../../lib/auth-middleware';

// Import mock devices from the main devices endpoint
const mockDevices = [
  {
    id: 1,
    device_id: 'FP001',
    device_name: 'Fingerprint Scanner - Kantor Pusat',
    ip_address: '192.168.1.100',
    port: 4370,
    status: 'online',
    last_sync: '2024-01-15T10:30:00.000Z',
    total_users: 150,
    total_records: 2500,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-15T10:30:00.000Z',
  },
  {
    id: 2,
    device_id: 'FP002',
    device_name: 'Fingerprint Scanner - Cabang Jakarta',
    ip_address: '192.168.1.101',
    port: 4370,
    status: 'offline',
    last_sync: '2024-01-14T16:45:00.000Z',
    total_users: 75,
    total_records: 1200,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-14T16:45:00.000Z',
  },
  {
    id: 3,
    device_id: 'FP003',
    device_name: 'Fingerprint Scanner - Cabang Surabaya',
    ip_address: '192.168.1.102',
    port: 4370,
    status: 'online',
    last_sync: '2024-01-15T09:15:00.000Z',
    total_users: 90,
    total_records: 1800,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-15T09:15:00.000Z',
  },
  {
    id: 4,
    device_id: 'FP004',
    device_name: 'Fingerprint Scanner - Cabang Bandung',
    ip_address: '192.168.1.103',
    port: 4370,
    status: 'online',
    last_sync: '2024-01-15T11:00:00.000Z',
    total_users: 60,
    total_records: 980,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-15T11:00:00.000Z',
  },
];

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const { deviceId } = req.query;

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required',
      });
    }

    const device = mockDevices.find(d => d.device_id === deviceId);
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found',
      });
    }

    // Add some additional status information
    const deviceStatus = {
      ...device,
      health_score: device.status === 'online' ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30) + 10, // 80-100 for online, 10-40 for offline
      uptime: device.status === 'online' ? Math.floor(Math.random() * 168) + 1 : 0, // 1-168 hours for online devices
      last_heartbeat: device.status === 'online' ? new Date().toISOString() : device.updated_at,
      connection_quality: device.status === 'online' ? ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)] : 'poor',
      firmware_version: '2.1.4',
      memory_usage: Math.floor(Math.random() * 40) + 30, // 30-70%
      storage_usage: Math.floor(Math.random() * 60) + 20, // 20-80%
    };
    
    return res.status(200).json({
      success: true,
      message: 'Device status retrieved successfully',
      data: deviceStatus,
    });

  } catch (error: any) {
    console.error('Device status API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);