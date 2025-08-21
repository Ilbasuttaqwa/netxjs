import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Test database connection
    const userCount = await prisma.user.count()
    const cabangCount = await prisma.cabang.count()
    const jabatanCount = await prisma.jabatan.count()
    
    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      data: {
        users: userCount,
        cabang: cabangCount,
        jabatan: jabatanCount
      }
    })
  } catch (error) {
    console.error('Database connection error:', error)
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}