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
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi'
      });
    }

    // Find user by email in database
    const user = await prisma.user.findUnique({
      where: { email },
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
        email: user.email,
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

    // Return user data (without password) and convert BigInt to string
    const { password: _, ...userWithoutPassword } = user;
    
    // Convert BigInt fields to strings for JSON serialization
    const convertBigIntToString = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj === 'bigint') return obj.toString();
      if (Array.isArray(obj)) return obj.map(convertBigIntToString);
      if (typeof obj === 'object') {
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          converted[key] = convertBigIntToString(value);
        }
        return converted;
      }
      return obj;
    };
    
    const serializedUser = convertBigIntToString(userWithoutPassword);
    
    return res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: serializedUser,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}