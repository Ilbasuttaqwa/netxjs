import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { ApiResponse } from '../../../types';

interface ApiHealthCheck {
  status: 'healthy' | 'unhealthy';
  api_version: string;
  uptime: number;
  memory_usage: {
    used: number;
    total: number;
    percentage: number;
  };
  endpoints: {
    fingerprint: boolean;
    devices: boolean;
    attendance: boolean;
    auth: boolean;
  };
  response_time: number;
  timestamp: string;
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse<ApiResponse<ApiHealthCheck>>) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method tidak diizinkan'
    });
  }

  const startTime = Date.now();
  
  try {
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    // Get uptime
    const uptime = process.uptime();

    // Test endpoint availability (simplified check)
    const endpoints = {
      fingerprint: true, // We assume it's available if this endpoint works
      devices: true,
      attendance: true,
      auth: true
    };

    const healthCheck: ApiHealthCheck = {
      status: 'healthy',
      api_version: '1.0.0',
      uptime: uptime,
      memory_usage: {
        used: Math.round(usedMemory / 1024 / 1024), // Convert to MB
        total: Math.round(totalMemory / 1024 / 1024), // Convert to MB
        percentage: Math.round(memoryPercentage * 100) / 100
      },
      endpoints,
      response_time: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      message: 'API health check berhasil',
      data: healthCheck
    });

  } catch (error: any) {
    console.error('API health check error:', error);
    
    const healthCheck: ApiHealthCheck = {
      status: 'unhealthy',
      api_version: '1.0.0',
      uptime: 0,
      memory_usage: {
        used: 0,
        total: 0,
        percentage: 0
      },
      endpoints: {
        fingerprint: false,
        devices: false,
        attendance: false,
        auth: false
      },
      response_time: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    return res.status(503).json({
      success: false,
      message: 'API service tidak tersedia',
      data: healthCheck,
      error: error.message
    });
  }
};

export default withAuth(handler);