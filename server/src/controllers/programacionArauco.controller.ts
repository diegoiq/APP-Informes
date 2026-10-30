import { Request, Response } from 'express';
import prisma from '../database/db';
import { AraucoProgramParserService } from '../services/araucoProgramParser.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class ProgramacionAraucoController {
  /**
   * Construye una mini tabla estructurada y estilizada del Programa Semanal
   * con columnas de Orden SAP, Op, Ubicación, Tarea, HH, Estado (con badges de color)
   * y avances/evidencias de campo, en sustitución del texto plano con viñetas.
   */
  public static buildMiniTablaProgramaSemanalHtml(
    tituloCabecera: string,
    operaciones: any[],
    hhDisp: number = 0,
    hhProg: number = 0,
    densidad: number = 0,
    esMensual: boolean = false
  ): string {
    if (!operaciones || operaciones.length === 0) {
      return `
        <div style="background: #f8fafc; padding: 14px; border: 1px dashed #cbd5e1; border-radius: 8px; text-align: center; color: #64748b; font-size: 9pt; font-style: italic;">
          📋 No se registran operaciones programadas en este período (${tituloCabecera}).
        </div>
      `;
    }

    let completadas = 0;
    let enCurso = 0;
    let pendientes = 0;

    operaciones.forEach((op) => {
      const est = (op.estadoEjecucion || 'Pendiente').toLowerCase();
      if (est.includes('comple') || est.includes('termina')) completadas++;
      else if (est.includes('ejecu') || est.includes('curso')) enCurso++;
      else pendientes++;
    });

    const rowsHtml = operaciones
      .map((op, idx) => {
        const estado = op.estadoEjecucion || 'Pendiente';
        let badgeBg = '#fef3c7';
        let badgeColor = '#92400e';
        let badgeBorder = '#fde68a';
        let estadoLabel = estado;

        const estLower = estado.toLowerCase();
        if (estLower.includes('comple') || estLower.includes('termina')) {
          badgeBg = '#dcfce7';
          badgeColor = '#166534';
          badgeBorder = '#86efac';
          estadoLabel = 'Completado';
        } else if (estLower.includes('ejecu') || estLower.includes('curso')) {
          badgeBg = '#e0f2fe';
          badgeColor = '#075985';
          badgeBorder = '#7dd3fc';
          estadoLabel = 'En Ejecución';
        } else if (estLower.includes('reprog') || estLower.includes('posterg')) {
          badgeBg = '#f3e8ff';
          badgeColor = '#6b21a8';
          badgeBorder = '#d8b4fe';
          estadoLabel = 'Reprogramado';
        } else {
          estadoLabel = 'Pendiente';
        }

        let fotosCount = 0;
        if (op.fotosEjecucion) {
          try {
            const parsed = JSON.parse(op.fotosEjecucion);
            if (Array.isArray(parsed)) fotosCount = parsed.length;
          } catch {}
        }

        const tieneComentario = Boolean(op.comentariosEjecucion && op.comentariosEjecucion.trim());
        const comentarioTexto = tieneComentario ? op.comentariosEjecucion.trim() : '';

        return `
          <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="font-weight: 700; color: #0f172a; white-space: nowrap; padding: 7px 9px; border: 1px solid #cbd5e1; font-size: 8.5pt;">
              ${op.numeroOrden}
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 8pt; color: #475569; padding: 7px 8px; border: 1px solid #cbd5e1; white-space: nowrap;">
              ${op.numeroOperacion}
            </td>
            <td style="color: #475569; font-size: 8pt; padding: 7px 8px; border: 1px solid #cbd5e1; white-space: nowrap;">
              ${op.ubicacionTecnica || '340CRR'}
            </td>
            <td style="color: #1e293b; font-weight: 500; font-size: 8.5pt; padding: 7px 9px; border: 1px solid #cbd5e1;">
              ${op.textoOperacion}
            </td>
            <td style="text-align: center; font-weight: 700; color: #0284c7; padding: 7px 8px; border: 1px solid #cbd5e1; font-size: 8.5pt; white-space: nowrap;">
              ${op.hhTotalProgramado} HH
            </td>
            <td style="text-align: center; padding: 7px 8px; border: 1px solid #cbd5e1; white-space: nowrap;">
              <span style="display: inline-block; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 3px 8px; border-radius: 9999px; font-weight: 700; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.3px;">
                ${estadoLabel}
              </span>
            </td>
            <td style="color: #475569; font-size: 7.5pt; padding: 7px 9px; border: 1px solid #cbd5e1;">
              ${comentarioTexto ? `<div style="color: #0f172a; font-weight: 500; margin-bottom: 3px; line-height: 1.3;">${comentarioTexto}</div>` : ''}
              ${fotosCount > 0 ? `<span style="display: inline-block; background: #e2e8f0; color: #1e293b; padding: 1px 6px; border-radius: 4px; font-size: 7pt; font-weight: 600; border: 1px solid #cbd5e1;">📷 ${fotosCount} foto${fotosCount > 1 ? 's' : ''}</span>` : (!comentarioTexto ? '<span style="color: #94a3b8; font-style: italic;">Sin comentarios</span>' : '')}
            </td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="width: 100%; margin: 4px 0 10px 0; font-family: Calibri, 'Segoe UI', Arial, sans-serif; white-space: normal;">
        <div style="background: #0f172a; color: #ffffff; padding: 9px 12px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="font-size: 9.5pt; font-weight: 700; letter-spacing: 0.3px;">
            📋 ${esMensual ? 'CONSOLIDADO MENSUAL DE OPERACIONES' : 'PROGRAMA SEMANAL'}: ${tituloCabecera}
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 8pt;">
            <span style="background: #1e293b; color: #f1f5f9; padding: 3px 8px; border-radius: 4px; border: 1px solid #475569; font-weight: 600;">
              Total: <strong>${operaciones.length} OTs</strong> (${hhProg} HH)
            </span>
            <span style="background: #dcfce7; color: #166534; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #86efac;">
              ✓ ${completadas} Completadas
            </span>
            <span style="background: #e0f2fe; color: #075985; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #7dd3fc;">
              ⏳ ${enCurso} En Curso
            </span>
            <span style="background: #fef3c7; color: #92400e; padding: 3px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #fde68a;">
              ⏱ ${pendientes} Pendientes
            </span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; background: #ffffff; border: 1px solid #cbd5e1; border-top: none;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th style="padding: 8px 9px; border: 1px solid #cbd5e1; text-align: left; font-size: 7.5pt; text-transform: uppercase; color: #0f172a; width: 11%;">Orden SAP</th>
              <th style="padding: 8px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 7.5pt; text-transform: uppercase; color: #0f172a; width: 6%;">Op.</th>
              <th style="padding: 8px 8px; border: 1px solid #cbd5e1; text-align: left; font-size: 7.5pt; text-transform: uppercase; color: #0f172a; width: 13%;">Ubicación</th>
              <th style="padding: 8px 9px; border: 1px solid #cbd5e1; text-align: left; font-size: 7.5pt; text-transform: uppercase; color: #0f172a; width: 33%;">Descripción de los Trabajos</th>
              <th style="padding: 8px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 7.5pt; text-transform: uppercase; color: #0f172a; width: 9%;">HH Prog.</th>
              <th style="padding: 8px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 7.5pt; text-transform: uppercase; color: #0f172a; width: 12%;">Estado</th>
              <th style="padding: 8px 9px; border: 1px solid #cbd5e1; text-align: left; font-size: 7.5pt; text-transform: uppercase; color: #0f172a; width: 16%;">Avance / Evidencia</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

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
        ...(ptoTbjo
          ? {
              OR: [
                { ptoTbjo: { contains: ptoTbjo, mode: 'insensitive' } },
                { ptoTbjo: null },
                { ptoTbjo: '' }
              ]
            }
          : {})
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
    const seenUrlsSemanal = new Set<string>();

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
        const rawUrl = typeof f === 'string' ? f : f.url;
        const url = String(rawUrl || '').trim();
        if (!url || seenUrlsSemanal.has(url)) continue;
        seenUrlsSemanal.add(url);

        const comentFoto = (typeof f === 'object' && f.comentario) ? f.comentario : '';
        fotosParaInforme.push({
          etapa: 'Comentario',
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

    // Mini tabla del programa semanal estructurada con estados y evidencias
    const lugarObraTexto = ProgramacionAraucoController.buildMiniTablaProgramaSemanalHtml(
      codigoPS,
      operaciones,
      hhDisp,
      hhProg,
      densidad,
      false
    );

    const anexosTexto = `Resumen de Capacidad Semanal ${codigoPS}: Miércoles (${dotacion?.opMiercoles ?? 4} op), Jueves (${dotacion?.opJueves ?? 6} op), Viernes (${dotacion?.opViernes ?? 8} op), Sábado (${dotacion?.opSabado ?? 0} op), Domingo (${dotacion?.opDomingo ?? 0} op), Lunes (${dotacion?.opLunes ?? 9} op), Martes (${dotacion?.opMartes ?? 9} op). Total HH Programadas: ${hhProg} HH / ${hhDisp} HH disponibles (${densidad}%).`;

    // Verificar si ya existe el Informe Semanal para este PS
    const existente = await prisma.informeCRR.findUnique({
      where: { codigoInforme: codigoPS }
    });

    if (existente) {
      const actualizado = await prisma.$transaction(async (tx) => {
        await tx.fotoInformeCRR.deleteMany({
          where: { informeId: existente.id }
        });

        return await tx.informeCRR.update({
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
   * Sincroniza y almacena automáticamente el Informe Mensual Consolidado
   * uniendo todas las semanas PS del mes en curso (ej: "INF-MES-10-2026 340CRR")
   * para poder descargarlo completo al final del mes.
   */
  public static async syncInformeMensual(
    mes: number,
    anio: number,
    ptoTbjo: string = '340CRR',
    userId?: string
  ) {
    const MESES = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const nombreMes = MESES[(mes - 1) % 12] || 'MES';
    const codigoMensual = `INF-MES-${String(mes).padStart(2, '0')}-${anio} ${ptoTbjo}`;

    let responsableId = userId;
    if (!responsableId) {
      const firstUser = await prisma.usuario.findFirst({ orderBy: { creadoEn: 'asc' } });
      if (!firstUser) return null;
      responsableId = firstUser.id;
    }

    // Buscar todas las dotaciones de ese año y filtrar las del mes correspondiente (o todas las semanas cargadas del mes)
    const todasDotaciones = await prisma.dotacionSemanalArauco.findMany({
      where: { anio, ptoTbjo },
      orderBy: { semana: 'asc' }
    });

    const dotacionesMes = todasDotaciones.filter((d) => {
      const m = new Date(d.fechaInicio).getUTCMonth() + 1;
      return m === mes;
    });

    const semanasDelMes =
      dotacionesMes.length > 0
        ? dotacionesMes.map((d) => d.semana)
        : todasDotaciones.map((d) => d.semana);

    const operacionesMes = await prisma.operacionOM.findMany({
      where: {
        anioProg: anio,
        ...(semanasDelMes.length > 0 ? { semanaProg: { in: semanasDelMes } } : { semanaProg: { not: null } }),
        ...(ptoTbjo
          ? {
              OR: [
                { ptoTbjo: { contains: ptoTbjo, mode: 'insensitive' } },
                { ptoTbjo: null },
                { ptoTbjo: '' }
              ]
            }
          : {})
      },
      orderBy: [{ semanaProg: 'asc' }, { numeroOrden: 'asc' }, { numeroOperacion: 'asc' }]
    });

    const hhProgTotalMes = operacionesMes.reduce((acc, o) => acc + o.hhTotalProgramado, 0);
    const fotosParaInformeMes: Array<{
      etapa: string;
      url: string;
      diagnosticoTecnico: string;
      pieDeFoto: string;
    }> = [];
    const seenUrlsMes = new Set<string>();

    const lineasConAvanceMes: string[] = [];
    const lineasTodasMes: string[] = [];

    for (const op of operacionesMes) {
      let parsedFotos: any[] = [];
      if (op.fotosEjecucion) {
        try {
          const parsed = JSON.parse(op.fotosEjecucion);
          if (Array.isArray(parsed)) parsedFotos = parsed;
        } catch {
          // ignore
        }
      }

      const etiquetaPS = `PS${op.semanaProg}${op.anioProg}`;
      const estado = op.estadoEjecucion || 'Pendiente';
      const tieneComentario = Boolean(op.comentariosEjecucion && op.comentariosEjecucion.trim());
      const tieneFotos = parsedFotos.length > 0;

      const textoLinea = `• [${etiquetaPS}] OT ${op.numeroOrden} (Op. ${op.numeroOperacion}) | Ubic: ${op.ubicacionTecnica || '340CRR'} | ${op.textoOperacion} (${op.hhTotalProgramado} HH) — Estado: [${estado}]${
        tieneComentario ? `\n   ↳ Comentario / Trabajo Realizado: ${op.comentariosEjecucion?.trim()}` : ''
      }${tieneFotos ? ` (${parsedFotos.length} foto${parsedFotos.length > 1 ? 's' : ''})` : ''}`;

      lineasTodasMes.push(textoLinea);
      if (tieneComentario || tieneFotos || estado !== 'Pendiente') {
        lineasConAvanceMes.push(textoLinea);
      }

      for (const f of parsedFotos) {
        const rawUrl = typeof f === 'string' ? f : f.url;
        const url = String(rawUrl || '').trim();
        if (!url || seenUrlsMes.has(url)) continue;
        seenUrlsMes.add(url);

        const comentFoto = typeof f === 'object' && f.comentario ? f.comentario : '';
        fotosParaInformeMes.push({
          etapa: 'Comentario',
          url,
          diagnosticoTecnico: `[${etiquetaPS}] OT ${op.numeroOrden} / Op ${op.numeroOperacion} — ${op.textoOperacion}${
            comentFoto
              ? `: ${comentFoto}`
              : tieneComentario
              ? `: ${op.comentariosEjecucion}`
              : ''
          }`,
          pieDeFoto: `Cierre Mensual ${nombreMes} ${anio} (${etiquetaPS}) | Ubic: ${op.ubicacionTecnica || '340CRR'} (${op.hhTotalProgramado} HH)`
        });
      }
    }

    const objetivo = `Informe Mensual Consolidado de Trabajos Programados y Ejecutados en ${nombreMes} ${anio} (Puesto ${ptoTbjo}). Integra las semanas: ${
      semanasDelMes.map((s) => `PS${s}${anio}`).join(', ') || 'En curso'
    }. Total Operaciones del Mes: ${operacionesMes.length} (${hhProgTotalMes} HH programadas). Operaciones con evidencia/comentarios de cierre: ${lineasConAvanceMes.length} (${fotosParaInformeMes.length} fotografías).`;

    const observaciones = `Cierre Mensual ${nombreMes} ${anio} (${ptoTbjo}): ${lineasConAvanceMes.length} líneas con comentarios técnicos y ${fotosParaInformeMes.length} evidencias fotográficas acumuladas.`;

    // Mini tabla del consolidado mensual estructurada con estados y evidencias
    const lugarObraTexto = ProgramacionAraucoController.buildMiniTablaProgramaSemanalHtml(
      codigoMensual,
      operacionesMes,
      0,
      hhProgTotalMes,
      0,
      true
    );

    const anexosTexto = `Consolidado Mensual ${nombreMes} ${anio} — Programas Semanales incluidos: ${
      semanasDelMes.map((s) => `PS${s}${anio}`).join(', ')
    }. Total Horas Hombre Programadas en el Mes: ${hhProgTotalMes} HH.`;

    const existente = await prisma.informeCRR.findUnique({
      where: { codigoInforme: codigoMensual }
    });

    if (existente) {
      return await prisma.$transaction(async (tx) => {
        await tx.fotoInformeCRR.deleteMany({
          where: { informeId: existente.id }
        });

        return await tx.informeCRR.update({
          where: { id: existente.id },
          data: {
            tipoInforme: 'INFORME MENSUAL DE TRABAJOS PS',
            titulo: `INFORME MENSUAL DE TRABAJOS EJECUTADOS - ${nombreMes} ${anio} (${ptoTbjo})`,
            observaciones,
            avisoNumero: `MES ${String(mes).padStart(2, '0')}/${anio}`,
            ordenNumero: `${operacionesMes.length} OTs`,
            objetivo,
            lugarObraTexto,
            anexosTexto,
            fotos: {
              create: fotosParaInformeMes
            }
          },
          include: { fotos: true }
        });
      });
    } else {
      return await prisma.informeCRR.create({
        data: {
          codigoInforme: codigoMensual,
          tipoInforme: 'INFORME MENSUAL DE TRABAJOS PS',
          titulo: `INFORME MENSUAL DE TRABAJOS EJECUTADOS - ${nombreMes} ${anio} (${ptoTbjo})`,
          empresaContratista: 'DOTACIÓN PROPIA / CONTRATISTA 340CRR',
          observaciones,
          distribucion: `Inspección Técnica Arauco / Sub Gerencia Mantenimiento ${ptoTbjo}`,
          copiaAsignada: 'Jefatura Departamento Corrosión 340CRR',
          responsableId,
          avisoNumero: `MES ${String(mes).padStart(2, '0')}/${anio}`,
          ordenNumero: `${operacionesMes.length} OTs`,
          ubicacionTecnica: `Planta Celulosa Puerto Esperanza - Sector ${ptoTbjo}`,
          objetivo,
          lugarObraTexto,
          anexosTexto,
          estado: 'En Curso',
          fotos: {
            create: fotosParaInformeMes
          }
        },
        include: { fotos: true }
      });
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
        select: {
          semana: true,
          anio: true,
          fechaInicio: true,
          fechaFin: true,
          archivoNombre: true,
          archivoTamano: true,
          archivoFecha: true
        }
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
          ...(ptoTbjo
            ? {
                OR: [
                  { ptoTbjo: { contains: ptoTbjo, mode: 'insensitive' } },
                  { ptoTbjo: null },
                  { ptoTbjo: '' }
                ]
              }
            : {})
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

      // 4. Obtener Informe Semanal en curso asociado a este PS (ej: "PS442026 340CRR") e Informe Mensual Consolidado
      const codigoPS = `PS${semana}${anio} ${ptoTbjo}`;
      const mesActual = dotacion.fechaInicio ? new Date(dotacion.fechaInicio).getUTCMonth() + 1 : 10;
      const codigoMensual = `INF-MES-${String(mesActual).padStart(2, '0')}-${anio} ${ptoTbjo}`;

      const [informeSemanal, informeMensual] = await Promise.all([
        prisma.informeCRR.findUnique({
          where: { codigoInforme: codigoPS },
          include: {
            fotos: true,
            responsable: {
              select: { id: true, nombre: true, email: true }
            }
          }
        }),
        prisma.informeCRR.findUnique({
          where: { codigoInforme: codigoMensual },
          include: {
            fotos: true,
            responsable: {
              select: { id: true, nombre: true, email: true }
            }
          }
        })
      ]);

      // Omitir archivoData base64 pesado del payload general de dotación para optimizar rendimiento
      const { archivoData, ...dotacionInfo } = dotacion as any;
      const dotacionSanitized = {
        ...dotacionInfo,
        tieneDocumento: Boolean(dotacion.archivoNombre || archivoData)
      };

      return res.json({
        semana,
        anio,
        mes: mesActual,
        codigoPS,
        codigoMensual,
        dotacion: dotacionSanitized,
        operaciones,
        horasDisponibles: disp,
        horasProgramadas: prog,
        densidad,
        informeSemanal,
        informeMensual,
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

      let rawFotos: any[] = [];
      if (Array.isArray(fotosEjecucion)) {
        rawFotos = fotosEjecucion;
      } else if (typeof fotosEjecucion === 'string') {
        try {
          const parsed = JSON.parse(fotosEjecucion);
          if (Array.isArray(parsed)) rawFotos = parsed;
        } catch {
          rawFotos = [];
        }
      }

      const seenOpUrls = new Set<string>();
      const dedupFotos = rawFotos.filter((f) => {
        const u = String(typeof f === 'string' ? f : f?.url || '').trim();
        if (!u || seenOpUrls.has(u)) return false;
        seenOpUrls.add(u);
        return true;
      });
      const serializedFotos = JSON.stringify(dedupFotos);

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

      // Sincronizar automáticamente con el Informe de Trabajos de la Semana y con el Informe Mensual Consolidado
      const dot = await prisma.dotacionSemanalArauco.findUnique({
        where: { semana_anio_ptoTbjo: { semana, anio, ptoTbjo } }
      });
      const mesOp = dot?.fechaInicio ? new Date(dot.fechaInicio).getUTCMonth() + 1 : new Date().getMonth() + 1;

      const [informeSemanal, informeMensual] = await Promise.all([
        ProgramacionAraucoController.syncInformeSemanal(semana, anio, ptoTbjo, req.user?.id),
        ProgramacionAraucoController.syncInformeMensual(mesOp, anio, ptoTbjo, req.user?.id)
      ]);

      return res.json({
        message: `Evidencia guardada y unida al Informe Semanal (PS${semana}${anio}) y al Informe Mensual (${String(mesOp).padStart(2, '0')}/${anio}).`,
        operacion: opActualizada,
        informeSemanal,
        informeMensual
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
   * Genera o sincroniza bajo demanda el Informe Semanal del PS en curso y el Informe Mensual
   */
  public static async syncInformeSemanalEndpoint(req: AuthenticatedRequest, res: Response) {
    try {
      const { semana = 44, anio = 2026, ptoTbjo = '340CRR' } = req.body;
      const dot = await prisma.dotacionSemanalArauco.findUnique({
        where: { semana_anio_ptoTbjo: { semana: Number(semana), anio: Number(anio), ptoTbjo: String(ptoTbjo) } }
      });
      const mes = dot?.fechaInicio ? new Date(dot.fechaInicio).getUTCMonth() + 1 : new Date().getMonth() + 1;

      const [informe, informeMensual] = await Promise.all([
        ProgramacionAraucoController.syncInformeSemanal(
          Number(semana),
          Number(anio),
          String(ptoTbjo),
          req.user?.id
        ),
        ProgramacionAraucoController.syncInformeMensual(
          mes,
          Number(anio),
          String(ptoTbjo),
          req.user?.id
        )
      ]);

      return res.json({
        message: `Informe semanal PS${semana}${anio} e Informe Mensual ${String(mes).padStart(2, '0')}/${anio} actualizados y almacenados`,
        informe,
        informeMensual
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
   * Sube e importa el archivo oficial del programa semanal (ej. PS432026 340CRR.xlsm / PS442026 340CRR.xlsm)
   * y arma/actualiza el informe semanal y mensual correspondiente
   */
  public static async uploadPSFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No se adjuntó ningún archivo (.xlsm o .xlsx).' });
      }

      const targetSemana = req.body?.semana ? parseInt(String(req.body.semana), 10) : undefined;
      const targetAnio = req.body?.anio ? parseInt(String(req.body.anio), 10) : undefined;

      const summary = await AraucoProgramParserService.processProgramFile(
        req.file.buffer,
        req.file.originalname,
        targetSemana,
        targetAnio,
        req.file.mimetype
      );

      const mesProg = summary.fechaInicio
        ? new Date(summary.fechaInicio).getUTCMonth() + 1
        : new Date().getMonth() + 1;

      // Armar/actualizar el Informe Semanal del PS importado y el Informe Mensual Consolidado (tolerante a fallos)
      let informeSemanal: any = null;
      let informeMensual: any = null;
      try {
        [informeSemanal, informeMensual] = await Promise.all([
          ProgramacionAraucoController.syncInformeSemanal(
            summary.semana,
            summary.anio,
            summary.ptoTbjo
          ).catch((e) => {
            console.error('Error sincronizando informe semanal tras upload:', e);
            return null;
          }),
          ProgramacionAraucoController.syncInformeMensual(
            mesProg,
            summary.anio,
            summary.ptoTbjo
          ).catch((e) => {
            console.error('Error sincronizando informe mensual tras upload:', e);
            return null;
          })
        ]);
      } catch (syncErr) {
        console.error('Error general en sincronización de informes tras upload:', syncErr);
      }

      return res.json({
        message: `Programa semanal Arauco importado con éxito: ${summary.totalOperaciones} operaciones procesadas (${summary.operacionesGuardadasOk ?? summary.totalOperaciones} guardadas en BD).`,
        summary,
        informeSemanal,
        informeMensual
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
   * Descarga el documento oficial (.xlsm / .xlsx) guardado para la PS solicitada
   */
  public static async downloadDocumento(req: Request, res: Response) {
    try {
      const semana = parseInt(String(req.query.semana || '44'), 10);
      const anio = parseInt(String(req.query.anio || '2026'), 10);
      const ptoTbjo = String(req.query.ptoTbjo || '340CRR').trim();

      const dotacion = await prisma.dotacionSemanalArauco.findUnique({
        where: {
          semana_anio_ptoTbjo: { semana, anio, ptoTbjo }
        },
        select: {
          archivoNombre: true,
          archivoData: true,
          archivoMimeType: true
        }
      });

      if (!dotacion || !dotacion.archivoData) {
        return res.status(404).json({
          message: `No se encontró ningún documento guardado para PS${semana}${anio} (${ptoTbjo}).`
        });
      }

      const fileBuffer = Buffer.from(dotacion.archivoData, 'base64');
      const filename = dotacion.archivoNombre || `PS${semana}${anio}_${ptoTbjo}.xlsm`;
      const mimeType = dotacion.archivoMimeType || 'application/vnd.ms-excel.sheet.macroEnabled.12';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      return res.send(fileBuffer);
    } catch (error: any) {
      console.error('Error al descargar documento de la PS:', error);
      return res.status(500).json({ message: 'Error al descargar documento', error: error.message });
    }
  }

  /**
   * Elimina el documento cargado en la PS para optimizar y liberar almacenamiento en Render
   * Opcionalmente desasigna las operaciones de la semana si se desea resetear la PS.
   */
  public static async deleteDocumento(req: AuthenticatedRequest, res: Response) {
    try {
      const semana = parseInt(String(req.query.semana || req.body.semana || '44'), 10);
      const anio = parseInt(String(req.query.anio || req.body.anio || '2026'), 10);
      const ptoTbjo = String(req.query.ptoTbjo || req.body.ptoTbjo || '340CRR').trim();
      const limpiarOperaciones = String(req.query.limpiarOperaciones || req.body.limpiarOperaciones) === 'true';

      const dotacion = await prisma.dotacionSemanalArauco.findUnique({
        where: {
          semana_anio_ptoTbjo: { semana, anio, ptoTbjo }
        }
      });

      if (!dotacion) {
        return res.status(404).json({ message: `No se encontró programación para PS${semana}${anio}.` });
      }

      // 1. Limpiar campos del archivo en la dotación para liberar almacenamiento en Render
      await prisma.dotacionSemanalArauco.update({
        where: { id: dotacion.id },
        data: {
          archivoNombre: null,
          archivoData: null,
          archivoTamano: null,
          archivoMimeType: null,
          archivoFecha: null
        }
      });

      // 2. Si se solicitó limpiar operaciones asociadas de esta semana
      let opsAfectadas = 0;
      if (limpiarOperaciones) {
        const ops = await prisma.operacionOM.updateMany({
          where: {
            semanaProg: semana,
            anioProg: anio,
            ptoTbjo: { contains: ptoTbjo }
          },
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
        opsAfectadas = ops.count;
      }

      return res.json({
        message: `Documento de PS${semana}${anio} eliminado con éxito de la base de datos (espacio liberado en Render).${
          limpiarOperaciones ? ` ${opsAfectadas} operaciones desvinculadas de la semana.` : ''
        }`,
        semana,
        anio,
        ptoTbjo,
        limpiarOperaciones
      });
    } catch (error: any) {
      console.error('Error al eliminar documento de la PS:', error);
      return res.status(500).json({ message: 'Error al eliminar documento', error: error.message });
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
