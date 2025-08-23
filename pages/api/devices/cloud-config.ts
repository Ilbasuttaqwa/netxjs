import { NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';

const prisma = new PrismaClient();

interface CloudConfigRequest {
  server_url: string;
  api_key: string;
  sync_interval: number;
  retry_attempts: number;
  timeout: number;
  enable_auto_sync: boolean;
  enable_offline_mode: boolean;
  max_offline_records: number;
}

interface CloudConfigResponse {
  id: number;
  server_url: string;
  api_key: string;
  sync_interval: number;
  retry_attempts: number;
  timeout: number;
  enable_auto_sync: boolean;
  enable_offline_mode: boolean;
  max_offline_records: number;
  created_at: Date;
  updated_at: Date;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {

    if (req.method === 'GET') {
      // Get current cloud server configuration
      const config = await prisma.$queryRaw`
        SELECT * FROM cloud_config ORDER BY created_at DESC LIMIT 1
      ` as CloudConfigResponse[];

      if (config.length === 0) {
        // Return default configuration if none exists
        const defaultConfig = {
          server_url: process.env.CLOUD_SERVER_URL || 'https://your-cloud-server.com/api',
          api_key: process.env.CLOUD_API_KEY || 'your-api-key',
          sync_interval: parseInt(process.env.SYNC_INTERVAL || '300'),
          retry_attempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
          timeout: parseInt(process.env.TIMEOUT || '30000'),
          enable_auto_sync: true,
          enable_offline_mode: true,
          max_offline_records: 1000
        };

        return res.status(200).json({
          success: true,
          data: defaultConfig
        });
      }

      return res.status(200).json({
        success: true,
        data: config[0]
      });
    }

    if (req.method === 'POST') {
      // Create or update cloud server configuration
      const {
        server_url,
        api_key,
        sync_interval,
        retry_attempts,
        timeout,
        enable_auto_sync,
        enable_offline_mode,
        max_offline_records
      }: CloudConfigRequest = req.body;

      // Validation
      if (!server_url || !api_key) {
        return res.status(400).json({
          success: false,
          message: 'Server URL and API key are required'
        });
      }

      if (sync_interval < 60 || sync_interval > 3600) {
        return res.status(400).json({
          success: false,
          message: 'Sync interval must be between 60 and 3600 seconds'
        });
      }

      if (retry_attempts < 1 || retry_attempts > 10) {
        return res.status(400).json({
          success: false,
          message: 'Retry attempts must be between 1 and 10'
        });
      }

      if (timeout < 5000 || timeout > 120000) {
        return res.status(400).json({
          success: false,
          message: 'Timeout must be between 5000 and 120000 milliseconds'
        });
      }

      if (max_offline_records < 100 || max_offline_records > 10000) {
        return res.status(400).json({
          success: false,
          message: 'Max offline records must be between 100 and 10000'
        });
      }

      // Create cloud_config table if it doesn't exist
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS cloud_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          server_url VARCHAR(255) NOT NULL,
          api_key VARCHAR(255) NOT NULL,
          sync_interval INT NOT NULL DEFAULT 300,
          retry_attempts INT NOT NULL DEFAULT 3,
          timeout INT NOT NULL DEFAULT 30000,
          enable_auto_sync BOOLEAN NOT NULL DEFAULT TRUE,
          enable_offline_mode BOOLEAN NOT NULL DEFAULT TRUE,
          max_offline_records INT NOT NULL DEFAULT 1000,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;

      // Insert new configuration
      const result = await prisma.$executeRaw`
        INSERT INTO cloud_config (
          server_url, api_key, sync_interval, retry_attempts, timeout,
          enable_auto_sync, enable_offline_mode, max_offline_records
        ) VALUES (
          ${server_url}, ${api_key}, ${sync_interval}, ${retry_attempts}, ${timeout},
          ${enable_auto_sync}, ${enable_offline_mode}, ${max_offline_records}
        )
      `;

      // Get the newly created configuration
      const newConfig = await prisma.$queryRaw`
        SELECT * FROM cloud_config ORDER BY created_at DESC LIMIT 1
      ` as CloudConfigResponse[];

      return res.status(201).json({
        success: true,
        message: 'Cloud configuration saved successfully',
        data: newConfig[0]
      });
    }

    if (req.method === 'PUT') {
      // Update existing cloud server configuration
      const { id } = req.query;
      const {
        server_url,
        api_key,
        sync_interval,
        retry_attempts,
        timeout,
        enable_auto_sync,
        enable_offline_mode,
        max_offline_records
      }: CloudConfigRequest = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Configuration ID is required'
        });
      }

      // Validation (same as POST)
      if (!server_url || !api_key) {
        return res.status(400).json({
          success: false,
          message: 'Server URL and API key are required'
        });
      }

      // Update configuration
      await prisma.$executeRaw`
        UPDATE cloud_config SET
          server_url = ${server_url},
          api_key = ${api_key},
          sync_interval = ${sync_interval},
          retry_attempts = ${retry_attempts},
          timeout = ${timeout},
          enable_auto_sync = ${enable_auto_sync},
          enable_offline_mode = ${enable_offline_mode},
          max_offline_records = ${max_offline_records},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${parseInt(id as string)}
      `;

      // Get updated configuration
      const updatedConfig = await prisma.$queryRaw`
        SELECT * FROM cloud_config WHERE id = ${parseInt(id as string)}
      ` as CloudConfigResponse[];

      if (updatedConfig.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Configuration not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cloud configuration updated successfully',
        data: updatedConfig[0]
      });
    }

    if (req.method === 'DELETE') {
      // Delete cloud server configuration
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Configuration ID is required'
        });
      }

      await prisma.$executeRaw`
        DELETE FROM cloud_config WHERE id = ${parseInt(id as string)}
      `;

      return res.status(200).json({
        success: true,
        message: 'Cloud configuration deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Cloud config error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAdminAuth(handler);