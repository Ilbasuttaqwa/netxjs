import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    role: string;
    cabang_id?: string;
  };
}

export default async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.cookies['auth-token'];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    // Verify JWT token (even if expired, we can still get the payload)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    } catch (error) {
      // If token is expired, try to decode without verification to get user info
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(token) as any;
        if (!decoded) {
          return res.status(401).json({
            success: false,
            message: 'Token tidak valid'
          });
        }
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token tidak valid'
        });
      }
    }
    
    // Get user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      include: {
        cabang: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan'
      });
    }

    // Generate new JWT token
    const newToken = jwt.sign(
      {
        id: user.id.toString(),
        name: user.nama_pegawai,
        role: user.role,
        cabang_id: user.id_cabang?.toString()
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: '24h'
      }
    );

    // Set new HTTP-only cookie
    const cookie = serialize('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    res.setHeader('Set-Cookie', cookie);

    return res.status(200).json({
      success: true,
      message: 'Token berhasil diperbarui',
      data: {
        token: newToken
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  } finally {
    await prisma.$disconnect();
  }
}