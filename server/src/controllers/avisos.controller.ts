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
   * Relevamiento de terreno y movilización de requerimiento a Parada Semanal (PS) con HH
   */
  public static async guardarRelevamiento(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        comentariosTerreno,
        fotosInspeccion,
        horasEstimadas,
        personasEstimadas,
        revisionPs,
        diaSemana = 'mi'
      } = req.body;

      const aviso = await prisma.aviso.findUnique({
        where: { id }
      });

      if (!aviso) {
        return res.status(404).json({ message: 'Aviso no encontrado' });
      }

      const hs = Number(horasEstimadas) || 0;
      const personas = Math.max(1, Number(personasEstimadas) || 1);
      const totalHH = hs * personas;

      let serializedFotos: string | undefined = undefined;
      if (Array.isArray(fotosInspeccion)) {
        serializedFotos = JSON.stringify(fotosInspeccion);
      } else if (typeof fotosInspeccion === 'string') {
        serializedFotos = fotosInspeccion;
      }

      const revPsClean = revisionPs ? String(revisionPs).trim().toUpperCase() : 'PS43';

      // 1. Actualizar campos protegidos de terreno en el Aviso
      const updatedAviso = await prisma.aviso.update({
        where: { id },
        data: {
          comentariosTerreno: comentariosTerreno !== undefined ? String(comentariosTerreno) : aviso.comentariosTerreno,
          notasCampo: comentariosTerreno !== undefined ? String(comentariosTerreno) : aviso.notasCampo,
          fotosInspeccion: serializedFotos !== undefined ? serializedFotos : aviso.fotosInspeccion,
          revisionPs: revPsClean,
          revision: revPsClean,
          hhEstimadasTerreno: totalHH,
          personasEstimadas: personas,
          horasRealesIncurridas: totalHH,
          hhRealesAcumuladas: totalHH,
          faseAvance: '2. En Ejecución'
        }
      });

      // 2. Extraer semana y año del código de parada (ej: PS43, PS442026, PS50)
      let semanaNum = 43;
      let anioNum = 2026;
      const match = revPsClean.match(/PS(\d{1,2})(?:(\d{4}))?/i);
      if (match) {
        semanaNum = parseInt(match[1], 10);
        if (match[2]) anioNum = parseInt(match[2], 10);
      }

      const ptoTbjo = aviso.ptoTbjoResponsable || '340CRR';

      // 3. Asegurar que exista la dotación semanal para que compute la capacidad neta
      let dotacion = await prisma.dotacionSemanalArauco.findUnique({
        where: {
          semana_anio_ptoTbjo: {
            semana: semanaNum,
            anio: anioNum,
            ptoTbjo
          }
        }
      });

      if (!dotacion) {
        const baseDate = new Date(anioNum, 0, 1);
        const dayOffset = (semanaNum - 1) * 7;
        const fechaInicio = new Date(baseDate.getTime() + (dayOffset + 2) * 86400000);
        const fechaFin = new Date(fechaInicio.getTime() + 6 * 86400000);

        dotacion = await prisma.dotacionSemanalArauco.create({
          data: {
            semana: semanaNum,
            anio: anioNum,
            ptoTbjo,
            grupoPlanif: 'TA1',
            fechaInicio,
            fechaFin,
            opMiercoles: 7,
            opJueves: 8,
            opViernes: 8,
            opSabado: 0,
            opDomingo: 0,
            opLunes: 7,
            opMartes: 8,
            horasJornada: 7,
            activo: true
          }
        });
      }

      // 4. Impactar la demanda de HH en la semana seleccionada (OperacionOM)
      const numOrden = aviso.numeroOrden || `OT-${aviso.numeroAviso}`;
      let operacion = await prisma.operacionOM.findFirst({
        where: {
          OR: [
            { avisoId: aviso.id },
            { numeroOrden: numOrden }
          ]
        }
      });

      const dayKey = String(diaSemana).toLowerCase();
      const dailyHH = {
        hhMiercoles: dayKey === 'mi' ? totalHH : 0,
        hhJueves: dayKey === 'ju' ? totalHH : 0,
        hhViernes: dayKey === 'vi' ? totalHH : 0,
        hhSabado: dayKey === 'sa' ? totalHH : 0,
        hhDomingo: dayKey === 'dom' ? totalHH : 0,
        hhLunes: dayKey === 'lu' ? totalHH : 0,
        hhMartes: dayKey === 'ma' ? totalHH : 0,
      };

      if (operacion) {
        operacion = await prisma.operacionOM.update({
          where: { id: operacion.id },
          data: {
            avisoId: aviso.id,
            semanaProg: semanaNum,
            anioProg: anioNum,
            revision: revPsClean,
            horasEstimadas: totalHH,
            hhTotalProgramado: totalHH,
            ...dailyHH,
            activo: true
          }
        });
      } else {
        operacion = await prisma.operacionOM.create({
          data: {
            numeroOrden: numOrden,
            numeroOperacion: '0010',
            textoOperacion: `${aviso.descripcion.substring(0, 90)} [Relevado Terreno]`,
            ubicacionTecnica: aviso.ubicacionTecnica,
            ptoTbjo,
            revision: revPsClean,
            horasEstimadas: totalHH,
            semanaProg: semanaNum,
            anioProg: anioNum,
            hhTotalProgramado: totalHH,
            ...dailyHH,
            avisoId: aviso.id,
            activo: true
          }
        });
      }

      return res.json({
        message: `Aviso ${aviso.numeroAviso} relevado y movilizado a ${revPsClean} (${totalHH} HH impactadas)`,
        aviso: updatedAviso,
        operacion,
        semana: semanaNum,
        anio: anioNum,
        totalHH
      });
    } catch (error: any) {
      console.error('Error al guardar relevamiento y movilizar a PS:', error);
      return res.status(500).json({
        message: 'Error al procesar relevamiento y movilización',
        error: error.message || String(error)
      });
    }
  }

  /**
   * Soft-delete de aviso
   */
  public static async deleteAviso(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.aviso.update({
        where: { id },
        data: { activo: false }
      });
      return res.json({ message: 'Aviso marcado como inactivo (soft-delete)' });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al eliminar aviso', error: error.message });
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
