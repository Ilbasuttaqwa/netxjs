import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RealtimeSyncRequest {
  device_id: string;
  sync_type: 'full' | 'incremental' | 'attendance_only' | 'user_only';
  last_sync_timestamp?: string;
  force_sync?: boolean;
}

interface SyncResponse {
  sync_id: string;
  device_id: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  progress_percentage: number;
  records_processed: number;
  total_records: number;
  estimated_completion: Date;
  error_message?: string;
}

// In-memory store for tracking active sync operations
const activeSyncs = new Map<string, SyncResponse>();

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'POST':
        return await handleStartSync(req, res);
      case 'GET':
        return await handleGetSyncStatus(req, res);
      case 'DELETE':
        return await handleCancelSync(req, res);
      default:
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Realtime sync API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function handleStartSync(req: AuthenticatedRequest, res: NextApiResponse) {
  const { 
    device_id, 
    sync_type = 'incremental', 
    last_sync_timestamp, 
    force_sync = false 
  } = req.body as RealtimeSyncRequest;

  if (!device_id) {
    return res.status(400).json({
      success: false,
      message: 'device_id is required'
    });
  }

  try {
    // Find device
    const device = await prisma.device.findFirst({
      where: { device_id },
      include: { cabang: true }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Check if device is already syncing
    const existingSync = Array.from(activeSyncs.values()).find(
      sync => sync.device_id === device_id && 
      ['started', 'in_progress'].includes(sync.status)
    );

    if (existingSync && !force_sync) {
      return res.status(409).json({
        success: false,
        message: 'Device is already syncing',
        data: existingSync
      });
    }

    // Generate sync ID
    const syncId = `sync_${device_id}_${Date.now()}`;

    // Note: Sync history tracking removed as deviceSyncHistory model is not available

    // Initialize sync response
    const syncResponse: SyncResponse = {
      sync_id: syncId,
      device_id,
      status: 'started',
      progress_percentage: 0,
      records_processed: 0,
      total_records: 0,
      estimated_completion: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes estimate
    };

    activeSyncs.set(syncId, syncResponse);

    // Start async sync process
    performAsyncSync(syncId, device, sync_type, last_sync_timestamp)
      .catch(error => {
        console.error(`Sync ${syncId} failed:`, error);
        const sync = activeSyncs.get(syncId);
        if (sync) {
          sync.status = 'failed';
          sync.error_message = error.message;
          activeSyncs.set(syncId, sync);
        }
      });

    return res.status(200).json({
      success: true,
      message: 'Sync started successfully',
      data: syncResponse
    });

  } catch (error: any) {
    console.error('Start sync error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to start sync'
    });
  }
}

async function handleGetSyncStatus(req: AuthenticatedRequest, res: NextApiResponse) {
  const { sync_id, device_id } = req.query;

  if (sync_id) {
    const sync = activeSyncs.get(sync_id as string);
    if (!sync) {
      return res.status(404).json({
        success: false,
        message: 'Sync not found'
      });
    }
    return res.status(200).json({
      success: true,
      data: sync
    });
  }

  if (device_id) {
    const deviceSyncs = Array.from(activeSyncs.values()).filter(
      sync => sync.device_id === device_id
    );
    return res.status(200).json({
      success: true,
      data: deviceSyncs
    });
  }

  // Return all active syncs
  const allSyncs = Array.from(activeSyncs.values());
  return res.status(200).json({
    success: true,
    data: allSyncs
  });
}

async function handleCancelSync(req: AuthenticatedRequest, res: NextApiResponse) {
  const { sync_id } = req.query;

  if (!sync_id) {
    return res.status(400).json({
      success: false,
      message: 'sync_id is required'
    });
  }

  const sync = activeSyncs.get(sync_id as string);
  if (!sync) {
    return res.status(404).json({
      success: false,
      message: 'Sync not found'
    });
  }

  if (!['started', 'in_progress'].includes(sync.status)) {
    return res.status(400).json({
      success: false,
      message: 'Sync cannot be cancelled in current status'
    });
  }

  // Mark sync as cancelled
  sync.status = 'failed';
  sync.error_message = 'Sync cancelled by user';
  activeSyncs.set(sync_id as string, sync);

  return res.status(200).json({
    success: true,
    message: 'Sync cancelled successfully',
    data: sync
  });
}

async function performAsyncSync(
  syncId: string,
  device: any,
  syncType: string,
  lastSyncTimestamp?: string,
  syncHistoryId?: number
) {
  const sync = activeSyncs.get(syncId);
  if (!sync) return;

  try {
    // Update status to in_progress
    sync.status = 'in_progress';
    activeSyncs.set(syncId, sync);

    // Simulate determining total records based on sync type
    let totalRecords = 0;
    switch (syncType) {
      case 'full':
        totalRecords = Math.floor(Math.random() * 1000) + 500;
        break;
      case 'incremental':
        totalRecords = Math.floor(Math.random() * 200) + 50;
        break;
      case 'attendance_only':
        totalRecords = Math.floor(Math.random() * 300) + 100;
        break;
      case 'user_only':
        totalRecords = Math.floor(Math.random() * 100) + 20;
        break;
    }

    sync.total_records = totalRecords;
    activeSyncs.set(syncId, sync);

    // Simulate sync progress
    const progressSteps = 10;
    const recordsPerStep = Math.ceil(totalRecords / progressSteps);
    
    for (let step = 0; step < progressSteps; step++) {
      // Check if sync was cancelled
      const currentSync = activeSyncs.get(syncId);
      if (!currentSync || currentSync.status === 'failed') {
        throw new Error('Sync was cancelled');
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

      // Update progress
      sync.records_processed = Math.min((step + 1) * recordsPerStep, totalRecords);
      sync.progress_percentage = Math.round((sync.records_processed / totalRecords) * 100);
      
      // Update estimated completion
      const remainingSteps = progressSteps - step - 1;
      const avgTimePerStep = 2000; // 2 seconds average
      sync.estimated_completion = new Date(Date.now() + remainingSteps * avgTimePerStep);
      
      activeSyncs.set(syncId, sync);
    }

    // Complete sync
    sync.status = 'completed';
    sync.progress_percentage = 100;
    sync.records_processed = totalRecords;
    activeSyncs.set(syncId, sync);

    // Update device last_sync
    await prisma.device.update({
      where: { id: device.id },
      data: {
        last_sync: new Date(),
        status: 'aktif'
      }
    });

    // Note: Sync history update removed as deviceSyncHistory model is not available

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

    // Clean up completed sync after 5 minutes
    setTimeout(() => {
      activeSyncs.delete(syncId);
    }, 5 * 60 * 1000);

  } catch (error: any) {
    console.error(`Sync ${syncId} error:`, error);
    
    sync.status = 'failed';
    sync.error_message = error.message;
    activeSyncs.set(syncId, sync);

    // Note: Sync history error update removed as deviceSyncHistory model is not available

    // Clean up failed sync after 1 minute
    setTimeout(() => {
      activeSyncs.delete(syncId);
    }, 60 * 1000);
  }
}

export default withAdminAuth(handler);