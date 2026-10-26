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
  hhDisponibles: number;
  hhProgramadas: number;
  densidad: number;
}

export class AraucoProgramParserService {
  /**
   * Procesa el archivo estándar de programación semanal de Arauco (ej: PS432026 340CRR.xlsm)
   * Lee la hoja ProDiaSem y HojaPegado / Export
   */
  public static async processProgramFile(
    fileBuffer: Buffer,
    filename: string = 'PS-Arauco.xlsm'
  ): Promise<AraucoProgramSummary> {
    const workbook = new ExcelJS.Workbook();
    // @ts-ignore exceljs accepts buffer
    await workbook.xlsx.load(fileBuffer);

    // 1. Identificar hojas
    const ws =
      workbook.getWorksheet('ProDiaSem') ||
      workbook.worksheets.find(w => w.name.toLowerCase().includes('prodia') || w.name.toLowerCase().includes('programa')) ||
      workbook.getWorksheet(1);

    const wsPegado =
      workbook.getWorksheet('HojaPegado') ||
      workbook.getWorksheet('Export') ||
      workbook.worksheets.find(w => w.name.toLowerCase().includes('pegado') || w.name.toLowerCase().includes('export')) ||
      workbook.getWorksheet(2);

    if (!ws) {
      throw new Error("No se encontró la hoja 'ProDiaSem' en el archivo del programa semanal.");
    }

    // 2. Extraer metadatos de cabecera
    const ptoTbjo = String(ws.getCell('D3').result || ws.getCell('D3').value || '340CRR').trim();
    const grupoPlanif = String(ws.getCell('D4').result || ws.getCell('D4').value || 'TA1').trim();

    // Fechas (Desde / Hasta)
    let fechaInicio: Date | null = null;
    let fechaFin: Date | null = null;

    const desdeVal = ws.getCell('C7').result || ws.getCell('C7').value;
    const hastaVal = ws.getCell('C8').result || ws.getCell('C8').value;

    if (desdeVal instanceof Date && !isNaN(desdeVal.getTime())) {
      fechaInicio = desdeVal;
    } else if (typeof desdeVal === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      fechaInicio = new Date(excelEpoch.getTime() + desdeVal * 86400000);
    } else if (desdeVal) {
      fechaInicio = new Date(String(desdeVal));
    }

    if (hastaVal instanceof Date && !isNaN(hastaVal.getTime())) {
      fechaFin = hastaVal;
    } else if (typeof hastaVal === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      fechaFin = new Date(excelEpoch.getTime() + hastaVal * 86400000);
    } else if (hastaVal) {
      fechaFin = new Date(String(hastaVal));
    }

    // Deducir semana y año desde el nombre de archivo (ej: PS432026...) o de las fechas
    let semana = 43;
    let anio = 2026;

    const matchName = filename.match(/PS(\d{2})(\d{4})/i);
    if (matchName) {
      semana = parseInt(matchName[1], 10);
      anio = parseInt(matchName[2], 10);
    } else if (fechaInicio && !isNaN(fechaInicio.getTime())) {
      // Cálculo aproximado de semana ISO
      const d = new Date(Date.UTC(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      semana = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      anio = d.getUTCFullYear();
    }

    if (!fechaInicio) {
      fechaInicio = new Date(anio, 9, 21); // Default Mié 21-Oct-2026
    }
    if (!fechaFin) {
      fechaFin = new Date(fechaInicio.getTime() + 6 * 86400000); // 7 días (Mi a Ma)
    }

    // 3. Extraer dotación de operarios por día
    const parseOp = (cell: any, defaultVal: number): number => {
      if (!cell) return defaultVal;
      const v = cell.result !== undefined ? cell.result : cell.value;
      const n = Number(v);
      return isNaN(n) ? defaultVal : n;
    };

    const opMiercoles = wsPegado ? parseOp(wsPegado.getCell('I2'), 7) : 7;
    const opJueves = wsPegado ? parseOp(wsPegado.getCell('J2'), 8) : 8;
    const opViernes = wsPegado ? parseOp(wsPegado.getCell('K2'), 8) : 8;
    const opSabado = wsPegado ? parseOp(wsPegado.getCell('L2'), 0) : 0;
    const opDomingo = wsPegado ? parseOp(wsPegado.getCell('M2'), 0) : 0;
    const opLunes = wsPegado ? parseOp(wsPegado.getCell('N2'), 7) : 7;
    const opMartes = wsPegado ? parseOp(wsPegado.getCell('O2'), 8) : 8;
    const horasJornada = 7; // 7 hs normales

    // Guardar / actualizar dotación semanal en BD
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
        horasJornada
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
        horasJornada
      }
    });

    // 4. Extraer operaciones programadas (fila 14 en adelante)
    const operacionesExtraidas: any[] = [];
    let hhTotalProgramadas = 0;

    for (let r = 14; r <= ws.rowCount; r++) {
      const ordenVal = ws.getCell(`B${r}`).value;
      if (!ordenVal || String(ordenVal).trim() === '') break; // Fin de operaciones

      const numeroOrden = String(ordenVal).trim();
      const numeroOperacion = String(ws.getCell(`C${r}`).value || '0010').trim();
      const ubicacionTecnica = String(ws.getCell(`D${r}`).value || '').trim() || undefined;
      const textoOperacion = String(ws.getCell(`E${r}`).value || 'Operación sin texto').trim();

      const mi = Number(ws.getCell(`G${r}`).value) || 0;
      const ju = Number(ws.getCell(`H${r}`).value) || 0;
      const vi = Number(ws.getCell(`I${r}`).value) || 0;
      const sa = Number(ws.getCell(`J${r}`).value) || 0;
      const dom = Number(ws.getCell(`K${r}`).value) || 0;
      const lu = Number(ws.getCell(`L${r}`).value) || 0;
      const ma = Number(ws.getCell(`M${r}`).value) || 0;
      const totalFila = mi + ju + vi + sa + dom + lu + ma;

      hhTotalProgramadas += totalFila;

      operacionesExtraidas.push({
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

    // 5. Guardar operaciones en la base de datos
    for (const op of operacionesExtraidas) {
      // Buscar aviso relacionado si existe por orden
      const avisoRelacionado = await prisma.aviso.findFirst({
        where: { numeroOrden: op.numeroOrden },
        select: { id: true }
      });

      await prisma.operacionOM.upsert({
        where: {
          numeroOrden_numeroOperacion: {
            numeroOrden: op.numeroOrden,
            numeroOperacion: op.numeroOperacion
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
          avisoId: avisoRelacionado?.id
        },
        create: {
          numeroOrden: op.numeroOrden,
          numeroOperacion: op.numeroOperacion,
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
          avisoId: avisoRelacionado?.id
        }
      });
    }

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
      hhDisponibles,
      hhProgramadas: hhTotalProgramadas,
      densidad
    };
  }
}
