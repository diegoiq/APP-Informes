import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acceso no autorizado: Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'app-informes-super-secret-key-change-in-production-2026';

  try {
    const decoded = jwt.verify(token, secret) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token de sesión inválido o expirado' });
  }
}
