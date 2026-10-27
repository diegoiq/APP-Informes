import { Request, Response } from 'express';
import prisma from '../database/db';
import { SapParserService } from '../services/sapParser.service';
import path from 'path';
import fs from 'fs';

export class AvisosController {
  /**
   * Sube y procesa el archivo Excel Panel-Avisos-OM.xlsx
   */
  public static async uploadExcel(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se ha adjuntado ningún archivo Excel (.xlsx).' });
      }

      const summary = await SapParserService.processExcelFile(
        req.file.buffer,
        req.file.originalname
      );

      return res.json({
        message: 'Archivo SAP procesado exitosamente',
        summary
      });
    } catch (error: any) {
      console.error('Error al procesar archivo SAP:', error);
      return res.status(500).json({
        message: 'Error al procesar el archivo Excel',
        error: error.message || String(error)
      });
    }
  }

  /**
   * Obtiene estadísticas agregadas de avisos (abiertos vs cerrados vs OMs)
   */
  public static async getStats(req: Request, res: Response) {
    try {
      const [total, abiertos, cerrados, conOM, sinOM] = await Promise.all([
        prisma.aviso.count(),
        prisma.aviso.count({
          where: {
            NOT: [
              { estadoSistema: { contains: 'MECE' } },
              { estadoSistema: { contains: 'CTEC' } },
              { estadoSistema: { contains: 'CERR' } }
            ]
          }
        }),
        prisma.aviso.count({
          where: {
            OR: [
              { estadoSistema: { contains: 'MECE' } },
              { estadoSistema: { contains: 'CTEC' } },
              { estadoSistema: { contains: 'CERR' } }
            ]
          }
        }),
        prisma.aviso.count({
          where: {
            numeroOrden: { not: null }
          }
        }),
        prisma.aviso.count({
          where: {
            numeroOrden: null
          }
        })
      ]);

      return res.json({
        total,
        abiertos,
        cerrados,
        conOM,
        sinOM
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener estadísticas de avisos', error: error.message });
    }
  }

  /**
   * Obtiene lista de revisiones únicas existentes en la base de datos (PS, Obras, etc.)
   */
  public static async getRevisiones(req: Request, res: Response) {
    try {
      const records = await prisma.aviso.findMany({
        where: {
          revision: { not: null }
        },
        select: {
          revision: true
        },
        distinct: ['revision']
      });

      const revisiones = records
        .map(r => r.revision?.trim())
        .filter((r): r is string => Boolean(r && r.length > 0))
        .sort((a, b) => a.localeCompare(b));

      return res.json(revisiones);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener revisiones', error: error.message });
    }
  }

  /**
   * Lista todos los avisos con filtros operacionales
   */
  public static async list(req: Request, res: Response) {
    try {
      const {
        search,
        rubro,
        prioridadReal,
        solo340CRR,
        faseAvance,
        estado,
        conOM,
        revision
      } = req.query;

      const where: any = {};
      const andConditions: any[] = [];

      if (search) {
        const query = String(search).trim();
        andConditions.push({
          OR: [
            { numeroAviso: { contains: query } },
            { numeroOrden: { contains: query } },
            { descripcion: { contains: query } },
            { ubicacionTecnica: { contains: query } },
            { revision: { contains: query } }
          ]
        });
      }

      if (estado === 'abiertos') {
        andConditions.push({
          NOT: [
            { estadoSistema: { contains: 'MECE' } },
            { estadoSistema: { contains: 'CTEC' } },
            { estadoSistema: { contains: 'CERR' } }
          ]
        });
      } else if (estado === 'cerrados') {
        andConditions.push({
          OR: [
            { estadoSistema: { contains: 'MECE' } },
            { estadoSistema: { contains: 'CTEC' } },
            { estadoSistema: { contains: 'CERR' } }
          ]
        });
      }

      if (conOM === 'true') {
        andConditions.push({
          numeroOrden: { not: null }
        });
      } else if (conOM === 'false') {
        andConditions.push({
          numeroOrden: null
        });
      }

      if (revision) {
        const rev = String(revision).trim();
        if (rev === 'PS') {
          // Filtra cualquier revisión de Programa Semanal (ej: PS432026, PS502026, etc.)
          andConditions.push({
            revision: { contains: 'PS' }
          });
        } else if (rev === 'OBRA' || rev === 'OBRAS') {
          // Filtra cualquier revisión de Obras (ej: OBRAS26, OBRA2026, OBRAS25, etc.)
          andConditions.push({
            revision: { contains: 'OBRA' }
          });
        } else if (rev === 'sin_revision') {
          // Avisos u órdenes sin revisión asignada
          andConditions.push({
            OR: [
              { revision: null },
              { revision: '' }
            ]
          });
        } else {
          // Filtro por revisión específica seleccionada
          andConditions.push({
            revision: { contains: rev }
          });
        }
      }

      if (solo340CRR === 'true') {
        andConditions.push({
          OR: [
            { ptoTbjoResponsable: { contains: '340CRR' } },
            { ptoTbjoResponsable: null }
          ]
        });
      }

      if (rubro) {
        where.rubro = String(rubro);
      }

      if (prioridadReal) {
        where.prioridadRealAcordada = Number(prioridadReal);
      }

      if (faseAvance) {
        where.faseAvance = String(faseAvance);
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const avisos = await prisma.aviso.findMany({
        where,
        orderBy: [
          { prioridadRealAcordada: 'asc' },
          { creadoEn: 'desc' }
        ],
        include: {
          contactosTriaje: {
            orderBy: { fecha: 'desc' }
          }
        }
      });

      return res.json(avisos);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener avisos', error: error.message });
    }
  }

  /**
   * Obtiene un aviso específico por ID
   */
  public static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const aviso = await prisma.aviso.findUnique({
        where: { id },
        include: {
          contactosTriaje: {
            orderBy: { fecha: 'desc' }
          },
          programaciones: {
            include: { personal: true }
          }
        }
      });

      if (!aviso) {
        return res.status(404).json({ message: 'Aviso no encontrado' });
      }

      return res.json(aviso);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener aviso', error: error.message });
    }
  }

  /**
   * Actualiza datos de campo y triaje de un aviso (notas, horas, asignado, prioridad acordada)
   */
  public static async updateFieldData(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        prioridadRealAcordada,
        notasCampo,
        horasRealesIncurridas,
        asignadoAId,
        faseAvance,
        rubro,
        tipoRiesgo,
        tipoCondicionFinal
      } = req.body;

      const updated = await prisma.aviso.update({
        where: { id },
        data: {
          ...(prioridadRealAcordada !== undefined && { prioridadRealAcordada: Number(prioridadRealAcordada) }),
          ...(notasCampo !== undefined && { notasCampo: String(notasCampo) }),
          ...(horasRealesIncurridas !== undefined && { horasRealesIncurridas: Number(horasRealesIncurridas) }),
          ...(asignadoAId !== undefined && { asignadoAId: String(asignadoAId) }),
          ...(faseAvance !== undefined && { faseAvance: String(faseAvance) }),
          ...(rubro !== undefined && { rubro: String(rubro) }),
          ...(tipoRiesgo !== undefined && { tipoRiesgo: String(tipoRiesgo) }),
          ...(tipoCondicionFinal !== undefined && { tipoCondicionFinal: String(tipoCondicionFinal) })
        }
      });

      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al actualizar datos de campo del aviso', error: error.message });
    }
  }

  /**
   * Descarga la plantilla o archivo de muestra Panel-Avisos-OM.xlsx
   */
  public static async downloadSample(req: Request, res: Response) {
    try {
      const samplePath = path.resolve(__dirname, '../../uploads/Panel-Avisos-OM.xlsx');
      if (fs.existsSync(samplePath)) {
        return res.download(samplePath, 'Panel-Avisos-OM.xlsx');
      }
      return res.status(404).json({ message: 'Archivo de muestra no generado aún en el servidor.' });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al descargar archivo de muestra', error: error.message });
    }
  }
}
