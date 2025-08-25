import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get token from cookie or Authorization header
    const token = req.cookies['auth-token'] || 
                 (req.headers.authorization?.startsWith('Bearer ') 
                   ? req.headers.authorization.slice(7) 
                   : null);

    if (!token) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Find user by ID from token in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        cabang: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        message: 'Pengguna tidak ditemukan'
      });
    }

    return res.status(200).json({
      user
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({
      message: 'Token tidak valid'
    });
  } finally {
    await prisma.$disconnect();
  }
}