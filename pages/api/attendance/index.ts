import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface QueryParams {
  page?: string;
  pageSize?: string;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

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
      sortField = 'tanggal',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      status,
    } = req.query as QueryParams;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);

    // Build where clause for Prisma query
    const whereClause: any = {};

    // Apply search filter
    if (search) {
      whereClause.user = {
        OR: [
          { nama_pegawai: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    // Apply date range filter
    if (dateFrom || dateTo) {
      whereClause.tanggal = {};
      if (dateFrom) {
        whereClause.tanggal.gte = new Date(dateFrom);
      }
      if (dateTo) {
        whereClause.tanggal.lte = new Date(dateTo);
      }
    }

    // Apply status filter
    if (status) {
      whereClause.status = status;
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortField === 'user.name') {
      orderBy.user = { nama_pegawai: sortOrder };
    } else {
      orderBy[sortField] = sortOrder;
    }

    // Get total count
    const total = await prisma.Absensi.count({ where: whereClause });

    // Get paginated data
    const attendance = await prisma.Absensi.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            nama_pegawai: true,
            email: true
          }
        }
      },
      orderBy,
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum
    });

    const totalPages = Math.ceil(total / pageSizeNum);

    // Transform data to match expected format
    const transformedData = attendance.map(item => ({
      id: item.id.toString(),
      user_id: item.id_user.toString(),
      tanggal: item.tanggal,
      jam_masuk: item.jam_masuk,
      jam_keluar: item.jam_keluar,
      status: item.status,
      keterangan: item.keterangan,
      created_at: item.created_at,
      updated_at: item.updated_at,
      user: {
        id: item.user.id.toString(),
        name: item.user.nama_pegawai,
        username: item.user.nama_pegawai, // Use nama_pegawai as username fallback
        email: item.user.email
      }
    }));

    res.status(200).json({
      data: transformedData,
      pagination: {
        current: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages,
      },
      success: true,
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      message: 'Internal server error',
      success: false,
    });
  }
}