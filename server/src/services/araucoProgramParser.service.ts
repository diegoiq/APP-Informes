import ExcelJS from 'exceljs';
import prisma from '../database/db';

export interface AraucoProgramSummary {
  semana: number;
  anio: number;
  ptoTbjo: string;
  grupoPlanif: string;
  fechaInicio: string;
  fechaFin: string;
  totalOperaciones: number;
  operacionesGuardadasOk?: number;
  operacionesGuardadasErr?: number;
  totalEnBd?: number;
  hhDisponibles: number;
  hhProgramadas: number;
  densidad: number;
  archivoNombre?: string;
  archivoTamano?: number;
  archivoFecha?: string;
  debugLogs?: string[];
}

function unwrapCellValue(cell: ExcelJS.Cell | undefined): any {
  if (!cell) return undefined;
  if (cell.result !== undefined && cell.result !== null) return cell.result;
  const val: any = cell.value;
  if (val && typeof val === 'object') {
    if ('result' in val && val.result !== undefined) return val.result;
    if ('text' in val && val.text !== undefined) return val.text;
    if ('formula' in val || 'sharedFormula' in val) return 0; // Fórmula apuntando a celda vacía en Excel
  }
  return val;
}

function parseCellNumber(cell: ExcelJS.Cell | undefined, defaultVal: number = 0): number {
  const raw = unwrapCellValue(cell);
  if (raw === undefined || raw === null || String(raw).trim() === '') return defaultVal;
  const n = Number(raw);
  return isNaN(n) ? defaultVal : n;
}

function parseCellString(cell: ExcelJS.Cell | undefined, defaultVal: string = ''): string {
  const raw = unwrapCellValue(cell);
  if (raw === undefined || raw === null) return defaultVal;
  return String(raw).trim() || defaultVal;
}

export class AraucoProgramParserService {
  /**
   * Procesa el archivo estándar de programación semanal de Arauco (ej: PS442026 340CRR.xlsm)
   * Lee las hojas ProDiaSem, HojaPegado y Export
   */
  public static async processProgramFile(
    fileBuffer: Buffer,
    filename: string = 'PS-Arauco.xlsm',
    targetSemana?: number,
    targetAnio?: number,
    mimeType?: string
  ): Promise<AraucoProgramSummary> {
    const debugLogs: string[] = [];
    debugLogs.push(`[1] Archivo recibido: "${filename}" (${fileBuffer.length} bytes)`);

    const workbook = new ExcelJS.Workbook();
    // @ts-ignore exceljs accepts buffer
    await workbook.xlsx.load(fileBuffer);

    debugLogs.push(`[2] Hojas encontradas: ${workbook.worksheets.map((w, idx) => `[${idx}] "${w.name}" (id:${w.id}, filas:${w.rowCount})`).join(', ')}`);

    // 1. Identificar hojas oficiales (búsqueda insensible a mayúsculas/minúsculas y espacios)
    const ws =
      workbook.worksheets.find(w => w.name.trim().toLowerCase().startsWith('prodia')) ||
      workbook.worksheets.find(w => w.name.trim().toLowerCase().includes('programa')) ||
      workbook.getWorksheet('ProDiaSem') ||
      workbook.worksheets[0];

    const wsPegado =
      workbook.worksheets.find(w => w.name.trim().toLowerCase().includes('pegado')) ||
      workbook.getWorksheet('HojaPegado') ||
      workbook.worksheets[1];

    const wsExport =
      workbook.worksheets.find(w => w.name.trim().toLowerCase().includes('export')) ||
      workbook.getWorksheet('Export') ||
      workbook.worksheets[2];

    if (!ws) {
      throw new Error("No se encontró la hoja 'ProDiaSem' ni ninguna hoja de programa en el archivo.");
    }
    debugLogs.push(`[3] Hojas asignadas -> ProDiaSem: "${ws.name}", HojaPegado: "${wsPegado?.name || 'N/A'}", Export: "${wsExport?.name || 'N/A'}"`);

    // 2. Extraer metadatos de cabecera
    const ptoTbjo =
      parseCellString(ws.getCell('D3')) ||
      parseCellString(wsPegado?.getCell('E1')) ||
      parseCellString(wsExport?.getCell('E1')) ||
      '340CRR';

    const grupoPlanif =
      parseCellString(ws.getCell('D4')) ||
      parseCellString(wsPegado?.getCell('E2')) ||
      parseCellString(wsExport?.getCell('E2')) ||
      'TA1';

    // Fechas (Desde / Hasta) normalizadas a las 12:00 UTC para evitar desfase por huso horario GMT-3
    const parseExcelDate = (cell: ExcelJS.Cell | undefined): Date | null => {
      const raw = unwrapCellValue(cell);
      if (!raw) return null;
      let d: Date | null = null;
      if (raw instanceof Date && !isNaN(raw.getTime())) {
        d = raw;
      } else if (typeof raw === 'number' && raw > 1000) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        d = new Date(excelEpoch.getTime() + raw * 86400000);
      } else if (typeof raw === 'string') {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
      if (!d || isNaN(d.getTime())) return null;
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
    };

    let fechaInicio =
      parseExcelDate(ws.getCell('C7')) ||
      parseExcelDate(wsExport?.getCell('C3')) ||
      parseExcelDate(wsPegado?.getCell('C3'));

    let fechaFin =
      parseExcelDate(ws.getCell('C8')) ||
      parseExcelDate(wsExport?.getCell('C4')) ||
      parseExcelDate(wsPegado?.getCell('C4'));

    // Deducir semana y año: si targetSemana/targetAnio fueron enviados desde la UI (selector de PS),
    // se respeta esa selección prioritaria para cargar el documento en la PS elegida.
    // Si no fueron especificados, se deduce del nombre de archivo (ej: PS432026, PS44...) o de las fechas.
    let semana = targetSemana && targetSemana >= 1 && targetSemana <= 53 ? targetSemana : undefined;
    let anio = targetAnio && targetAnio >= 2020 && targetAnio <= 2035 ? targetAnio : undefined;

    if (!semana || !anio) {
      const matchNameFull = filename.match(/PS[\s_-]*(\d{1,2})[\s_-]*(\d{4})/i);
      const matchNameShort = !matchNameFull ? filename.match(/PS[\s_-]*(\d{1,2})(?:\b|[\s_-])/i) : null;

      if (matchNameFull) {
        if (!semana) semana = parseInt(matchNameFull[1], 10);
        if (!anio) anio = parseInt(matchNameFull[2], 10);
      } else if (matchNameShort) {
        if (!semana) semana = parseInt(matchNameShort[1], 10);
      } else if (fechaInicio && !isNaN(fechaInicio.getTime())) {
        const d = new Date(Date.UTC(fechaInicio.getUTCFullYear(), fechaInicio.getUTCMonth(), fechaInicio.getUTCDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        if (!semana) semana = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        if (!anio) anio = d.getUTCFullYear();
      }
    }

    if (!semana) semana = 44;
    if (!anio) anio = 2026;

    if (!fechaInicio) {
      const baseDate = new Date(Date.UTC(anio, 0, 1, 12, 0, 0));
      const dayOffset = (semana - 1) * 7;
      fechaInicio = new Date(baseDate.getTime() + (dayOffset + 2) * 86400000);
    }
    if (!fechaFin) {
      fechaFin = new Date(fechaInicio.getTime() + 6 * 86400000); // 7 días (Mi a Ma)
    }

    // 3. Extraer dotación de operarios por día
    // En HojaPegado y Export: Fila 1 tiene las cabeceras H1="Mi", I1="Ju", J1="Vi", K1="Sa", L1="Do", M1="Lu", N1="Ma"
    // y Fila 2 (H2:N2) tiene la "Cantidad de operarios disponibles".
    const horasJornada = 7; // 7 hs corridas normales

    const readOperariosDia = (colPegadoExport: string, colProDiaSem: string): number => {
      // 1) Intentar desde hoja Export (valores directos numéricos en H2:N2)
      if (wsExport) {
        const rawExp = unwrapCellValue(wsExport.getCell(`${colPegadoExport}2`));
        if (rawExp !== undefined && rawExp !== null && String(rawExp).trim() !== '') {
          const n = Number(rawExp);
          if (!isNaN(n)) return n;
        }
      }
      // 2) Intentar desde HojaPegado (fórmulas =Export!H2..N2 en H2:N2)
      if (wsPegado) {
        const rawPeg = unwrapCellValue(wsPegado.getCell(`${colPegadoExport}2`));
        if (rawPeg !== undefined && rawPeg !== null && String(rawPeg).trim() !== '') {
          const n = Number(rawPeg);
          if (!isNaN(n)) return n;
        }
        // Fallback a fila 3 de HojaPegado (HH disponibles = operarios * 7)
        const rawHH = unwrapCellValue(wsPegado.getCell(`${colPegadoExport}3`));
        if (rawHH !== undefined && rawHH !== null && String(rawHH).trim() !== '') {
          const hh = Number(rawHH);
          if (!isNaN(hh) && hh >= 0) return Math.round(hh / horasJornada);
        }
      }
      // 3) Fallback a fila 10 de ProDiaSem (G10:M10)
      const rawProDia = unwrapCellValue(ws.getCell(`${colProDiaSem}10`));
      if (rawProDia !== undefined && rawProDia !== null && String(rawProDia).trim() !== '') {
        const hh = Number(rawProDia);
        if (!isNaN(hh) && hh >= 0) return Math.round(hh / horasJornada);
      }
      return 0;
    };

    const opMiercoles = readOperariosDia('H', 'G');
    const opJueves = readOperariosDia('I', 'H');
    const opViernes = readOperariosDia('J', 'I');
    const opSabado = readOperariosDia('K', 'J');
    const opDomingo = readOperariosDia('L', 'K');
    const opLunes = readOperariosDia('M', 'L');
    const opMartes = readOperariosDia('N', 'M');

    // Metadatos y buffer del archivo original guardado para persistencia en BD
    const archivoData = fileBuffer.toString('base64');
    const archivoTamano = fileBuffer.length;
    const archivoFecha = new Date();
    const archivoMimeType = mimeType || 'application/vnd.ms-excel.sheet.macroEnabled.12';

    // Guardar / actualizar dotación semanal en BD junto con el documento adjunto de la PS
    await prisma.dotacionSemanalArauco.upsert({
      where: {
        semana_anio_ptoTbjo: {
          semana,
          anio,
          ptoTbjo
        }
      },
      update: {
        grupoPlanif,
        fechaInicio,
        fechaFin,
        opMiercoles,
        opJueves,
        opViernes,
        opSabado,
        opDomingo,
        opLunes,
        opMartes,
        horasJornada,
        archivoNombre: filename,
        archivoData,
        archivoTamano,
        archivoMimeType,
        archivoFecha
      },
      create: {
        semana,
        anio,
        ptoTbjo,
        grupoPlanif,
        fechaInicio,
        fechaFin,
        opMiercoles,
        opJueves,
        opViernes,
        opSabado,
        opDomingo,
        opLunes,
        opMartes,
        horasJornada,
        archivoNombre: filename,
        archivoData,
        archivoTamano,
        archivoMimeType,
        archivoFecha
      }
    });

    // 4. Extraer operaciones programadas
    // En las planillas oficiales de Arauco (hoja ProDiaSem), la fila de cabecera contiene "Orden" en Col B y "Operación" en Col C.
    // Las operaciones comienzan exactamente en la fila siguiente (headerRow + 1) y terminan al llegar a "Total HH disponibles por día".
    let headerRow = -1;
    for (let r = 1; r <= 35; r++) {
      const valB = parseCellString(ws.getCell(`B${r}`)).toLowerCase();
      const valC = parseCellString(ws.getCell(`C${r}`)).toLowerCase();
      if (valB === 'orden' || valB === 'ot' || valB === 'orden (ot)' || valC === 'operación' || valC === 'operacion') {
        headerRow = r;
        break;
      }
    }
    if (headerRow === -1) headerRow = 13; // Fallback oficial fila 13
    debugLogs.push(`[4] Cabecera de operaciones en hoja "${ws.name}": detectada en fila ${headerRow}`);

    const operacionesMap = new Map<string, any>();
    let hhTotalProgramadas = 0;
    let emptyStreak = 0;

    const maxR = Math.max(ws.rowCount || 0, ws.actualRowCount || 0, 100);
    for (let r = headerRow + 1; r <= maxR; r++) {
      const ordenStr = parseCellString(ws.getCell(`B${r}`));
      const descStr = parseCellString(ws.getCell(`E${r}`));
      const lowerOrden = ordenStr.toLowerCase();
      const lowerDesc = descStr.toLowerCase();

      // Detección de fila de totales o fin de tabla
      if (
        lowerOrden.includes('total hh disponibles') ||
        lowerDesc.includes('total hh disponibles') ||
        lowerOrden.includes('total hh programadas') ||
        lowerDesc.includes('total hh programadas') ||
        lowerOrden.includes('densidad') ||
        lowerDesc.includes('densidad') ||
        lowerOrden.startsWith('total') ||
        lowerDesc.startsWith('total general') ||
        lowerDesc.startsWith('total programad')
      ) {
        debugLogs.push(`[4.1] Fin de tabla de operaciones en fila ${r} por texto de total: "${ordenStr || descStr}"`);
        break;
      }

      // Si la fila está vacía en columna B y E
      if (!ordenStr && !descStr) {
        emptyStreak++;
        if (emptyStreak > 15) break;
        continue;
      }
      emptyStreak = 0;

      // Una OT de Arauco debe contener obligatoriamente dígitos numéricos (ej: 7996176, 8067539).
      const matchDigits = ordenStr.match(/\d{5,12}/);
      if (!matchDigits) {
        continue;
      }

      const numeroOrden = matchDigits[0];
      const operRaw = parseCellString(ws.getCell(`C${r}`));
      const matchOp = operRaw.match(/\d+/);
      const numeroOperacion = matchOp ? matchOp[0].padStart(4, '0') : (operRaw || '0010');
      const ubicacionTecnica = parseCellString(ws.getCell(`D${r}`)) || '340CRR';
      const textoOperacion = descStr || 'Operación sin texto';

      const mi = parseCellNumber(ws.getCell(`G${r}`), 0);
      const ju = parseCellNumber(ws.getCell(`H${r}`), 0);
      const vi = parseCellNumber(ws.getCell(`I${r}`), 0);
      const sa = parseCellNumber(ws.getCell(`J${r}`), 0);
      const dom = parseCellNumber(ws.getCell(`K${r}`), 0);
      const lu = parseCellNumber(ws.getCell(`L${r}`), 0);
      const ma = parseCellNumber(ws.getCell(`M${r}`), 0);
      const totalFila = mi + ju + vi + sa + dom + lu + ma;

      hhTotalProgramadas += totalFila;

      const key = `${numeroOrden}__${numeroOperacion}`;
      const existing = operacionesMap.get(key);
      if (existing) {
        existing.hhMiercoles += mi;
        existing.hhJueves += ju;
        existing.hhViernes += vi;
        existing.hhSabado += sa;
        existing.hhDomingo += dom;
        existing.hhLunes += lu;
        existing.hhMartes += ma;
        existing.hhTotalProgramado += totalFila;
        existing.horasEstimadas += totalFila;
      } else {
        operacionesMap.set(key, {
          numeroOrden,
          numeroOperacion,
          ubicacionTecnica,
          textoOperacion,
          semanaProg: semana,
          anioProg: anio,
          ptoTbjo,
          revision: `PS${semana}${anio}`,
          hhMiercoles: mi,
          hhJueves: ju,
          hhViernes: vi,
          hhSabado: sa,
          hhDomingo: dom,
          hhLunes: lu,
          hhMartes: ma,
          hhTotalProgramado: totalFila,
          horasEstimadas: totalFila
        });
      }
    }

    debugLogs.push(`[5] Operaciones extraídas desde hoja "${ws.name}": ${operacionesMap.size} líneas (${hhTotalProgramadas} HH)`);

    // Respaldo de seguridad: si ProDiaSem arrojó 0 operaciones, extraer desde hoja "Export" o "HojaPegado"
    if (operacionesMap.size === 0 && wsExport) {
      debugLogs.push(`[5.1] Intentando extracción de respaldo desde hoja "Export" (filas:${wsExport.rowCount})`);
      const maxExpR = Math.max(wsExport.rowCount || 0, wsExport.actualRowCount || 0, 50);
      for (let r = 8; r <= maxExpR; r++) {
        const otVal = parseCellString(wsExport.getCell(`E${r}`)); // Col 5: Orig.nec.
        const matchOT = otVal.match(/\d{5,12}/);
        if (!matchOT) continue;

        const numeroOrden = matchOT[0];
        const opVal = parseCellString(wsExport.getCell(`Q${r}`)); // Col 17: Operación
        const matchOp = opVal.match(/\d+/);
        const numeroOperacion = matchOp ? matchOp[0].padStart(4, '0') : (opVal || '0010');
        const ubicacionTecnica = parseCellString(wsExport.getCell(`P${r}`)) || '340CRR'; // Col 16: Ubic.técn.
        const textoOperacion = parseCellString(wsExport.getCell(`R${r}`)) || parseCellString(wsExport.getCell(`O${r}`)) || 'Operación sin texto'; // Col 18 / 15
        const hhTotal = parseCellNumber(wsExport.getCell(`L${r}`), 0); // Col 12: Trabajo HH

        const key = `${numeroOrden}__${numeroOperacion}`;
        if (!operacionesMap.has(key)) {
          operacionesMap.set(key, {
            numeroOrden,
            numeroOperacion,
            ubicacionTecnica,
            textoOperacion,
            semanaProg: semana,
            anioProg: anio,
            ptoTbjo,
            revision: `PS${semana}${anio}`,
            hhMiercoles: 0,
            hhJueves: 0,
            hhViernes: 0,
            hhSabado: 0,
            hhDomingo: 0,
            hhLunes: 0,
            hhMartes: 0,
            hhTotalProgramado: hhTotal,
            horasEstimadas: hhTotal
          });
          hhTotalProgramadas += hhTotal;
        }
      }
      debugLogs.push(`[5.2] Extracción de respaldo completada: ${operacionesMap.size} operaciones recuperadas (${hhTotalProgramadas} HH)`);
    }

    const operacionesExtraidas = Array.from(operacionesMap.values());

    // 4.1 Purgar definitivamente registros espurios o textos de cabecera erróneos previos (ej: "Opción: Duración/Horas Hombres")
    try {
      await prisma.$executeRawUnsafe(
        `DELETE FROM operaciones_om WHERE numero_orden ILIKE '%Opci%' OR numero_orden ILIKE '%Duraci%' OR numero_operacion ILIKE '%Opci%'`
      );
    } catch {
      try {
        await prisma.operacionOM.updateMany({
          where: {
            OR: [
              { numeroOrden: { contains: 'Opci' } },
              { numeroOrden: { contains: 'Duraci' } },
              { numeroOperacion: { contains: 'Opci' } }
            ]
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
            hhTotalProgramado: 0,
            activo: false
          }
        });
      } catch {}
    }

    // 4.2 Desasignar operaciones previas de esta misma semana que ya no estén en el archivo Excel subido
    const keysNuevas = new Set<string>();
    for (const o of operacionesExtraidas) {
      keysNuevas.add(`${o.numeroOrden}__${o.numeroOperacion}`);
      keysNuevas.add(`${o.numeroOrden}__${o.numeroOperacion}-S${semana}`);
    }
    const opsPreviasSemana = await prisma.operacionOM.findMany({
      where: {
        semanaProg: semana,
        anioProg: anio,
        ptoTbjo
      },
      select: { id: true, numeroOrden: true, numeroOperacion: true }
    });

    const idsParaQuitarDeSemana = opsPreviasSemana
      .filter(p => !keysNuevas.has(`${p.numeroOrden}__${p.numeroOperacion}`))
      .map(p => p.id);

    if (idsParaQuitarDeSemana.length > 0) {
      await prisma.operacionOM.updateMany({
        where: { id: { in: idsParaQuitarDeSemana } },
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
    }

    // 5. Guardar operaciones en la base de datos (preservando comentariosEjecucion, fotosEjecucion y evitando quitar operaciones de otras semanas)
    let guardadasOk = 0;
    let guardadasErr = 0;
    const errorsList: string[] = [];

    for (const op of operacionesExtraidas) {
      try {
        const avisoRelacionado = await prisma.aviso.findFirst({
          where: { numeroOrden: op.numeroOrden },
          select: { id: true }
        });

        const existingOp = await prisma.operacionOM.findUnique({
          where: {
            numeroOrden_numeroOperacion: {
              numeroOrden: op.numeroOrden,
              numeroOperacion: op.numeroOperacion
            }
          },
          select: { id: true, semanaProg: true, anioProg: true }
        });

        const numOpKey =
          existingOp &&
          existingOp.semanaProg !== null &&
          (existingOp.semanaProg !== semana || existingOp.anioProg !== anio)
            ? `${op.numeroOperacion}-S${semana}`
            : op.numeroOperacion;

        await prisma.operacionOM.upsert({
          where: {
            numeroOrden_numeroOperacion: {
              numeroOrden: op.numeroOrden,
              numeroOperacion: numOpKey
            }
          },
          update: {
            textoOperacion: op.textoOperacion,
            ubicacionTecnica: op.ubicacionTecnica,
            ptoTbjo: op.ptoTbjo,
            revision: op.revision,
            semanaProg: op.semanaProg,
            anioProg: op.anioProg,
            hhMiercoles: op.hhMiercoles,
            hhJueves: op.hhJueves,
            hhViernes: op.hhViernes,
            hhSabado: op.hhSabado,
            hhDomingo: op.hhDomingo,
            hhLunes: op.hhLunes,
            hhMartes: op.hhMartes,
            hhTotalProgramado: op.hhTotalProgramado,
            activo: true,
            ...(avisoRelacionado?.id ? { avisoId: avisoRelacionado.id } : {})
          },
          create: {
            numeroOrden: op.numeroOrden,
            numeroOperacion: numOpKey,
            textoOperacion: op.textoOperacion,
            ubicacionTecnica: op.ubicacionTecnica,
            ptoTbjo: op.ptoTbjo,
            revision: op.revision,
            horasEstimadas: op.horasEstimadas,
            semanaProg: op.semanaProg,
            anioProg: op.anioProg,
            hhMiercoles: op.hhMiercoles,
            hhJueves: op.hhJueves,
            hhViernes: op.hhViernes,
            hhSabado: op.hhSabado,
            hhDomingo: op.hhDomingo,
            hhLunes: op.hhLunes,
            hhMartes: op.hhMartes,
            hhTotalProgramado: op.hhTotalProgramado,
            activo: true,
            avisoId: avisoRelacionado?.id
          }
        });
        guardadasOk++;
      } catch (opSaveErr: any) {
        guardadasErr++;
        const msg = `OT ${op.numeroOrden} Op ${op.numeroOperacion}: ${opSaveErr?.message || String(opSaveErr)}`;
        errorsList.push(msg);
        console.error('Error guardando operación en BD:', msg);
      }
    }

    // Auto-recuperación: asegurar que todas las operaciones legítimas de esta semana tengan activo = true
    try {
      await prisma.operacionOM.updateMany({
        where: {
          semanaProg: semana,
          anioProg: anio,
          NOT: [
            { numeroOrden: { contains: 'Opci' } },
            { numeroOrden: { contains: 'Duraci' } },
            { numeroOperacion: { contains: 'Opci' } }
          ]
        },
        data: { activo: true }
      });
    } catch {}

    debugLogs.push(`[6] Guardado en BD: ${guardadasOk} operaciones guardadas con éxito, ${guardadasErr} con error.${errorsList.length > 0 ? ' Detalle errores: ' + errorsList.join(' | ') : ''}`);

    const totalEnBd = await prisma.operacionOM.count({
      where: {
        semanaProg: semana,
        anioProg: anio,
        activo: true,
        NOT: [
          { numeroOrden: { contains: 'Opci' } },
          { numeroOrden: { contains: 'Duraci' } },
          { numeroOperacion: { contains: 'Opci' } }
        ]
      }
    });
    debugLogs.push(`[7] Verificación final en BD: ${totalEnBd} operaciones activas registradas para Semana ${semana}/${anio}`);

    // Cálculo de HH disponibles semanales
    const totalOperariosSemana = opMiercoles + opJueves + opViernes + opSabado + opDomingo + opLunes + opMartes;
    const hhDisponibles = totalOperariosSemana * horasJornada;
    const densidad = hhDisponibles > 0 ? Math.round((hhTotalProgramadas / hhDisponibles) * 100) : 0;

    return {
      semana,
      anio,
      ptoTbjo,
      grupoPlanif,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString(),
      totalOperaciones: operacionesExtraidas.length,
      operacionesGuardadasOk: guardadasOk,
      operacionesGuardadasErr: guardadasErr,
      totalEnBd,
      hhDisponibles,
      hhProgramadas: hhTotalProgramadas,
      densidad,
      archivoNombre: filename,
      archivoTamano,
      archivoFecha: archivoFecha.toISOString(),
      debugLogs
    };
  }
}
