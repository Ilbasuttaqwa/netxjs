import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DeviceData {
  id?: number;
  device_id: string;
  nama: string;
  tipe: 'fingerprint' | 'face' | 'card';
  cabang_id: number;
  ip_address?: string;
  port?: number;
  status: 'aktif' | 'nonaktif' | 'maintenance';
  lokasi?: string;
  keterangan?: string;
  last_sync?: Date;
  firmware_version?: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { page = 1, limit = 10, search = '', cabang_id, status, tipe } = req.query;
        
        const pageNum = parseInt(page.toString());
        const limitNum = parseInt(limit.toString());
        const skip = (pageNum - 1) * limitNum;
        
        // Build where clause for search and filters
        const whereClause: any = {};
        
        if (search) {
          whereClause.OR = [
            { device_id: { contains: search.toString(), mode: 'insensitive' } },
            { nama: { contains: search.toString(), mode: 'insensitive' } },
            { lokasi: { contains: search.toString(), mode: 'insensitive' } }
          ];
        }
        
        if (cabang_id) {
          whereClause.cabang_id = parseInt(cabang_id.toString());
        }
        
        if (status) {
          whereClause.status = status;
        }
        
        if (tipe) {
          whereClause.tipe = tipe;
        }
        
        // Get total count for pagination
        const total = await prisma.device.count({ where: whereClause });
        
        // Get devices with pagination, search, and sorting
        const devices = await prisma.device.findMany({
          where: whereClause,
          include: {
            cabang: {
              select: {
                id: true,
                nama: true,
                alamat: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        });
        
        return res.status(200).json({
          success: true,
          data: devices,
          pagination: {
            current_page: pageNum,
            per_page: limitNum,
            total,
            total_pages: Math.ceil(total / limitNum)
          }
        });

      case 'POST':
        const { device_id, nama, tipe: deviceTipe, cabang_id: cId, ip_address, port, lokasi, keterangan, firmware_version } = req.body;
        
        if (!device_id || !nama || !deviceTipe || !cId) {
          return res.status(400).json({
            success: false,
            message: 'Required fields: device_id, nama, tipe, cabang_id'
          });
        }
        
        // Check if device_id already exists
        const existingDevice = await prisma.device.findFirst({
          where: { device_id }
        });
        
        if (existingDevice) {
          return res.status(400).json({
            success: false,
            message: 'Device ID already exists'
          });
        }
        
        // Verify cabang exists
        const cabang = await prisma.cabang.findUnique({
          where: { id: parseInt(cId) }
        });
        
        if (!cabang) {
          return res.status(400).json({
            success: false,
            message: 'Invalid cabang_id'
          });
        }
        
        const newDevice = await prisma.device.create({
          data: {
            device_id,
            nama,
            tipe: deviceTipe,
            cabang_id: parseInt(cId),
            ip_address: ip_address || null,
            port: port ? parseInt(port) : null,
            status: 'aktif',
            lokasi: lokasi || null,
            keterangan: keterangan || null,
            firmware_version: firmware_version || null
          },
          include: {
            cabang: {
              select: {
                id: true,
                nama: true,
                alamat: true
              }
            }
          }
        });
        
        return res.status(201).json({
          success: true,
          message: 'Device created successfully',
          data: newDevice
        });

      default:
        return res.status(405).json({ 
          success: false,
          message: 'Method not allowed' 
        });
    }

  } catch (error) {
    console.error('Device API error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAdminAuth(handler);