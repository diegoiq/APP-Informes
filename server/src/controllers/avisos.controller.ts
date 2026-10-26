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
   * Lista todos los avisos con filtros operacionales
   */
  public static async list(req: Request, res: Response) {
    try {
      const {
        search,
        rubro,
        prioridadReal,
        solo340CRR,
        faseAvance
      } = req.query;

      const where: any = {};

      if (search) {
        const query = String(search).trim();
        where.OR = [
          { numeroAviso: { contains: query } },
          { numeroOrden: { contains: query } },
          { descripcion: { contains: query } },
          { ubicacionTecnica: { contains: query } }
        ];
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

      if (solo340CRR === 'true') {
        where.ptoTbjoResponsable = { contains: '340CRR' };
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
