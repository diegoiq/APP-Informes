import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../database/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const MAX_USERS = 5;
const JWT_SECRET = process.env.JWT_SECRET || 'app-informes-super-secret-key-change-in-production-2026';
const JWT_EXPIRES_IN = '8h';

export class AuthController {
  /**
   * Obtiene estadísticas de cupos de usuarios registrados (máximo 5)
   */
  public static async getStats(req: Request, res: Response) {
    try {
      const count = await prisma.usuario.count();
      const cuposDisponibles = Math.max(0, MAX_USERS - count);
      const limiteAlcanzado = count >= MAX_USERS;

      return res.json({
        registrados: count,
        maximo: MAX_USERS,
        cuposDisponibles,
        limiteAlcanzado
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al consultar estadísticas de usuarios', error: error.message });
    }
  }

  /**
   * Registro con verificación estricta de 5 usuarios máximos
   */
  public static async register(req: Request, res: Response) {
    try {
      const { nombre, email, password, rol } = req.body;

      if (!nombre || !email || !password) {
        return res.status(400).json({ message: 'Nombre, email y contraseña son obligatorios.' });
      }

      const emailNormalized = String(email).trim().toLowerCase();

      // REGLA DE NEGOCIO ESTRICTA: SELECT COUNT(*) FROM usuarios
      const count = await prisma.usuario.count();
      if (count >= MAX_USERS) {
        return res.status(403).json({
          message: 'Límite alcanzado: la aplicación no admite más de 5 usuarios registrados.'
        });
      }

      // Verificar si el correo ya existe
      const existingUser = await prisma.usuario.findUnique({
        where: { email: emailNormalized }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'El correo electrónico ya se encuentra registrado.' });
      }

      // Encriptar contraseña
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const validRoles = ['admin', 'supervisor', 'programador'];
      const userRol = validRoles.includes(rol) ? rol : 'programador';

      const newUser = await prisma.usuario.create({
        data: {
          nombre: String(nombre).trim(),
          email: emailNormalized,
          passwordHash,
          rol: userRol,
          activo: true
        }
      });

      // Generar JWT con vigencia de 8 horas
      const token = jwt.sign(
        {
          id: newUser.id,
          nombre: newUser.nombre,
          email: newUser.email,
          rol: newUser.rol
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.status(201).json({
        message: 'Usuario registrado exitosamente',
        token,
        usuario: {
          id: newUser.id,
          nombre: newUser.nombre,
          email: newUser.email,
          rol: newUser.rol
        }
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error durante el registro de usuario', error: error.message });
    }
  }

  /**
   * Inicio de sesión con bcrypt y JWT de 8 horas
   */
  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña requeridos.' });
      }

      const emailNormalized = String(email).trim().toLowerCase();

      const user = await prisma.usuario.findUnique({
        where: { email: emailNormalized }
      });

      if (!user) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      if (!user.activo) {
        return res.status(403).json({ message: 'Cuenta desactivada. Contacte al administrador.' });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      // JWT con expiración de 8 horas
      const token = jwt.sign(
        {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        token,
        usuario: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        }
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error en el inicio de sesión', error: error.message });
    }
  }

  /**
   * Obtener perfil del usuario autenticado
   */
  public static async me(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'No autenticado' });
      }

      const user = await prisma.usuario.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true,
          activo: true,
          creadoEn: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      return res.json(user);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
    }
  }

  /**
   * Listado de usuarios para asignaciones y firmas
   */
  public static async listUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await prisma.usuario.findMany({
        where: { activo: true },
        select: {
          id: true,
          nombre: true,
          email: true,
          rol: true
        },
        orderBy: { nombre: 'asc' }
      });
      return res.json(users);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al listar usuarios', error: error.message });
    }
  }

  /**
   * Restablecer contraseña de un usuario
   */
  public static async resetPassword(req: Request, res: Response) {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ message: 'Email y nueva contraseña son obligatorios.' });
      }
      const emailNormalized = String(email).trim().toLowerCase();
      const user = await prisma.usuario.findUnique({
        where: { email: emailNormalized }
      });
      if (!user) {
        return res.status(404).json({ message: `No se encontró ningún usuario con el correo ${emailNormalized}` });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(String(newPassword), salt);
      await prisma.usuario.update({
        where: { id: user.id },
        data: { passwordHash }
      });
      return res.json({ message: `Contraseña restablecida exitosamente para ${emailNormalized}. Ya puedes iniciar sesión con tu nueva clave.` });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al restablecer contraseña', error: error.message });
    }
  }
}
