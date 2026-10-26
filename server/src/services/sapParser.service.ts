import ExcelJS from 'exceljs';
import prisma from '../database/db';
import { ExcelIngestionSummary } from '@app-informes/shared';

// Helper to normalize header names
function normalizeHeader(header: any): string {
  if (!header) return '';
  return String(header)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, ''); // keep only alphanumeric
}

function parseCellDate(cellValue: any): Date | undefined {
  if (!cellValue) return undefined;
  if (cellValue instanceof Date && !isNaN(cellValue.getTime())) return cellValue;
  if (typeof cellValue === 'number') {
    // Excel date serial number (days since 1900-01-01)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + cellValue * 86400000);
  }
  const parsed = new Date(String(cellValue));
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseCellString(cellValue: any): string {
  if (cellValue === null || cellValue === undefined) return '';
  if (typeof cellValue === 'object' && 'text' in cellValue) {
    return String(cellValue.text).trim();
  }
  return String(cellValue).trim();
}

function parseCellNumber(cellValue: any): number | undefined {
  if (cellValue === null || cellValue === undefined || cellValue === '') return undefined;
  const num = Number(cellValue);
  return isNaN(num) ? undefined : num;
}

export class SapParserService {
  /**
   * Procesa el archivo Excel estándar Panel-Avisos-OM.xlsx
   * Realiza cruce relacional entre 'Avisos', 'OM' y 'Analisis'
   * Aplica lógica de UPSERT protegiendo datos de campo de los usuarios
   */
  public static async processExcelFile(
    fileBuffer: Buffer,
    filename: string = 'Panel-Avisos-OM.xlsx'
  ): Promise<ExcelIngestionSummary> {
    const workbook = new ExcelJS.Workbook();
    // @ts-ignore exceljs accepts buffer
    await workbook.xlsx.load(fileBuffer);

    const summary: ExcelIngestionSummary = {
      nombreArchivo: filename,
      totalAvisosProcesados: 0,
      totalOMProcesadas: 0,
      totalAnalisisProcesados: 0,
      insertados: 0,
      actualizados: 0,
      filtrados340CRR: 0,
      otrosPuestos: 0,
      errores: [],
      fechaIngesta: new Date().toISOString()
    };

    // 1. Identificar las hojas
    let sheetAvisos: ExcelJS.Worksheet | undefined;
    let sheetOM: ExcelJS.Worksheet | undefined;
    let sheetAnalisis: ExcelJS.Worksheet | undefined;

    workbook.eachSheet((ws) => {
      const name = ws.name.toLowerCase().trim();
      if (name.includes('aviso')) sheetAvisos = ws;
      else if (name === 'om' || name.includes('orden')) sheetOM = ws;
      else if (name.includes('anali')) sheetAnalisis = ws;
    });

    // Fallbacks si las hojas tienen nombres por defecto
    if (!sheetAvisos) sheetAvisos = workbook.getWorksheet(1);
    if (!sheetOM && workbook.worksheets.length >= 2) sheetOM = workbook.getWorksheet(2);
    if (!sheetAnalisis && workbook.worksheets.length >= 3) sheetAnalisis = workbook.getWorksheet(3);

    if (!sheetAvisos) {
      throw new Error("No se encontró la hoja obligatoria de 'Avisos' en el archivo Excel proporcionado.");
    }

    // 2. Indexar Hoja 'OM' (cruce por Orden y Aviso)
    const omMapByOrden = new Map<string, any>();
    const omMapByAviso = new Map<string, any>();

    if (sheetOM) {
      let omHeaders: Record<string, number> = {};
      sheetOM.getRow(1).eachCell((cell, colNumber) => {
        const norm = normalizeHeader(cell.value);
        if (norm) omHeaders[norm] = colNumber;
      });

      sheetOM.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // header
        summary.totalOMProcesadas++;

        const getVal = (keys: string[]) => {
          for (const k of keys) {
            const col = omHeaders[k];
            if (col) {
              const val = row.getCell(col).value;
              if (val !== null && val !== undefined) return val;
            }
          }
          return undefined;
        };

        const numOrden = parseCellString(getVal(['orden', 'norden', 'numeroorden']));
        const numAviso = parseCellString(getVal(['aviso', 'naviso', 'numeroaviso']));
        const ptoTbjo = parseCellString(getVal(['ptotbjoresponsable', 'ptotbjo', 'puesto']));
        const revision = parseCellString(getVal(['revision', 'rev']));
        const ubicacionTecnica = parseCellString(getVal(['ubicaciontecnica', 'ubctecnica', 'ubicacion']));
        const denominacionUbicacion = parseCellString(getVal(['denominaciondelaubicaciontecnica', 'denominacion', 'denomubicacion']));
        const claseOrden = parseCellString(getVal(['clasedeorden', 'claseorden', 'clase']));
        const costesReales = parseCellNumber(getVal(['costestotreales', 'costesreales', 'coste']));
        const areaEmpresa = parseCellString(getVal(['areadeempresa', 'areaempresa', 'area']));
        const fIniExtrema = parseCellDate(getVal(['fechadeinicioextrema', 'fechainicioextrema', 'finicioextrema']));
        const fFinExtrema = parseCellDate(getVal(['fechafinextrema', 'ffinextrema']));
        const fIniReal = parseCellDate(getVal(['fechainicioreal', 'finicioreal']));
        const fFinReal = parseCellDate(getVal(['fecharealdefin', 'fechafinreal', 'ffinreal']));

        const omData = {
          numOrden,
          numAviso,
          ptoTbjoResponsable: ptoTbjo,
          revision,
          ubicacionTecnica,
          denominacionUbicacion,
          claseOrden,
          costesTotReales: costesReales,
          areaEmpresa,
          fechaInicioExtrema: fIniExtrema,
          fechaFinExtrema: fFinExtrema,
          fechaInicioReal: fIniReal,
          fechaRealFin: fFinReal
        };

        if (numOrden) omMapByOrden.set(numOrden, omData);
        if (numAviso) omMapByAviso.set(numAviso, omData);
      });
    }

    // 3. Indexar Hoja 'Analisis' (Taxonomía operativa nativa)
    const analisisMap = new Map<string, any>();

    if (sheetAnalisis) {
      let anHeaders: Record<string, number> = {};
      sheetAnalisis.getRow(1).eachCell((cell, colNumber) => {
        const norm = normalizeHeader(cell.value);
        if (norm) anHeaders[norm] = colNumber;
      });

      sheetAnalisis.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        summary.totalAnalisisProcesados++;

        const getVal = (keys: string[]) => {
          for (const k of keys) {
            const col = anHeaders[k];
            if (col) {
              const val = row.getCell(col).value;
              if (val !== null && val !== undefined) return val;
            }
          }
          return undefined;
        };

        const numAviso = parseCellString(getVal(['aviso', 'naviso', 'numeroaviso']));
        const numOrden = parseCellString(getVal(['orden', 'norden', 'numeroorden']));
        const rubro = parseCellString(getVal(['rubro', 'especialidad']));
        const tipoRiesgo = parseCellString(getVal(['tipoderiesgocivilfisico', 'tiporiesgo', 'riesgo']));
        const tipoCondicionFinal = parseCellString(getVal(['tipocondicionfinal', 'condicionfinal', 'condicion']));
        const efecto = parseCellString(getVal(['efecto', 'impacto']));
        const faseAvance = parseCellString(getVal(['fasedeavance', 'faseavance', 'fase']));

        const data = {
          numAviso,
          numOrden,
          rubro: rubro || undefined,
          tipoRiesgo: tipoRiesgo || undefined,
          tipoCondicionFinal: tipoCondicionFinal || undefined,
          efectoAnalisis: efecto || undefined,
          faseAvance: faseAvance || undefined
        };

        if (numAviso) analisisMap.set(`aviso:${numAviso}`, data);
        if (numOrden) analisisMap.set(`orden:${numOrden}`, data);
      });
    }

    // 4. Procesar Hoja 'Avisos' y ejecutar Upsert relacional
    let avisosHeaders: Record<string, number> = {};
    sheetAvisos.getRow(1).eachCell((cell, colNumber) => {
      const norm = normalizeHeader(cell.value);
      if (norm) avisosHeaders[norm] = colNumber;
    });

    const rowsToProcess: any[] = [];
    sheetAvisos.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      summary.totalAvisosProcesados++;

      const getVal = (keys: string[]) => {
        for (const k of keys) {
          const col = avisosHeaders[k];
          if (col) {
            const val = row.getCell(col).value;
            if (val !== null && val !== undefined) return val;
          }
        }
        return undefined;
      };

      const numeroAviso = parseCellString(getVal(['aviso', 'naviso', 'numeroaviso']));
      if (!numeroAviso) return; // Fila vacía o sin ID de aviso

      const fechaNotificacion = parseCellDate(getVal(['fechanotificacion', 'fechanotif', 'fecha']));
      const descripcion = parseCellString(getVal(['descripcion', 'desc', 'texto'])) || 'Sin descripción en SAP';
      const numeroOrden = parseCellString(getVal(['orden', 'norden', 'numeroorden'])) || undefined;
      const estadoSistema = parseCellString(getVal(['estadodelsistema', 'estadosistema', 'status'])) || 'MEAB';
      const autor = parseCellString(getVal(['autor', 'creadopor', 'solicitante'])) || undefined;
      const efecto = parseCellString(getVal(['efecto', 'consecuencia'])) || undefined;
      const prioridadSap = parseCellString(getVal(['prioridad', 'prio', 'prioridadsap'])) || undefined;

      // Cruce con OM
      const omInfo = (numeroOrden ? omMapByOrden.get(numeroOrden) : undefined) || omMapByAviso.get(numeroAviso);

      // Cruce con Análisis
      const analisisInfo =
        analisisMap.get(`aviso:${numeroAviso}`) || (numeroOrden ? analisisMap.get(`orden:${numeroOrden}`) : undefined);

      const ptoTbjo = omInfo?.ptoTbjoResponsable || '';
      const is340CRR = ptoTbjo.toUpperCase().includes('340CRR') || ptoTbjo === '';

      if (is340CRR) {
        summary.filtrados340CRR++;
      } else {
        summary.otrosPuestos++;
      }

      rowsToProcess.push({
        numeroAviso,
        fechaNotificacion,
        descripcion,
        numeroOrden: numeroOrden || omInfo?.numOrden,
        estadoSistema,
        autor,
        efecto,
        prioridadSap,

        // Relacional OM
        ptoTbjoResponsable: omInfo?.ptoTbjoResponsable || (is340CRR ? '340CRR' : undefined),
        revision: omInfo?.revision,
        ubicacionTecnica: omInfo?.ubicacionTecnica,
        denominacionUbicacion: omInfo?.denominacionUbicacion,
        claseOrden: omInfo?.claseOrden,
        costesTotReales: omInfo?.costesTotReales,
        areaEmpresa: omInfo?.areaEmpresa,
        fechaInicioExtrema: omInfo?.fechaInicioExtrema,
        fechaFinExtrema: omInfo?.fechaFinExtrema,
        fechaInicioReal: omInfo?.fechaInicioReal,
        fechaRealFin: omInfo?.fechaRealFin,

        // Relacional Análisis
        rubro: analisisInfo?.rubro,
        tipoRiesgo: analisisInfo?.tipoRiesgo,
        tipoCondicionFinal: analisisInfo?.tipoCondicionFinal,
        efectoAnalisis: analisisInfo?.efectoAnalisis,
        faseAvance: analisisInfo?.faseAvance || '1. Planificación'
      });
    });

    // 5. Transacción de Upsert asegurando no sobreescribir datos de campo
    for (const item of rowsToProcess) {
      try {
        const existing = await prisma.aviso.findUnique({
          where: { numeroAviso: item.numeroAviso }
        });

        if (existing) {
          // ACTUALIZAR solo campos de SAP, preservando notas de campo, horas reales, asignado y prioridad acordada
          await prisma.aviso.update({
            where: { id: existing.id },
            data: {
              fechaNotificacion: item.fechaNotificacion ?? existing.fechaNotificacion,
              descripcion: item.descripcion,
              numeroOrden: item.numeroOrden ?? existing.numeroOrden,
              estadoSistema: item.estadoSistema,
              autor: item.autor ?? existing.autor,
              efecto: item.efecto ?? existing.efecto,
              prioridadSap: item.prioridadSap ?? existing.prioridadSap,
              ptoTbjoResponsable: item.ptoTbjoResponsable ?? existing.ptoTbjoResponsable,
              revision: item.revision ?? existing.revision,
              ubicacionTecnica: item.ubicacionTecnica ?? existing.ubicacionTecnica,
              denominacionUbicacion: item.denominacionUbicacion ?? existing.denominacionUbicacion,
              claseOrden: item.claseOrden ?? existing.claseOrden,
              costesTotReales: item.costesTotReales ?? existing.costesTotReales,
              areaEmpresa: item.areaEmpresa ?? existing.areaEmpresa,
              fechaInicioExtrema: item.fechaInicioExtrema ?? existing.fechaInicioExtrema,
              fechaFinExtrema: item.fechaFinExtrema ?? existing.fechaFinExtrema,
              fechaInicioReal: item.fechaInicioReal ?? existing.fechaInicioReal,
              fechaRealFin: item.fechaRealFin ?? existing.fechaRealFin,
              rubro: item.rubro ?? existing.rubro,
              tipoRiesgo: item.tipoRiesgo ?? existing.tipoRiesgo,
              tipoCondicionFinal: item.tipoCondicionFinal ?? existing.tipoCondicionFinal,
              efectoAnalisis: item.efectoAnalisis ?? existing.efectoAnalisis,
              faseAvance: item.faseAvance ?? existing.faseAvance
              // NOTA CRÍTICA: NO SE ACTUALIZAN horasRealesIncurridas, notasCampo, prioridadRealAcordada, asignadoAId
            }
          });
          summary.actualizados++;
        } else {
          // INSERTAR nuevo registro
          await prisma.aviso.create({
            data: {
              numeroAviso: item.numeroAviso,
              fechaNotificacion: item.fechaNotificacion,
              descripcion: item.descripcion,
              numeroOrden: item.numeroOrden,
              estadoSistema: item.estadoSistema,
              autor: item.autor,
              efecto: item.efecto,
              prioridadSap: item.prioridadSap,
              ptoTbjoResponsable: item.ptoTbjoResponsable,
              revision: item.revision,
              ubicacionTecnica: item.ubicacionTecnica,
              denominacionUbicacion: item.denominacionUbicacion,
              claseOrden: item.claseOrden,
              costesTotReales: item.costesTotReales,
              areaEmpresa: item.areaEmpresa,
              fechaInicioExtrema: item.fechaInicioExtrema,
              fechaFinExtrema: item.fechaFinExtrema,
              fechaInicioReal: item.fechaInicioReal,
              fechaRealFin: item.fechaRealFin,
              rubro: item.rubro,
              tipoRiesgo: item.tipoRiesgo,
              tipoCondicionFinal: item.tipoCondicionFinal,
              efectoAnalisis: item.efectoAnalisis,
              faseAvance: item.faseAvance || '1. Planificación',
              contadorInsistencias: 0
            }
          });
          summary.insertados++;
        }
      } catch (err: any) {
        summary.errores.push(`Aviso ${item.numeroAviso}: ${err.message || String(err)}`);
      }
    }

    return summary;
  }
}
