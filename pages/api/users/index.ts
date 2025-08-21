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

// Prisma handler (commented out due to database configuration issues)
/*
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
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
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
        name: true,
        email: true,
        username: true,
        role: true,
        status: true,
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
      message: 'Internal server error',
      success: false,
    });
  }
}
*/

// Mock data for development (when database is not available)
const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe',
    role: 'admin',
    status: 'active',
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    username: 'janesmith',
    role: 'user',
    status: 'active',
    created_at: new Date('2024-01-14'),
    updated_at: new Date('2024-01-14'),
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    username: 'bobjohnson',
    role: 'user',
    status: 'inactive',
    created_at: new Date('2024-01-13'),
    updated_at: new Date('2024-01-13'),
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    username: 'alicebrown',
    role: 'moderator',
    status: 'active',
    created_at: new Date('2024-01-12'),
    updated_at: new Date('2024-01-12'),
  },
  {
    id: '5',
    name: 'Charlie Wilson',
    email: 'charlie@example.com',
    username: 'charliewilson',
    role: 'user',
    status: 'active',
    created_at: new Date('2024-01-11'),
    updated_at: new Date('2024-01-11'),
  },
];

// Mock data handler (active)
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

    // Filter data based on search
    let filteredUsers = mockUsers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = mockUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.username.toLowerCase().includes(searchLower)
      );
    }

    // Sort data
    filteredUsers.sort((a, b) => {
      const aValue = a[sortField as keyof typeof a];
      const bValue = b[sortField as keyof typeof b];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Paginate data
    const total = filteredUsers.length;
    const startIndex = (pageNum - 1) * pageSizeNum;
    const endIndex = startIndex + pageSizeNum;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    const totalPages = Math.ceil(total / pageSizeNum);

    res.status(200).json({
      data: paginatedUsers,
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
      message: 'Internal server error',
      success: false,
    });
  }
}