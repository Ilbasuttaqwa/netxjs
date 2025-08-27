import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    const { email, password, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi'
      });
    }

    // Find user by nama_pegawai in database
    const user = await prisma.user.findFirst({
      where: { 
        nama_pegawai: email // Using email input as username
      },
      include: {
        cabang: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    // Generate JWT token (convert BigInt to string)
    const token = jwt.sign(
      {
        id: user.id.toString(),
        name: user.nama_pegawai,
        role: user.role,
        cabang_id: user.id_cabang?.toString()
      },
      process.env.JWT_SECRET || 'your-secret-key',
      {
        expiresIn: remember ? '30d' : '24h'
      }
    );

    // Set HTTP-only cookie
    const cookie = serialize('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 24 hours
      path: '/'
    });

    res.setHeader('Set-Cookie', cookie);

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
      message: 'Login berhasil',
      data: {
        user: userData,
        token: token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server'
    });
  } finally {
    await prisma.$disconnect();
  }
}