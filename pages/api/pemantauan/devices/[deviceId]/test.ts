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
  if (req.method !== 'POST') {
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

    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
    
    // Simulate connection success/failure (90% success rate)
    const connectionSuccess = Math.random() < 0.9;
    
    if (connectionSuccess) {
      device.status = 'online';
      device.updated_at = new Date().toISOString();
      
      return res.status(200).json({
        success: true,
        message: 'Connection test successful',
        data: {
          device_id: device.device_id,
          device_name: device.device_name,
          ip_address: device.ip_address,
          port: device.port,
          status: 'online',
          response_time: Math.floor(Math.random() * 100) + 50, // 50-150ms
          last_tested: new Date().toISOString(),
        },
      });
    } else {
      device.status = 'offline';
      device.updated_at = new Date().toISOString();
      
      return res.status(200).json({
        success: false,
        message: 'Connection test failed - Device unreachable',
        data: {
          device_id: device.device_id,
          device_name: device.device_name,
          ip_address: device.ip_address,
          port: device.port,
          status: 'offline',
          error: 'Connection timeout',
          last_tested: new Date().toISOString(),
        },
      });
    }

  } catch (error: any) {
    console.error('Device test connection API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);