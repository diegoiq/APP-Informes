import { Request, Response } from 'express';
import prisma from '../database/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AdminController {
  /**
   * Limpia los datos demo de la plataforma (Avisos, Obras, Personal, Informes, Usuarios Demo)
   */
  public static async cleanDemoData(req: AuthenticatedRequest, res: Response) {
    try {
      if (req.user?.rol !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado: solo administradores pueden realizar esta acción.' });
      }

      const {
        cleanAvisos = false,
        cleanObras = false,
        cleanPersonal = false,
        cleanInformes = false,
        cleanDemoUsers = false
      } = req.body;

      if (!cleanAvisos && !cleanObras && !cleanPersonal && !cleanInformes && !cleanDemoUsers) {
        return res.status(400).json({ message: 'No se seleccionó ningún módulo para limpiar.' });
      }

      const resultados: Record<string, number> = {};

      // 1. Limpiar Informes y sus fotos
      if (cleanInformes) {
        await prisma.fotoInformeCRR.deleteMany({});
        const deletedInf = await prisma.informeCRR.deleteMany({});
        resultados.informesBorrados = deletedInf.count;
      }

      // 2. Limpiar Obras y Bitácoras
      if (cleanObras) {
        await prisma.fotoBitacora.deleteMany({});
        await prisma.libroDiario.deleteMany({});
        const deletedObras = await prisma.obra.deleteMany({});
        resultados.obrasBorradas = deletedObras.count;
      }

      // 3. Limpiar Programaciones y Personal
      if (cleanPersonal) {
        await prisma.programacionSemanal.deleteMany({});
        await prisma.ausenciaPersonal.deleteMany({});
        const deletedPersonal = await prisma.personal.deleteMany({});
        resultados.personalBorrado = deletedPersonal.count;
      }

      // 4. Limpiar Avisos y Contactos
      if (cleanAvisos) {
        await prisma.triajeContacto.deleteMany({});
        const deletedAvisos = await prisma.aviso.deleteMany({});
        resultados.avisosBorrados = deletedAvisos.count;
      }

      // 5. Limpiar Usuarios Demo si se solicita (dejando cupos libres)
      if (cleanDemoUsers) {
        // Borramos los dos usuarios precargados en el seed
        const deletedUsers = await prisma.usuario.deleteMany({
          where: {
            email: {
              in: ['supervisor@arauco-crr.cl', 'admin@arauco-crr.cl']
            }
          }
        });
        resultados.usuariosDemoBorrados = deletedUsers.count;
      }

      const totalUsuariosRestantes = await prisma.usuario.count();
      resultados.cuposDisponibles = Math.max(0, 5 - totalUsuariosRestantes);

      return res.json({
        message: 'Datos de prueba eliminados exitosamente. La plataforma está limpia para datos reales.',
        resultados
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al limpiar datos demo', error: error.message });
    }
  }
}
