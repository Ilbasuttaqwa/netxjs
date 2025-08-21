import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

// Mock users data (same as in login.ts)
const mockUsers = [
  {
    id: 1,
    email: 'admin@afms.com',
    name: 'Administrator',
    role: 'admin',
    cabang_id: 1
  },
  {
    id: 2,
    email: 'user@afms.com',
    name: 'Regular User',
    role: 'user',
    cabang_id: 1
  }
];

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
    
    // Find user by ID from token
    const user = mockUsers.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({
        message: 'User not found'
      });
    }

    return res.status(200).json({
      user
    });

  } catch (error) {
    console.error('Auth verification error:', error);
    return res.status(401).json({
      message: 'Invalid token'
    });
  }
}