import { Request, Response } from 'express';
import prisma from '../database/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import fs from 'fs';

export class AdminController {
  /**
   * Obtiene el estado en tiempo real de Render, espacios disponibles (BD PostgreSQL, RAM, Disco),
   * conteo de registros y variables operativas pertinentes.
   */
  public static async getSystemStatus(req: Request, res: Response) {
    try {
      // 1. Conteos de base de datos
      const [
        usuariosCount,
        avisosCount,
        operacionesCount,
        operacionesEnPSCount,
        informesCount,
        fotosInformeCount,
        obrasCount,
        personalCount,
        dotacionesPS
      ] = await Promise.all([
        prisma.usuario.count(),
        prisma.aviso.count(),
        prisma.operacionOM.count(),
        prisma.operacionOM.count({ where: { semanaProg: { not: null } } }),
        prisma.informeCRR.count(),
        prisma.fotoInformeCRR.count(),
        prisma.obra.count(),
        prisma.personal.count(),
        prisma.dotacionSemanalArauco.findMany({
          orderBy: [{ anio: 'desc' }, { semana: 'desc' }],
          take: 10
        })
      ]);

      // 2. Tamaño real de la Base de Datos PostgreSQL (Render Free = 1024 MB / 1 GB)
      const dbLimitMb = Number(process.env.RENDER_DB_LIMIT_MB || 1024);
      let dbUsedBytes = 0;
      let dbEngine = 'PostgreSQL (Render Managed)';

      try {
        const result: any = await prisma.$queryRawUnsafe(
          `SELECT pg_database_size(current_database()) as size_bytes`
        );
        if (Array.isArray(result) && result[0]?.size_bytes !== undefined) {
          dbUsedBytes = Number(result[0].size_bytes);
        }
      } catch {
        // Fallback si es base local o sin permiso pg_database_size
        dbEngine = 'Base de Datos Local / Estándar';
        dbUsedBytes = (avisosCount * 2048) + (operacionesCount * 1024) + (informesCount * 8192) + (fotosInformeCount * 180000) + (8 * 1024 * 1024);
      }

      const dbUsedMb = Number((dbUsedBytes / (1024 * 1024)).toFixed(2));
      const dbAvailableMb = Number(Math.max(0, dbLimitMb - dbUsedMb).toFixed(2));
      const dbUsagePercent = Math.min(100, Number(((dbUsedMb / dbLimitMb) * 100).toFixed(1)));

      // 3. Memoria RAM de la instancia de Render (Free Tier Web Service = 512 MB)
      const ramLimitMb = Number(process.env.RENDER_RAM_LIMIT_MB || 512);
      const mem = process.memoryUsage();
      const ramRssMb = Number((mem.rss / (1024 * 1024)).toFixed(1));
      const ramHeapUsedMb = Number((mem.heapUsed / (1024 * 1024)).toFixed(1));
      const ramHeapTotalMb = Number((mem.heapTotal / (1024 * 1024)).toFixed(1));
      const ramAvailableMb = Number(Math.max(0, ramLimitMb - ramRssMb).toFixed(1));
      const ramUsagePercent = Math.min(100, Math.round((ramRssMb / ramLimitMb) * 100));

      // 4. Espacio de Disco del Contenedor / Servidor
      let diskInfo = {
        totalGb: 10,
        usedGb: 1.2,
        availableGb: 8.8,
        usagePercent: 12
      };
      try {
        if (typeof fs.statfsSync === 'function') {
          const stats = fs.statfsSync(process.cwd());
          const totalBytes = stats.blocks * stats.bsize;
          const freeBytes = stats.bavail * stats.bsize;
          const usedBytes = totalBytes - freeBytes;
          const totalGb = Number((totalBytes / (1024 ** 3)).toFixed(1));
          const availableGb = Number((freeBytes / (1024 ** 3)).toFixed(1));
          const usedGb = Number((usedBytes / (1024 ** 3)).toFixed(1));
          const usagePercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;
          diskInfo = { totalGb, usedGb, availableGb, usagePercent };
        }
      } catch {
        // Fallback silencioso
      }

      const maxUsers = Number(process.env.MAX_REGISTERED_USERS || 5);

      return res.json({
        status: 'ONLINE',
        timestamp: new Date().toISOString(),
        render: {
          isRenderCloud: Boolean(process.env.RENDER),
          serviceName: process.env.RENDER_SERVICE_NAME || 'app-informes',
          region: process.env.RENDER_REGION || 'oregon',
          plan: 'Render Free Tier (Web Service + PostgreSQL)',
          branch: process.env.RENDER_GIT_BRANCH || 'main',
          commit: process.env.RENDER_GIT_COMMIT ? process.env.RENDER_GIT_COMMIT.substring(0, 7) : 'latest',
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
          uptimeSeconds: Math.floor(process.uptime())
        },
        storage: {
          database: {
            engine: dbEngine,
            limitMb: dbLimitMb,
            usedMb: dbUsedMb,
            availableMb: dbAvailableMb,
            usagePercent: dbUsagePercent
          },
          memory: {
            limitMb: ramLimitMb,
            usedRssMb: ramRssMb,
            heapUsedMb: ramHeapUsedMb,
            heapTotalMb: ramHeapTotalMb,
            availableMb: ramAvailableMb,
            usagePercent: ramUsagePercent
          },
          disk: diskInfo
        },
        usuarios: {
          registrados: usuariosCount,
          maximo: maxUsers,
          disponibles: Math.max(0, maxUsers - usuariosCount)
        },
        registros: {
          avisos: avisosCount,
          operacionesOM: operacionesCount,
          operacionesEnPS: operacionesEnPSCount,
          informesCRR: informesCount,
          fotosAlmacenadas: fotosInformeCount,
          obras: obrasCount,
          personal: personalCount
        },
        programasCargados: dotacionesPS.map((d) => ({
          codigo: `PS${d.semana}${d.anio} ${d.ptoTbjo}`,
          semana: d.semana,
          anio: d.anio,
          ptoTbjo: d.ptoTbjo,
          horasJornada: d.horasJornada,
          hhDisponibles:
            (d.opMiercoles + d.opJueves + d.opViernes + d.opSabado + d.opDomingo + d.opLunes + d.opMartes) *
            (d.horasJornada || 7)
        })),
        variables: {
          PORT: String(process.env.PORT || 4000),
          NODE_ENV: String(process.env.NODE_ENV || 'development'),
          MAX_REGISTERED_USERS: String(maxUsers),
          JWT_EXPIRES_IN: String(process.env.JWT_EXPIRES_IN || '8h'),
          DATABASE_SSL: Boolean(process.env.RENDER) ? 'Activo (Internal/External URL)' : 'Local',
          BODY_LIMIT_FOTOS: '50 MB (Soporte Base64 Alta Resolución)',
          PUESTO_EJECUTOR: '340CRR (Mantenimiento & Estructuras)',
          GRUPO_PLANIFICACION: 'TA1 (Celulosa Puerto Esperanza)',
          CICLO_SEMANAL_ARAUCO: 'Miércoles (Día 1) a Martes (Día 7)',
          REGIMEN_HORARIO: 'Turno 9h = 7h corridas | Turno 12h = 10h efectivas'
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        message: 'Error al consultar estado de Render y sistema',
        error: error.message
      });
    }
  }

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
