import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: string;
    userId: number;
    email: string;
    name: string;
    role: string;
  };
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>,
  requiredRoles?: string | string[]
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          message: 'No token provided'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({
          message: 'Token tidak valid'
        });
      }

      // Add user info to request
      req.user = {
        id: decoded.id,
        userId: parseInt(decoded.id) || 1,
        email: decoded.email || '',
        name: decoded.name || '',
        role: decoded.role || 'admin'
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
        message: 'Token tidak valid'
      });
    }
  };
}

export function withAdminAuth(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return withAuth(handler, 'admin');
}