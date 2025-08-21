import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

// Mock fingerprint devices data
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

// Simulate device status changes
const updateDeviceStatus = () => {
  mockDevices.forEach(device => {
    // Randomly change status for simulation
    if (Math.random() < 0.1) { // 10% chance to change status
      device.status = device.status === 'online' ? 'offline' : 'online';
      device.updated_at = new Date().toISOString();
      
      if (device.status === 'online') {
        device.last_sync = new Date().toISOString();
        // Simulate new records
        device.total_records += Math.floor(Math.random() * 10) + 1;
      }
    }
  });
};

// Update device status every 30 seconds
setInterval(updateDeviceStatus, 30000);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        // Get all devices
        return res.status(200).json({
          success: true,
          message: 'Devices retrieved successfully',
          data: mockDevices,
        });

      case 'POST':
        // This endpoint is for bulk operations or device management
        const { action, device_ids } = req.body;
        
        if (action === 'bulk_sync' && device_ids) {
          // Simulate bulk sync
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const results = device_ids.map((deviceId: string) => {
            const device = mockDevices.find(d => d.device_id === deviceId);
            if (device) {
              device.last_sync = new Date().toISOString();
              device.status = 'online';
              device.total_records += Math.floor(Math.random() * 20) + 5;
            }
            return { device_id: deviceId, success: !!device };
          });
          
          return res.status(200).json({
            success: true,
            message: 'Bulk sync completed',
            data: results,
          });
        }
        
        return res.status(400).json({
          success: false,
          message: 'Invalid action or missing parameters',
        });

      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed',
        });
    }
  } catch (error: any) {
    console.error('Monitoring devices API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
}

export default withAdminAuth(handler);