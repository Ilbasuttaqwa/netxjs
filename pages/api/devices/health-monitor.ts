import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HealthCheckRequest {
  device_ids?: string[];
  include_history?: boolean;
  time_range?: 'hour' | 'day' | 'week' | 'month';
}

interface DeviceHealthStatus {
  device_id: string;
  device_name: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  last_seen: Date;
  uptime_percentage: number;
  issues: string[];
  metrics: {
    storage_usage?: number;
    connection_quality?: 'excellent' | 'good' | 'fair' | 'poor';
    sync_frequency?: number;
    error_count?: number;
  };
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleHealthCheck(req, res);
      case 'POST':
        return await handleHealthUpdate(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Health monitor API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function handleHealthCheck(req: AuthenticatedRequest, res: NextApiResponse) {
  const { 
    device_ids, 
    include_history = false, 
    time_range = 'day' 
  } = req.query as any;

  // Calculate time range for history
  const now = new Date();
  const timeRangeMap = {
    hour: new Date(now.getTime() - 60 * 60 * 1000),
    day: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  };
  const startTime = timeRangeMap[time_range as keyof typeof timeRangeMap];

  // Build device filter
  const deviceFilter: any = {};
  if (device_ids) {
    const deviceIdArray = Array.isArray(device_ids) ? device_ids : [device_ids];
    deviceFilter.device_id = { in: deviceIdArray };
  }

  // Fetch devices with recent status logs
  const devices = await prisma.device.findMany({
    where: deviceFilter,
    include: {
      cabang: true,
      statusLogs: {
        where: {
          timestamp: {
            gte: startTime
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 10
      }
    }
  });

  const healthStatuses: DeviceHealthStatus[] = [];

  for (const device of devices) {
    const latestLog = device.statusLogs[0];
    const allLogs = device.statusLogs;
    const statusLogs = device.statusLogs;

    // Calculate uptime percentage
    const onlineLogs = allLogs.filter(log => log.status === 'online');
    const uptimePercentage = allLogs.length > 0 ? (onlineLogs.length / allLogs.length) * 100 : 0;

    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'critical' | 'offline' = 'offline';
    const issues: string[] = [];

    if (latestLog) {
      const timeSinceLastSeen = now.getTime() - latestLog.timestamp.getTime();
      const minutesSinceLastSeen = timeSinceLastSeen / (1000 * 60);

      if (latestLog.status === 'online' && minutesSinceLastSeen < 5) {
        healthStatus = 'healthy';
      } else if (latestLog.status === 'online' && minutesSinceLastSeen < 30) {
        healthStatus = 'warning';
        issues.push('Device not responding recently');
      } else if (latestLog.status === 'offline') {
        healthStatus = 'offline';
        issues.push('Device is offline');
      }

      // Check for critical issues
      if (latestLog.storage_usage && latestLog.storage_usage > 95) {
        healthStatus = 'critical';
        issues.push(`Storage almost full: ${latestLog.storage_usage}%`);
      }
      if (latestLog.error_message) {
        if (healthStatus === 'healthy') healthStatus = 'warning';
        issues.push(latestLog.error_message);
      }
    }

    // Calculate connection quality
    let connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    if (uptimePercentage >= 95) connectionQuality = 'excellent';
    else if (uptimePercentage >= 85) connectionQuality = 'good';
    else if (uptimePercentage >= 70) connectionQuality = 'fair';

    // Calculate sync frequency (syncs per hour)
    const successfulSyncs = statusLogs.filter(log => log.status === 'online');
    const syncFrequency = successfulSyncs.length / (time_range === 'hour' ? 1 : time_range === 'day' ? 24 : time_range === 'week' ? 168 : 720);

    // Count errors in the time range
    const errorCount = allLogs.filter(log => log.error_message).length;

    const healthData: DeviceHealthStatus = {
      device_id: device.device_id,
      device_name: device.nama,
      status: healthStatus,
      last_seen: latestLog?.timestamp || device.updated_at,
      uptime_percentage: Math.round(uptimePercentage * 100) / 100,
      issues,
      metrics: {
        storage_usage: latestLog?.storage_usage || undefined,
        connection_quality: connectionQuality,
        sync_frequency: Math.round(syncFrequency * 100) / 100,
        error_count: errorCount
      }
    };

    healthStatuses.push(healthData);
  }

  // Calculate overall statistics
  const totalDevices = healthStatuses.length;
  const healthyDevices = healthStatuses.filter(d => d.status === 'healthy').length;
  const warningDevices = healthStatuses.filter(d => d.status === 'warning').length;
  const criticalDevices = healthStatuses.filter(d => d.status === 'critical').length;
  const offlineDevices = healthStatuses.filter(d => d.status === 'offline').length;
  const averageUptime = totalDevices > 0 ? healthStatuses.reduce((sum, d) => sum + d.uptime_percentage, 0) / totalDevices : 0;

  return res.status(200).json({
    success: true,
    data: {
      devices: healthStatuses,
      statistics: {
        total_devices: totalDevices,
        healthy_devices: healthyDevices,
        warning_devices: warningDevices,
        critical_devices: criticalDevices,
        offline_devices: offlineDevices,
        average_uptime: Math.round(averageUptime * 100) / 100,
        time_range,
        last_updated: new Date()
      },
      ...(include_history && {
        history: devices.map(device => ({
          device_id: device.device_id,
          status_logs: device.statusLogs
        }))
      })
    }
  });
}

async function handleHealthUpdate(req: AuthenticatedRequest, res: NextApiResponse) {
  const { device_id, metrics, status, error_message } = req.body;

  if (!device_id) {
    return res.status(400).json({
      success: false,
      message: 'device_id wajib diisi'
    });
  }

  try {
    // Find device
    const device = await prisma.device.findFirst({
      where: { device_id }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Perangkat tidak ditemukan'
      });
    }

    // Create new status log
    const statusLog = await prisma.deviceStatusLog.create({
      data: {
        device_id: device.id,
        status: status || 'online',
        firmware_version: device.firmware_version,
        storage_usage: metrics?.storage_usage,
        error_message: error_message || null,
        timestamp: new Date()
      }
    });

    // Update device last_sync if status is online
    if (status === 'online') {
      await prisma.device.update({
        where: { id: device.id },
        data: {
          last_sync: new Date(),
          status: 'aktif'
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Status kesehatan berhasil diperbarui',
      data: statusLog
    });

  } catch (error: any) {
    console.error('Health update error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal memperbarui status kesehatan'
    });
  }
}

export default withAdminAuth(handler);