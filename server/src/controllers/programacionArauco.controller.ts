import { Request, Response } from 'express';
import prisma from '../database/db';
import { AraucoProgramParserService } from '../services/araucoProgramParser.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class ProgramacionAraucoController {
  /**
   * Sincroniza y almacena automáticamente el Informe de Trabajos de la Semana
   * con el nombre del PS en curso (ej: "PS442026 340CRR") uniendo comentarios y fotos de cada línea.
   */
  public static async syncInformeSemanal(
    semana: number,
    anio: number,
    ptoTbjo: string = '340CRR',
    userId?: string
  ) {
    const codigoPS = `PS${semana}${anio} ${ptoTbjo}`;

    // Buscar usuario responsable (el actual o el primer admin/usuario activo)
    let responsableId = userId;
    if (!responsableId) {
      const firstUser = await prisma.usuario.findFirst({
        orderBy: { creadoEn: 'asc' }
      });
      if (!firstUser) return null;
      responsableId = firstUser.id;
    }

    const dotacion = await prisma.dotacionSemanalArauco.findUnique({
      where: {
        semana_anio_ptoTbjo: { semana, anio, ptoTbjo }
      }
    });

    const operaciones = await prisma.operacionOM.findMany({
      where: {
        semanaProg: semana,
        anioProg: anio,
        ...(ptoTbjo ? { ptoTbjo: { contains: ptoTbjo } } : {})
      },
      orderBy: [{ numeroOrden: 'asc' }, { numeroOperacion: 'asc' }]
    });

    const jornada = dotacion?.horasJornada || 7;
    const totalOpSemana = dotacion
      ? dotacion.opMiercoles +
        dotacion.opJueves +
        dotacion.opViernes +
        dotacion.opSabado +
        dotacion.opDomingo +
        dotacion.opLunes +
        dotacion.opMartes
      : 36;
    const hhDisp = totalOpSemana * jornada;
    const hhProg = operaciones.reduce((acc, o) => acc + o.hhTotalProgramado, 0);
    const densidad = hhDisp > 0 ? Math.round((hhProg / hhDisp) * 100) : 0;

    const fIniStr = dotacion?.fechaInicio
      ? new Date(dotacion.fechaInicio).toLocaleDateString('es-CL')
      : `Semana ${semana}/${anio}`;
    const fFinStr = dotacion?.fechaFin
      ? new Date(dotacion.fechaFin).toLocaleDateString('es-CL')
      : `Semana ${semana}/${anio}`;

    // Recolectar líneas con comentarios o fotos y construir resumen de trabajos
    const fotosParaInforme: Array<{
      etapa: string;
      url: string;
      diagnosticoTecnico: string;
      pieDeFoto: string;
    }> = [];

    const lineasConEvidencia: string[] = [];
    const lineasResumenGeneral: string[] = [];

    for (const op of operaciones) {
      let parsedFotos: any[] = [];
      if (op.fotosEjecucion) {
        try {
          const parsed = JSON.parse(op.fotosEjecucion);
          if (Array.isArray(parsed)) parsedFotos = parsed;
        } catch {
          // ignore parse error
        }
      }

      const estado = op.estadoEjecucion || 'Pendiente';
      const tieneComentario = Boolean(op.comentariosEjecucion && op.comentariosEjecucion.trim());
      const tieneFotos = parsedFotos.length > 0;

      const lineaTexto = `• OT ${op.numeroOrden} (Op. ${op.numeroOperacion}) | Ubic: ${op.ubicacionTecnica || '340CRR'} | ${op.textoOperacion} (${op.hhTotalProgramado} HH) — Estado: [${estado}]${
        tieneComentario ? `\n   ↳ Comentario de Ejecución: ${op.comentariosEjecucion?.trim()}` : ''
      }${tieneFotos ? ` (${parsedFotos.length} foto${parsedFotos.length > 1 ? 's' : ''} adjunta${parsedFotos.length > 1 ? 's' : ''})` : ''}`;

      lineasResumenGeneral.push(lineaTexto);
      if (tieneComentario || tieneFotos || estado !== 'Pendiente') {
        lineasConEvidencia.push(lineaTexto);
      }

      for (const f of parsedFotos) {
        const url = typeof f === 'string' ? f : f.url;
        if (!url) continue;
        const etapa = (typeof f === 'object' && f.etapa) ? f.etapa : 'Durante';
        const comentFoto = (typeof f === 'object' && f.comentario) ? f.comentario : '';
        fotosParaInforme.push({
          etapa,
          url,
          diagnosticoTecnico: `OT ${op.numeroOrden} / Op ${op.numeroOperacion} — ${op.textoOperacion}${
            comentFoto
              ? `: ${comentFoto}`
              : tieneComentario
              ? `: ${op.comentariosEjecucion}`
              : ''
          }`,
          pieDeFoto: `${codigoPS} | Ubicación: ${op.ubicacionTecnica || '340CRR'} | Estado: ${estado} (${op.hhTotalProgramado} HH)`
        });
      }
    }

    const objetivo = `Informe consolidado de trabajos de la semana correspondiente al Programa Semanal ${codigoPS} (Período ${fIniStr} al ${fFinStr}). Capacidad disponible: ${hhDisp} HH | Total programado: ${hhProg} HH (${operaciones.length} operaciones, Densidad: ${densidad}%). Líneas con seguimiento/evidencia cargada: ${lineasConEvidencia.length} de ${operaciones.length}.`;

    const observaciones =
      lineasConEvidencia.length > 0
        ? `Avance semanal ${codigoPS}: ${lineasConEvidencia.length} operación(es) con comentarios/evidencias fotográficas (${fotosParaInforme.length} fotos registradas).`
        : `Programa Semanal ${codigoPS} activo con ${operaciones.length} operaciones programadas (${hhProg} HH).`;

    const lugarObraTexto =
      lineasConEvidencia.length > 0
        ? `DETALLE DE TRABAJOS CON COMENTARIOS Y EVIDENCIAS (${codigoPS}):\n${lineasConEvidencia.join('\n\n')}\n\n---\nLISTADO COMPLETO DE OPERACIONES DEL PROGRAMA (${operaciones.length} líneas):\n${lineasResumenGeneral.join('\n')}`
        : `LISTADO DE OPERACIONES PROGRAMADAS EN ${codigoPS} (${operaciones.length} líneas):\n${lineasResumenGeneral.join('\n')}`;

    const anexosTexto = `Resumen de Capacidad Semanal ${codigoPS}: Miércoles (${dotacion?.opMiercoles ?? 4} op), Jueves (${dotacion?.opJueves ?? 6} op), Viernes (${dotacion?.opViernes ?? 8} op), Sábado (${dotacion?.opSabado ?? 0} op), Domingo (${dotacion?.opDomingo ?? 0} op), Lunes (${dotacion?.opLunes ?? 9} op), Martes (${dotacion?.opMartes ?? 9} op). Total HH Programadas: ${hhProg} HH / ${hhDisp} HH disponibles (${densidad}%).`;

    // Verificar si ya existe el Informe Semanal para este PS
    const existente = await prisma.informeCRR.findUnique({
      where: { codigoInforme: codigoPS }
    });

    if (existente) {
      await prisma.fotoInformeCRR.deleteMany({
        where: { informeId: existente.id }
      });

      const actualizado = await prisma.informeCRR.update({
        where: { id: existente.id },
        data: {
          tipoInforme: 'INFORME TRABAJOS DE LA SEMANA',
          titulo: `INFORME DE TRABAJOS DE LA SEMANA - ${codigoPS}`,
          observaciones,
          ubicacionTecnica: `Planta Celulosa Puerto Esperanza - Sector ${ptoTbjo}`,
          avisoNumero: `PS${semana}-${anio}`,
          ordenNumero: `${operaciones.length} OTs`,
          objetivo,
          lugarObraTexto,
          anexosTexto,
          fotos: {
            create: fotosParaInforme
          }
        },
        include: {
          fotos: true,
          responsable: {
            select: { id: true, nombre: true, email: true }
          }
        }
      });
      return actualizado;
    } else {
      const creado = await prisma.informeCRR.create({
        data: {
          codigoInforme: codigoPS,
          tipoInforme: 'INFORME TRABAJOS DE LA SEMANA',
          titulo: `INFORME DE TRABAJOS DE LA SEMANA - ${codigoPS}`,
          empresaContratista: 'DOTACIÓN PROPIA / CONTRATISTA 340CRR',
          observaciones,
          distribucion: `Inspección Técnica Arauco / Planificación ${ptoTbjo}`,
          copiaAsignada: 'Jefatura Mantenimiento & Estructuras 340CRR',
          responsableId,
          avisoNumero: `PS${semana}-${anio}`,
          ordenNumero: `${operaciones.length} OTs`,
          ubicacionTecnica: `Planta Celulosa Puerto Esperanza - Sector ${ptoTbjo}`,
          objetivo,
          lugarObraTexto,
          anexosTexto,
          estado: 'En Curso',
          fotos: {
            create: fotosParaInforme
          }
        },
        include: {
          fotos: true,
          responsable: {
            select: { id: true, nombre: true, email: true }
          }
        }
      });
      return creado;
    }
  }

  /**
   * Obtiene la planilla oficial del Programa Diario Semanal Arauco (formato PS442026)
   */
  public static async getProgramacion(req: Request, res: Response) {
    try {
      const ptoTbjo = String(req.query.ptoTbjo || '340CRR').trim();

      // Obtener lista de semanas cargadas en la base de datos
      const semanasDisponibles = await prisma.dotacionSemanalArauco.findMany({
        where: { ptoTbjo },
        orderBy: [{ anio: 'desc' }, { semana: 'desc' }],
        select: { semana: true, anio: true, fechaInicio: true, fechaFin: true }
      });

      let semana = req.query.semana ? parseInt(String(req.query.semana), 10) : 44;
      let anio = req.query.anio ? parseInt(String(req.query.anio), 10) : 2026;

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
        const fechaInicio = new Date(baseDate.getTime() + (dayOffset + 2) * 86400000);
        const fechaFin = new Date(fechaInicio.getTime() + 6 * 86400000);

        dotacion = await prisma.dotacionSemanalArauco.create({
          data: {
            semana,
            anio,
            ptoTbjo,
            grupoPlanif: 'TA1',
            fechaInicio,
            fechaFin,
            opMiercoles: semana === 44 ? 4 : 7,
            opJueves: semana === 44 ? 6 : 8,
            opViernes: 8,
            opSabado: 0,
            opDomingo: 0,
            opLunes: semana === 44 ? 9 : 7,
            opMartes: semana === 44 ? 9 : 8,
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
              id: true,
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

      // 4. Obtener Informe Semanal en curso asociado a este PS (ej: "PS442026 340CRR")
      const codigoPS = `PS${semana}${anio} ${ptoTbjo}`;
      const informeSemanal = await prisma.informeCRR.findUnique({
        where: { codigoInforme: codigoPS },
        include: {
          fotos: true,
          responsable: {
            select: { id: true, nombre: true, email: true }
          }
        }
      });

      return res.json({
        semana,
        anio,
        codigoPS,
        dotacion,
        operaciones,
        horasDisponibles: disp,
        horasProgramadas: prog,
        densidad,
        informeSemanal,
        semanasDisponibles
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
          opMiercoles: Number(opMiercoles ?? 4),
          opJueves: Number(opJueves ?? 6),
          opViernes: Number(opViernes ?? 8),
          opSabado: Number(opSabado ?? 0),
          opDomingo: Number(opDomingo ?? 0),
          opLunes: Number(opLunes ?? 9),
          opMartes: Number(opMartes ?? 9),
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
   * Guarda fotos y comentarios en una línea de operación del PS y actualiza automáticamente
   * el Informe de Trabajos de la Semana con el nombre del PS en curso (ej. PS442026 340CRR)
   */
  public static async guardarEvidenciaOperacion(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        estadoEjecucion = 'En Ejecución',
        comentariosEjecucion = '',
        fotosEjecucion = []
      } = req.body;

      const opExistente = await prisma.operacionOM.findUnique({ where: { id } });
      if (!opExistente) {
        return res.status(404).json({ message: 'Operación del PS no encontrada' });
      }

      const serializedFotos = Array.isArray(fotosEjecucion)
        ? JSON.stringify(fotosEjecucion)
        : typeof fotosEjecucion === 'string'
        ? fotosEjecucion
        : '[]';

      const opActualizada = await prisma.operacionOM.update({
        where: { id },
        data: {
          estadoEjecucion: String(estadoEjecucion),
          comentariosEjecucion: String(comentariosEjecucion),
          fotosEjecucion: serializedFotos,
          fechaEjecucion: new Date()
        }
      });

      const semana = opActualizada.semanaProg || 44;
      const anio = opActualizada.anioProg || 2026;
      const ptoTbjo = opActualizada.ptoTbjo || '340CRR';

      // Sincronizar automáticamente con el Informe de Trabajos de la Semana del PS en curso
      const informeSemanal = await ProgramacionAraucoController.syncInformeSemanal(
        semana,
        anio,
        ptoTbjo,
        req.user?.id
      );

      return res.json({
        message: `Evidencia guardada y unida al informe semanal PS${semana}${anio} ${ptoTbjo}`,
        operacion: opActualizada,
        informeSemanal
      });
    } catch (error: any) {
      console.error('Error al guardar evidencia de operación PS:', error);
      return res.status(500).json({
        message: 'Error al guardar evidencia en la línea del PS',
        error: error.message
      });
    }
  }

  /**
   * Genera o sincroniza bajo demanda el Informe Semanal del PS en curso
   */
  public static async syncInformeSemanalEndpoint(req: AuthenticatedRequest, res: Response) {
    try {
      const { semana = 44, anio = 2026, ptoTbjo = '340CRR' } = req.body;
      const informe = await ProgramacionAraucoController.syncInformeSemanal(
        Number(semana),
        Number(anio),
        String(ptoTbjo),
        req.user?.id
      );
      return res.json({
        message: `Informe semanal PS${semana}${anio} ${ptoTbjo} actualizado y almacenado`,
        informe
      });
    } catch (error: any) {
      return res.status(500).json({
        message: 'Error al sincronizar informe semanal del PS',
        error: error.message
      });
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
   * Sube e importa el archivo oficial del programa semanal (ej. PS442026 340CRR.xlsm)
   * y arma/actualiza el informe semanal correspondiente
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

      // Armar/actualizar el Informe Semanal del PS en curso al importar el archivo
      const informeSemanal = await ProgramacionAraucoController.syncInformeSemanal(
        summary.semana,
        summary.anio,
        summary.ptoTbjo
      );

      return res.json({
        message: 'Programa semanal Arauco importado con éxito',
        summary,
        informeSemanal
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
