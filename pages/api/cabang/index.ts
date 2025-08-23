import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '../../../lib/auth-middleware';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const { search = '', status } = req.query;
        
        // Build where clause for search and filters
        const whereClause: any = {};
        
        if (search) {
          whereClause.OR = [
            { nama: { contains: search.toString(), mode: 'insensitive' } },
            { alamat: { contains: search.toString(), mode: 'insensitive' } }
          ];
        }
        
        if (status) {
          whereClause.status = status;
        }
        
        const cabangList = await prisma.cabang.findMany({
          where: whereClause,
          orderBy: { created_at: 'desc' }
        });
        
        return res.status(200).json({
          success: true,
          data: cabangList
        });

      case 'POST':
        // Only admin can create cabang
        if (req.user?.role !== 'admin') {
          return res.status(403).json({
            message: 'Insufficient permissions'
          });
        }
        
        const { nama, alamat, no_telp, email } = req.body;
        
        if (!nama || !alamat) {
          return res.status(400).json({
            message: 'Required fields: nama, alamat'
          });
        }
        
        // Check if nama already exists
        const existingCabang = await prisma.cabang.findFirst({
          where: { nama }
        });
        
        if (existingCabang) {
          return res.status(400).json({
            message: 'Cabang name already exists'
          });
        }
        
        const newCabang = await prisma.cabang.create({
          data: {
            nama,
            alamat,
            no_telp: no_telp || '',
            email: email || '',
            status: 'aktif'
          }
        });
        
        return res.status(201).json({
          success: true,
          message: 'Cabang created successfully',
          data: newCabang
        });

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Cabang API error:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

export default withAuth(handler);