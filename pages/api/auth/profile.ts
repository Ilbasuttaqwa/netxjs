import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
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
  if (req.method !== 'GET') {
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

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // Get user from database
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

    // Return user data without password (convert BigInt to string for JSON serialization)
    const userData = {
      id: user.id.toString(),
      nama_pegawai: user.nama_pegawai,
      role: user.role,
      id_cabang: user.id_cabang?.toString(),
      cabang: user.cabang ? {
        id: user.cabang.id.toString(),
        nama_cabang: user.cabang.nama_cabang,
        alamat_cabang: user.cabang.alamat_cabang,
        telepon_cabang: user.cabang.telepon_cabang
      } : null,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return res.status(200).json({
      success: true,
      message: 'Profile berhasil diambil',
      data: userData
    });

  } catch (error) {
    console.error('Profile error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token sudah expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  } finally {
    await prisma.$disconnect();
  }
}