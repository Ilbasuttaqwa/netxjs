import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AnalyticsRequest {
  device_ids?: string[];
  cabang_id?: number;
  start_date?: string;
  end_date?: string;
  metrics?: string[];
  group_by?: 'device' | 'cabang' | 'day' | 'week' | 'month';
}

interface DeviceAnalytics {
  device_id: string;
  device_name: string;
  cabang_name: string;
  period: string;
  metrics: {
    uptime_percentage: number;
    total_syncs: number;
    successful_syncs: number;
    failed_syncs: number;
    avg_sync_duration: number;
    total_records_synced: number;
    avg_battery_level: number;
    avg_temperature: number;
    avg_memory_usage: number;
    avg_storage_usage: number;
    error_count: number;
    connection_quality_score: number;
  };
  trends: {
    uptime_trend: 'improving' | 'stable' | 'declining';
    sync_performance_trend: 'improving' | 'stable' | 'declining';
    hardware_health_trend: 'improving' | 'stable' | 'declining';
  };
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGetAnalytics(req, res);
      case 'POST':
        return await handleGenerateReport(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function handleGetAnalytics(req: AuthenticatedRequest, res: NextApiResponse) {
  const {
    device_ids,
    cabang_id,
    start_date,
    end_date,
    metrics = ['uptime', 'sync', 'hardware'],
    group_by = 'device'
  } = req.query as any;

  // Set default date range (last 30 days)
  const endDate = end_date ? new Date(end_date) : new Date();
  const startDate = start_date ? new Date(start_date) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Build device filter
    const deviceFilter: any = {};
    if (device_ids) {
      const deviceIdArray = Array.isArray(device_ids) ? device_ids : [device_ids];
      deviceFilter.device_id = { in: deviceIdArray };
    }
    if (cabang_id) {
      deviceFilter.cabang_id = parseInt(cabang_id);
    }

    // Fetch devices with related data
    const devices = await prisma.device.findMany({
      where: deviceFilter,
      include: {
        cabang: true,
        statusLogs: {
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    const analytics: DeviceAnalytics[] = [];

    for (const device of devices) {
      const statusLogs = device.statusLogs;

      // Calculate uptime metrics
      const totalLogs = statusLogs.length;
      const onlineLogs = statusLogs.filter(log => log.status === 'online');
      const uptimePercentage = totalLogs > 0 ? (onlineLogs.length / totalLogs) * 100 : 0;

      // Calculate sync metrics (using default values since sync history is not available)
      const totalSyncs = 0;
      const successfulSyncs = 0;
      const failedSyncs = 0;
      const avgSyncDuration = 0;
      const totalRecordsSynced = 0;

      // Calculate hardware metrics (using default values since fields are not available)
      const avgBatteryLevel = 0;
      const avgTemperature = 0;
      const avgMemoryUsage = 0;
      
      // Calculate storage usage from available field
      const logsWithStorage = statusLogs.filter(log => log.storage_usage !== null);
      const avgStorageUsage = logsWithStorage.length > 0 
        ? logsWithStorage.reduce((sum, log) => sum + (log.storage_usage || 0), 0) / logsWithStorage.length 
        : 0;

      const errorCount = statusLogs.filter(log => log.error_message !== null).length;

      // Calculate connection quality score (0-100)
      const connectionQualityScore = Math.round(
        (uptimePercentage * 0.4) + 
        ((successfulSyncs / Math.max(totalSyncs, 1)) * 100 * 0.3) + 
        (Math.max(0, 100 - errorCount * 5) * 0.3)
      );

      // Calculate trends (comparing first half vs second half of period)
      const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
      const firstHalfLogs = statusLogs.filter(log => log.timestamp < midPoint);
      const secondHalfLogs = statusLogs.filter(log => log.timestamp >= midPoint);
      // Uptime trend
      const firstHalfUptime = firstHalfLogs.length > 0 
        ? (firstHalfLogs.filter(log => log.status === 'online').length / firstHalfLogs.length) * 100 
        : 0;
      const secondHalfUptime = secondHalfLogs.length > 0 
        ? (secondHalfLogs.filter(log => log.status === 'online').length / secondHalfLogs.length) * 100 
        : 0;
      const uptimeTrend = secondHalfUptime > firstHalfUptime + 5 ? 'improving' 
        : secondHalfUptime < firstHalfUptime - 5 ? 'declining' : 'stable';

      // Sync performance trend (using default stable since sync history is not available)
      const syncPerformanceTrend = 'stable';

      // Hardware health trend (using default stable since hardware metrics are not available)
      const hardwareHealthTrend = 'stable';

      const deviceAnalytics: DeviceAnalytics = {
        device_id: device.device_id,
        device_name: device.nama,
        cabang_name: device.cabang?.nama_cabang || 'Unknown',
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        metrics: {
          uptime_percentage: Math.round(uptimePercentage * 100) / 100,
          total_syncs: totalSyncs,
          successful_syncs: successfulSyncs,
          failed_syncs: failedSyncs,
          avg_sync_duration: Math.round(avgSyncDuration * 100) / 100,
          total_records_synced: totalRecordsSynced,
          avg_battery_level: Math.round(avgBatteryLevel * 100) / 100,
          avg_temperature: Math.round(avgTemperature * 100) / 100,
          avg_memory_usage: Math.round(avgMemoryUsage * 100) / 100,
          avg_storage_usage: Math.round(avgStorageUsage * 100) / 100,
          error_count: errorCount,
          connection_quality_score: connectionQualityScore
        },
        trends: {
          uptime_trend: uptimeTrend,
          sync_performance_trend: syncPerformanceTrend,
          hardware_health_trend: hardwareHealthTrend
        }
      };

      analytics.push(deviceAnalytics);
    }

    // Calculate summary statistics
    const totalDevices = analytics.length;
    const avgUptime = totalDevices > 0 
      ? analytics.reduce((sum, a) => sum + a.metrics.uptime_percentage, 0) / totalDevices 
      : 0;
    const avgConnectionQuality = totalDevices > 0 
      ? analytics.reduce((sum, a) => sum + a.metrics.connection_quality_score, 0) / totalDevices 
      : 0;
    const totalSyncs = analytics.reduce((sum, a) => sum + a.metrics.total_syncs, 0);
    const totalSuccessfulSyncs = analytics.reduce((sum, a) => sum + a.metrics.successful_syncs, 0);
    const totalRecordsSynced = analytics.reduce((sum, a) => sum + a.metrics.total_records_synced, 0);

    return res.status(200).json({
      success: true,
      data: {
        analytics,
        summary: {
          total_devices: totalDevices,
          avg_uptime_percentage: Math.round(avgUptime * 100) / 100,
          avg_connection_quality_score: Math.round(avgConnectionQuality * 100) / 100,
          total_syncs: totalSyncs,
          total_successful_syncs: totalSuccessfulSyncs,
          sync_success_rate: totalSyncs > 0 ? Math.round((totalSuccessfulSyncs / totalSyncs) * 10000) / 100 : 0,
          total_records_synced: totalRecordsSynced,
          period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
          generated_at: new Date()
        }
      }
    });

  } catch (error: any) {
    console.error('Get analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get analytics'
    });
  }
}

async function handleGenerateReport(req: AuthenticatedRequest, res: NextApiResponse) {
  const {
    device_ids,
    cabang_id,
    start_date,
    end_date,
    report_type = 'summary',
    format = 'json'
  } = req.body;

  try {
    // Generate report structure
    const reportData = {
      report_id: `report_${Date.now()}`,
      report_type,
      generated_at: new Date(),
      period: {
        start_date: start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: end_date || new Date().toISOString().split('T')[0]
      },
      filters: {
        device_ids: device_ids || 'all',
        cabang_id: cabang_id || 'all'
      },
      summary: {
        total_devices_analyzed: 0,
        avg_uptime: 0,
        total_syncs: 0,
        sync_success_rate: 0,
        total_errors: 0
      },
      recommendations: [
        {
          priority: 'high',
          category: 'performance',
          description: 'Consider upgrading devices with consistently low battery levels',
          affected_devices: []
        },
        {
          priority: 'medium',
          category: 'maintenance',
          description: 'Schedule regular sync operations for devices with low sync frequency',
          affected_devices: []
        }
      ]
    };

    return res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: reportData
    });

  } catch (error: any) {
    console.error('Generate report error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate report'
    });
  }
}

export default withAdminAuth(handler);