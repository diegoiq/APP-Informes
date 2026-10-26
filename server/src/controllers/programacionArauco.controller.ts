import { Request, Response } from 'express';
import prisma from '../database/db';
import { AraucoProgramParserService } from '../services/araucoProgramParser.service';

export class ProgramacionAraucoController {
  /**
   * Obtiene la planilla oficial del Programa Diario Semanal Arauco (formato PS432026)
   */
  public static async getProgramacion(req: Request, res: Response) {
    try {
      const semana = parseInt(String(req.query.semana || '43'), 10);
      const anio = parseInt(String(req.query.anio || '2026'), 10);
      const ptoTbjo = String(req.query.ptoTbjo || '340CRR').trim();

      // 1. Obtener o crear dotación semanal por defecto
      let dotacion = await prisma.dotacionSemanalArauco.findUnique({
        where: {
          semana_anio_ptoTbjo: {
            semana,
            anio,
            ptoTbjo
          }
        }
      });

      if (!dotacion) {
        // Calcular fecha de inicio aproximada para el Miércoles de esa semana
        const baseDate = new Date(anio, 0, 1);
        const dayOffset = (semana - 1) * 7;
        const fechaInicio = new Date(baseDate.getTime() + (dayOffset + 2) * 86400000); // Aproximado miércoles
        const fechaFin = new Date(fechaInicio.getTime() + 6 * 86400000);

        dotacion = await prisma.dotacionSemanalArauco.create({
          data: {
            semana,
            anio,
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
            horasJornada: 7
          }
        });
      }

      // 2. Obtener operaciones asignadas a esta semana
      const operaciones = await prisma.operacionOM.findMany({
        where: {
          semanaProg: semana,
          anioProg: anio,
          ...(ptoTbjo ? { ptoTbjo: { contains: ptoTbjo } } : {})
        },
        orderBy: [
          { numeroOrden: 'asc' },
          { numeroOperacion: 'asc' }
        ],
        include: {
          aviso: {
            select: {
              numeroAviso: true,
              descripcion: true,
              rubro: true
            }
          }
        }
      });

      // 3. Cálculos diarios y totales
      const jornada = dotacion.horasJornada || 7;
      const disp = {
        mi: dotacion.opMiercoles * jornada,
        ju: dotacion.opJueves * jornada,
        vi: dotacion.opViernes * jornada,
        sa: dotacion.opSabado * jornada,
        dom: dotacion.opDomingo * jornada,
        lu: dotacion.opLunes * jornada,
        ma: dotacion.opMartes * jornada,
        total: (dotacion.opMiercoles + dotacion.opJueves + dotacion.opViernes + dotacion.opSabado + dotacion.opDomingo + dotacion.opLunes + dotacion.opMartes) * jornada
      };

      const prog = {
        mi: operaciones.reduce((acc, o) => acc + o.hhMiercoles, 0),
        ju: operaciones.reduce((acc, o) => acc + o.hhJueves, 0),
        vi: operaciones.reduce((acc, o) => acc + o.hhViernes, 0),
        sa: operaciones.reduce((acc, o) => acc + o.hhSabado, 0),
        dom: operaciones.reduce((acc, o) => acc + o.hhDomingo, 0),
        lu: operaciones.reduce((acc, o) => acc + o.hhLunes, 0),
        ma: operaciones.reduce((acc, o) => acc + o.hhMartes, 0),
        total: operaciones.reduce((acc, o) => acc + o.hhTotalProgramado, 0)
      };

      const densidad = {
        mi: disp.mi > 0 ? Math.round((prog.mi / disp.mi) * 100) : 0,
        ju: disp.ju > 0 ? Math.round((prog.ju / disp.ju) * 100) : 0,
        vi: disp.vi > 0 ? Math.round((prog.vi / disp.vi) * 100) : 0,
        sa: disp.sa > 0 ? Math.round((prog.sa / disp.sa) * 100) : 0,
        dom: disp.dom > 0 ? Math.round((prog.dom / disp.dom) * 100) : 0,
        lu: disp.lu > 0 ? Math.round((prog.lu / disp.lu) * 100) : 0,
        ma: disp.ma > 0 ? Math.round((prog.ma / disp.ma) * 100) : 0,
        total: disp.total > 0 ? Math.round((prog.total / disp.total) * 100) : 0
      };

      return res.json({
        semana,
        anio,
        dotacion,
        operaciones,
        horasDisponibles: disp,
        horasProgramadas: prog,
        densidad
      });
    } catch (error: any) {
      console.error('Error al obtener programación Arauco:', error);
      return res.status(500).json({ message: 'Error al obtener programación', error: error.message });
    }
  }

  /**
   * Actualiza la dotación diaria de operarios para la semana
   */
  public static async updateDotacion(req: Request, res: Response) {
    try {
      const {
        semana,
        anio,
        ptoTbjo = '340CRR',
        opMiercoles,
        opJueves,
        opViernes,
        opSabado,
        opDomingo,
        opLunes,
        opMartes,
        horasJornada = 7,
        comentario
      } = req.body;

      const updated = await prisma.dotacionSemanalArauco.upsert({
        where: {
          semana_anio_ptoTbjo: {
            semana: Number(semana),
            anio: Number(anio),
            ptoTbjo: String(ptoTbjo)
          }
        },
        update: {
          ...(opMiercoles !== undefined && { opMiercoles: Number(opMiercoles) }),
          ...(opJueves !== undefined && { opJueves: Number(opJueves) }),
          ...(opViernes !== undefined && { opViernes: Number(opViernes) }),
          ...(opSabado !== undefined && { opSabado: Number(opSabado) }),
          ...(opDomingo !== undefined && { opDomingo: Number(opDomingo) }),
          ...(opLunes !== undefined && { opLunes: Number(opLunes) }),
          ...(opMartes !== undefined && { opMartes: Number(opMartes) }),
          ...(horasJornada !== undefined && { horasJornada: Number(horasJornada) }),
          ...(comentario !== undefined && { comentario: String(comentario) })
        },
        create: {
          semana: Number(semana),
          anio: Number(anio),
          ptoTbjo: String(ptoTbjo),
          grupoPlanif: 'TA1',
          fechaInicio: new Date(),
          fechaFin: new Date(Date.now() + 6 * 86400000),
          opMiercoles: Number(opMiercoles ?? 7),
          opJueves: Number(opJueves ?? 8),
          opViernes: Number(opViernes ?? 8),
          opSabado: Number(opSabado ?? 0),
          opDomingo: Number(opDomingo ?? 0),
          opLunes: Number(opLunes ?? 7),
          opMartes: Number(opMartes ?? 8),
          horasJornada: Number(horasJornada ?? 7),
          comentario: comentario ? String(comentario) : undefined
        }
      });

      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al actualizar dotación', error: error.message });
    }
  }

  /**
   * Guarda o actualiza la asignación de horas de una operación en la semana
   */
  public static async saveOperacion(req: Request, res: Response) {
    try {
      const {
        id,
        numeroOrden,
        numeroOperacion,
        textoOperacion,
        ubicacionTecnica,
        semanaProg,
        anioProg,
        hhMiercoles = 0,
        hhJueves = 0,
        hhViernes = 0,
        hhSabado = 0,
        hhDomingo = 0,
        hhLunes = 0,
        hhMartes = 0
      } = req.body;

      const mi = Number(hhMiercoles) || 0;
      const ju = Number(hhJueves) || 0;
      const vi = Number(hhViernes) || 0;
      const sa = Number(hhSabado) || 0;
      const dom = Number(hhDomingo) || 0;
      const lu = Number(hhLunes) || 0;
      const ma = Number(hhMartes) || 0;
      const total = mi + ju + vi + sa + dom + lu + ma;

      let op;
      if (id) {
        op = await prisma.operacionOM.update({
          where: { id },
          data: {
            semanaProg: Number(semanaProg),
            anioProg: Number(anioProg),
            hhMiercoles: mi,
            hhJueves: ju,
            hhViernes: vi,
            hhSabado: sa,
            hhDomingo: dom,
            hhLunes: lu,
            hhMartes: ma,
            hhTotalProgramado: total,
            ...(textoOperacion && { textoOperacion: String(textoOperacion) }),
            ...(ubicacionTecnica && { ubicacionTecnica: String(ubicacionTecnica) })
          }
        });
      } else if (numeroOrden && numeroOperacion) {
        op = await prisma.operacionOM.upsert({
          where: {
            numeroOrden_numeroOperacion: {
              numeroOrden: String(numeroOrden),
              numeroOperacion: String(numeroOperacion)
            }
          },
          update: {
            semanaProg: Number(semanaProg),
            anioProg: Number(anioProg),
            hhMiercoles: mi,
            hhJueves: ju,
            hhViernes: vi,
            hhSabado: sa,
            hhDomingo: dom,
            hhLunes: lu,
            hhMartes: ma,
            hhTotalProgramado: total
          },
          create: {
            numeroOrden: String(numeroOrden),
            numeroOperacion: String(numeroOperacion),
            textoOperacion: String(textoOperacion || 'Operación Mantenimiento'),
            ubicacionTecnica: ubicacionTecnica ? String(ubicacionTecnica) : undefined,
            ptoTbjo: '340CRR',
            revision: `PS${semanaProg}${anioProg}`,
            horasEstimadas: total,
            semanaProg: Number(semanaProg),
            anioProg: Number(anioProg),
            hhMiercoles: mi,
            hhJueves: ju,
            hhViernes: vi,
            hhSabado: sa,
            hhDomingo: dom,
            hhLunes: lu,
            hhMartes: ma,
            hhTotalProgramado: total
          }
        });
      } else {
        return res.status(400).json({ message: 'Se requiere ID o N° Orden y Operación' });
      }

      return res.json(op);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al guardar operación', error: error.message });
    }
  }

  /**
   * Remueve una operación de la semana de programación
   */
  public static async removeOperacion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await prisma.operacionOM.update({
        where: { id },
        data: {
          semanaProg: null,
          anioProg: null,
          hhMiercoles: 0,
          hhJueves: 0,
          hhViernes: 0,
          hhSabado: 0,
          hhDomingo: 0,
          hhLunes: 0,
          hhMartes: 0,
          hhTotalProgramado: 0
        }
      });
      return res.json({ message: 'Operación removida de la semana', operacion: updated });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al remover operación', error: error.message });
    }
  }

  /**
   * Sube e importa el archivo oficial del programa semanal (PS432026 340CRR.xlsm)
   */
  public static async uploadPSFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se adjuntó ningún archivo (.xlsm o .xlsx).' });
      }

      const summary = await AraucoProgramParserService.processProgramFile(
        req.file.buffer,
        req.file.originalname
      );

      return res.json({
        message: 'Programa semanal Arauco importado con éxito',
        summary
      });
    } catch (error: any) {
      console.error('Error al importar programa semanal:', error);
      return res.status(500).json({
        message: 'Error al importar programa semanal Arauco',
        error: error.message || String(error)
      });
    }
  }

  /**
   * Lista operaciones del Backlog de IW37N para agregar al programa semanal
   */
  public static async getBacklogOperaciones(req: Request, res: Response) {
    try {
      const {
        search,
        sinSemana,
        revision,
        ptoTbjo = '340CRR'
      } = req.query;

      const where: any = {};
      const andConditions: any[] = [];

      if (search) {
        const query = String(search).trim();
        andConditions.push({
          OR: [
            { numeroOrden: { contains: query } },
            { numeroOperacion: { contains: query } },
            { textoOperacion: { contains: query } },
            { ubicacionTecnica: { contains: query } }
          ]
        });
      }

      if (sinSemana === 'true') {
        andConditions.push({ semanaProg: null });
      }

      if (revision) {
        andConditions.push({ revision: { contains: String(revision).trim() } });
      }

      if (ptoTbjo) {
        andConditions.push({ ptoTbjo: { contains: String(ptoTbjo).trim() } });
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const operaciones = await prisma.operacionOM.findMany({
        where,
        take: 100,
        orderBy: [
          { horasEstimadas: 'desc' },
          { numeroOrden: 'asc' }
        ],
        include: {
          aviso: {
            select: {
              numeroAviso: true,
              descripcion: true,
              rubro: true
            }
          }
        }
      });

      return res.json(operaciones);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener backlog de operaciones', error: error.message });
    }
  }
}
