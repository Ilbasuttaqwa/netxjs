import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    userId: number;
    email: string;
    role: string;
    cabang_id: number;
  };
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
  requiredRoles?: string | string[]
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
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
      
      // Add user info to request
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        cabang_id: decoded.cabang_id
      };

      // Check role if required
      if (requiredRoles) {
        const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({
            message: 'Insufficient permissions'
          });
        }
      }

      // Call the actual handler
      return await handler(req, res);

    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        message: 'Invalid token'
      });
    }
  };
}

export function withAdminAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return withAuth(handler, 'admin');
}