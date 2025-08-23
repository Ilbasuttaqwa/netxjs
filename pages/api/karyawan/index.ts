import { NextApiResponse } from 'next';
import { withAdminAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { page = 1, limit = 10, search = '', cabang_id, jabatan_id } = req.query;
        
        const pageNum = parseInt(page.toString());
        const limitNum = parseInt(limit.toString());
        const skip = (pageNum - 1) * limitNum;
        
        // Build where clause for search and filters
        const whereClause: any = {};
        
        if (search) {
          whereClause.OR = [
            { nama: { contains: search.toString(), mode: 'insensitive' } },
            { email: { contains: search.toString(), mode: 'insensitive' } }
          ];
        }
        
        if (cabang_id) {
          whereClause.cabang_id = parseInt(cabang_id.toString());
        }
        
        if (jabatan_id) {
          whereClause.jabatan_id = parseInt(jabatan_id.toString());
        }
        
        // Get total count for pagination
        const total = await prisma.karyawan.count({ where: whereClause });
        
        // Get karyawan with pagination, search, and sorting
        const karyawanList = await prisma.karyawan.findMany({
          where: whereClause,
          include: {
            jabatan: {
              select: {
                id: true,
                nama: true
              }
            },
            cabang: {
              select: {
                id: true,
                nama: true
              }
            }
          },
          orderBy: { created_at: 'desc' },
          skip,
          take: limitNum
        });
        
        return res.status(200).json({
          success: true,
          data: karyawanList,
          pagination: {
            current_page: pageNum,
            per_page: limitNum,
            total,
            total_pages: Math.ceil(total / limitNum)
          }
        });

      case 'POST':
        const { nama, email, jabatan_id: jId, cabang_id: cId, telepon, alamat, tanggal_masuk, finger_id, status } = req.body;
        
        if (!nama || !email || !jId || !cId) {
          return res.status(400).json({
            message: 'Required fields: nama, email, jabatan_id, cabang_id'
          });
        }
        
        // Check if email already exists
        const existingKaryawan = await prisma.karyawan.findFirst({
          where: { email }
        });
        
        if (existingKaryawan) {
          return res.status(400).json({
            message: 'Email already exists'
          });
        }
        
        // Verify jabatan and cabang exist
        const jabatan = await prisma.jabatan.findUnique({
          where: { id: parseInt(jId) }
        });
        
        const cabang = await prisma.cabang.findUnique({
          where: { id: parseInt(cId) }
        });
        
        if (!jabatan || !cabang) {
          return res.status(400).json({
            message: 'Invalid jabatan_id or cabang_id'
          });
        }
        
        const newKaryawan = await prisma.karyawan.create({
          data: {
            nama,
            email,
            jabatan_id: parseInt(jId),
            cabang_id: parseInt(cId),
            telepon: telepon || '',
            alamat: alamat || '',
            tanggal_masuk: tanggal_masuk ? new Date(tanggal_masuk) : new Date(),
            fingerprint_id: finger_id || null,
            status: status || 'aktif'
          },
          include: {
            jabatan: {
              select: {
                id: true,
                nama: true
              }
            },
            cabang: {
              select: {
                id: true,
                nama: true
              }
            }
          }
        });
        
        return res.status(201).json({
          success: true,
          message: 'Karyawan created successfully',
          data: newKaryawan
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Karyawan API error:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAdminAuth(handler);