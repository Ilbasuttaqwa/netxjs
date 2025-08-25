import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { ApiResponse } from '../../../types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DatabaseHealthCheck {
  status: 'healthy' | 'unhealthy';
  connection: boolean;
  response_time: number;
  database_info: {
    tables_count?: number;
    last_migration?: string;
    version?: string;
  };
  timestamp: string;
}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse<ApiResponse<DatabaseHealthCheck>>) => {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method tidak diizinkan'
    });
  }

  const startTime = Date.now();
  let healthCheck: DatabaseHealthCheck = {
    status: 'unhealthy',
    connection: false,
    response_time: 0,
    database_info: {},
    timestamp: new Date().toISOString()
  };

  try {
    // Test basic connection
    await prisma.$connect();
    healthCheck.connection = true;

    // Test query execution
    const tablesQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    ` as any[];

    healthCheck.database_info.tables_count = parseInt(tablesQuery[0]?.table_count || '0');

    // Test specific table access
    const deviceCount = await prisma.device.count();
    const attendanceCount = await prisma.fingerprintAttendance.count();
    const userCount = await prisma.user.count();

    // Calculate response time
    healthCheck.response_time = Date.now() - startTime;
    healthCheck.status = 'healthy';

    return res.status(200).json({
      success: true,
      message: 'Database health check berhasil',
      data: {
        ...healthCheck,
        database_info: {
          ...healthCheck.database_info,
          device_count: deviceCount,
          attendance_count: attendanceCount,
          user_count: userCount
        }
      }
    });

  } catch (error: any) {
    console.error('Database health check error:', error);
    
    healthCheck.response_time = Date.now() - startTime;
    healthCheck.status = 'unhealthy';

    return res.status(503).json({
      success: false,
      message: 'Database tidak dapat diakses',
      data: healthCheck,
      error: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
};

export default withAuth(handler);