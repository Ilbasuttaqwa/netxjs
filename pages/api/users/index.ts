import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QueryParams {
  page?: string;
  pageSize?: string;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

// Database handler using Prisma
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      page = '1',
      pageSize = '10',
      search = '',
      sortField = 'created_at',
      sortOrder = 'desc',
    } = req.query as QueryParams;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    // Build where clause for search
    const whereClause = search
      ? {
          OR: [
            { nama_pegawai: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Build order by clause
    const orderBy = {
      [sortField]: sortOrder,
    };

    // Get total count for pagination
    const total = await prisma.user.count({
      where: whereClause,
    });

    // Get paginated data
    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: pageSizeNum,
      select: {
        id: true,
        nama_pegawai: true,
        role: true,
        status_pegawai: true,
        created_at: true,
        updated_at: true,
        // Exclude sensitive fields like password
      },
    });

    const totalPages = Math.ceil(total / pageSizeNum);

    res.status(200).json({
      data: users,
      pagination: {
        current: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      message: 'Terjadi kesalahan server',
      success: false,
    });
  } finally {
    await prisma.$disconnect();
  }
}