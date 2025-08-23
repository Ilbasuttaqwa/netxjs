import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../../../lib/auth-middleware';

const prisma = new PrismaClient();

interface DeviceRegistrationRequest {
  device_id: string;
  nama: string;
  tipe: 'fingerprint' | 'face' | 'card';
  cabang_id: number;
  ip_address?: string;
  port?: string;
  lokasi?: string;
  keterangan?: string;
  firmware_version?: string;
  registration_key: string; // Key untuk validasi registrasi
}

interface CloudServerConfig {
  server_url: string;
  api_key: string;
  sync_interval: number;
  retry_attempts: number;
  timeout: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'POST') {
      // Registrasi device baru dengan cloud server
      const {
        device_id,
        nama,
        tipe,
        cabang_id,
        ip_address,
        port,
        lokasi,
        keterangan,
        firmware_version,
        registration_key
      }: DeviceRegistrationRequest = req.body;

      // Validasi registration key
      const validRegistrationKey = process.env.DEVICE_REGISTRATION_KEY || 'default-key-123';
      if (registration_key !== validRegistrationKey) {
        return res.status(401).json({
          success: false,
          message: 'Invalid registration key'
        });
      }

      // Validasi required fields
      if (!device_id || !nama || !tipe || !cabang_id) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: device_id, nama, tipe, cabang_id'
        });
      }

      // Check if device_id already exists
      const existingDevice = await prisma.device.findUnique({
        where: { device_id }
      });

      if (existingDevice) {
        return res.status(409).json({
          success: false,
          message: 'Device ID already exists'
        });
      }

      // Verify cabang exists
      const cabang = await prisma.cabang.findUnique({
        where: { id: parseInt(cabang_id.toString()) }
      });

      if (!cabang) {
        return res.status(404).json({
          success: false,
          message: 'Cabang not found'
        });
      }

      // Create new device
      const newDevice = await prisma.device.create({
        data: {
          device_id,
          nama,
          tipe,
          cabang_id: parseInt(cabang_id.toString()),
          ip_address,
          port,
          lokasi,
          keterangan,
          firmware_version,
          status: 'aktif',
          last_sync: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        },
        include: {
          cabang: {
            select: {
              id: true,
              nama_cabang: true,
              alamat_cabang: true
            }
          }
        }
      });

      // Generate cloud server configuration for the device
      const cloudConfig: CloudServerConfig = {
        server_url: process.env.CLOUD_SERVER_URL || 'https://your-cloud-server.com/api',
        api_key: process.env.CLOUD_API_KEY || 'your-api-key',
        sync_interval: parseInt(process.env.SYNC_INTERVAL || '300'), // 5 minutes default
        retry_attempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
        timeout: parseInt(process.env.TIMEOUT || '30000') // 30 seconds
      };

      // Log device registration
      await prisma.deviceStatusLog.create({
        data: {
          device_id: newDevice.id,
          status: 'registered',
          firmware_version,
          ip_address,
          port,
          error_message: null,
          sync_time: new Date()
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Device registered successfully',
        data: {
          device: newDevice,
          cloud_config: cloudConfig
        }
      });
    }

    if (req.method === 'GET') {
      // Get cloud server configuration for existing device
      const { device_id } = req.query;

      if (!device_id) {
        return res.status(400).json({
          success: false,
          message: 'Device ID is required'
        });
      }

      // Verify device exists
      const device = await prisma.device.findUnique({
        where: { device_id: device_id as string },
        include: {
          cabang: {
            select: {
              id: true,
              nama_cabang: true,
              alamat_cabang: true
            }
          }
        }
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Generate cloud server configuration
      const cloudConfig: CloudServerConfig = {
        server_url: process.env.CLOUD_SERVER_URL || 'https://your-cloud-server.com/api',
        api_key: process.env.CLOUD_API_KEY || 'your-api-key',
        sync_interval: parseInt(process.env.SYNC_INTERVAL || '300'),
        retry_attempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
        timeout: parseInt(process.env.TIMEOUT || '30000')
      };

      return res.status(200).json({
        success: true,
        data: {
          device,
          cloud_config: cloudConfig
        }
      });
    }

    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });

  } catch (error) {
    console.error('Device registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}