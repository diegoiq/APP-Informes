import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno del server o root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

interface ExtractedFile {
  category: string;
  subfolder: string;
  filename: string;
  buffer: Buffer;
  meta?: any;
}

function parseBase64Data(raw: string): { buffer: Buffer; ext: string } | null {
  if (!raw || typeof raw !== 'string') return null;

  try {
    const match = raw.match(/^data:([a-zA-Z0-9\/+-]+);base64,(.+)$/);
    if (match) {
      const mime = match[1];
      const data = match[2];
      let ext = 'jpg';
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      else if (mime.includes('pdf')) ext = 'pdf';
      else if (mime.includes('sheet') || mime.includes('excel')) ext = 'xlsx';

      return {
        buffer: Buffer.from(data, 'base64'),
        ext
      };
    }

    // Si es base64 puro sin header data:...
    if (raw.length > 100 && /^[A-Za-z0-9+/=]+$/.test(raw.slice(0, 100))) {
      return {
        buffer: Buffer.from(raw, 'base64'),
        ext: 'bin'
      };
    }
  } catch (err) {
    // No era base64 válido
  }

  return null;
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 80);
}

async function runBackup() {
  const targetDbUrl = process.env.RENDER_DB_URL || process.argv[2] || process.env.DATABASE_URL;

  console.log('====================================================');
  console.log('🚀 INICIANDO RESPALDO COMPLETO DE BASE DE DATOS');
  console.log('====================================================');

  if (!targetDbUrl || targetDbUrl.includes('file:')) {
    console.error('\n❌ ERROR: No se ha especificado la URL de conexión a la base de datos de Render.');
    console.error('Debes proporcionar la "External Database URL" de Render.\n');
    console.error('Formas de ejecutar:');
    console.error('1) npx tsx src/scripts/backupRenderDb.ts "postgresql://usuario:password@host/dbname"');
    console.error('2) O define RENDER_DB_URL en tu archivo .env\n');
    process.exit(1);
  }

  // Ocultar contraseña en logs
  const maskedUrl = targetDbUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:******@');
  console.log(`📡 Conectando a: ${maskedUrl}`);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: targetDbUrl
      }
    }
  });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupRoot = path.resolve(__dirname, `../../../backups/backup_render_${timestamp}`);
  const tablasDir = path.join(backupRoot, 'tablas_json');
  const fotosDir = path.join(backupRoot, 'archivos_y_fotos');

  fs.mkdirSync(tablasDir, { recursive: true });
  fs.mkdirSync(fotosDir, { recursive: true });

  const stats: Record<string, number> = {};
  const extractedFiles: ExtractedFile[] = [];

  try {
    // 1. Descargar Usuarios
    console.log('\n📥 [1/11] Descargando Usuarios...');
    const usuarios = await prisma.usuario.findMany();
    fs.writeFileSync(path.join(tablasDir, 'usuarios.json'), JSON.stringify(usuarios, null, 2), 'utf8');
    stats['Usuarios'] = usuarios.length;
    console.log(`   ✓ ${usuarios.length} usuarios exportados`);

    // 2. Descargar Avisos y fotos de inspección
    console.log('\n📥 [2/11] Descargando Avisos y fotos de terreno...');
    const avisos = await prisma.aviso.findMany();
    fs.writeFileSync(path.join(tablasDir, 'avisos.json'), JSON.stringify(avisos, null, 2), 'utf8');
    stats['Avisos'] = avisos.length;
    console.log(`   ✓ ${avisos.length} avisos exportados`);

    let avisosFotosCount = 0;
    for (const aviso of avisos) {
      if (aviso.fotosInspeccion) {
        try {
          const parsed = JSON.parse(aviso.fotosInspeccion);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          list.forEach((item: any, idx: number) => {
            const raw = typeof item === 'string' ? item : item.url || item.base64 || item.foto;
            const res = parseBase64Data(raw);
            if (res) {
              const filename = `aviso_${sanitizeFilename(aviso.numeroAviso || aviso.id)}_foto_${idx + 1}_${sanitizeFilename(item.etapa || 'relevamiento')}.${res.ext}`;
              extractedFiles.push({
                category: 'fotos_avisos_terreno',
                subfolder: `aviso_${sanitizeFilename(aviso.numeroAviso || aviso.id)}`,
                filename,
                buffer: res.buffer,
                meta: item
              });
              avisosFotosCount++;
            }
          });
        } catch (e) {
          // Si no era JSON, intentar extraer directo si es base64
          const res = parseBase64Data(aviso.fotosInspeccion);
          if (res) {
            extractedFiles.push({
              category: 'fotos_avisos_terreno',
              subfolder: `aviso_${sanitizeFilename(aviso.numeroAviso || aviso.id)}`,
              filename: `aviso_${sanitizeFilename(aviso.numeroAviso || aviso.id)}_foto_1.${res.ext}`,
              buffer: res.buffer
            });
            avisosFotosCount++;
          }
        }
      }
    }
    stats['Fotos Avisos Relevamiento'] = avisosFotosCount;

    // 3. Descargar Operaciones OM y fotos de ejecución
    console.log('\n📥 [3/11] Descargando Operaciones OM y fotos de ejecución...');
    const operaciones = await prisma.operacionOM.findMany();
    fs.writeFileSync(path.join(tablasDir, 'operaciones_om.json'), JSON.stringify(operaciones, null, 2), 'utf8');
    stats['Operaciones OM'] = operaciones.length;
    console.log(`   ✓ ${operaciones.length} operaciones exportadas`);

    let opFotosCount = 0;
    for (const op of operaciones) {
      if (op.fotosEjecucion) {
        try {
          const parsed = JSON.parse(op.fotosEjecucion);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          list.forEach((item: any, idx: number) => {
            const raw = typeof item === 'string' ? item : item.url || item.base64 || item.foto;
            const res = parseBase64Data(raw);
            if (res) {
              const filename = `orden_${sanitizeFilename(op.numeroOrden)}_op_${sanitizeFilename(op.numeroOperacion)}_foto_${idx + 1}_${sanitizeFilename(item.etapa || 'ejecucion')}.${res.ext}`;
              extractedFiles.push({
                category: 'fotos_operaciones_ejecucion',
                subfolder: `orden_${sanitizeFilename(op.numeroOrden)}`,
                filename,
                buffer: res.buffer,
                meta: item
              });
              opFotosCount++;
            }
          });
        } catch (e) {
          const res = parseBase64Data(op.fotosEjecucion);
          if (res) {
            extractedFiles.push({
              category: 'fotos_operaciones_ejecucion',
              subfolder: `orden_${sanitizeFilename(op.numeroOrden)}`,
              filename: `orden_${sanitizeFilename(op.numeroOrden)}_op_${sanitizeFilename(op.numeroOperacion)}_foto_1.${res.ext}`,
              buffer: res.buffer
            });
            opFotosCount++;
          }
        }
      }
    }
    stats['Fotos Operaciones Ejecución'] = opFotosCount;

    // 4. Descargar Dotación Semanal Arauco y archivos Excel oficiales
    console.log('\n📥 [4/11] Descargando Dotación Arauco y Excels oficiales...');
    const dotaciones = await prisma.dotacionSemanalArauco.findMany();
    fs.writeFileSync(path.join(tablasDir, 'dotacion_semanal_arauco.json'), JSON.stringify(dotaciones, null, 2), 'utf8');
    stats['Semanas Dotación Arauco'] = dotaciones.length;
    console.log(`   ✓ ${dotaciones.length} dotaciones exportadas`);

    let excelFilesCount = 0;
    for (const d of dotaciones) {
      if (d.archivoData) {
        const res = parseBase64Data(d.archivoData);
        if (res) {
          const originalName = d.archivoNombre || `PS_Semana_${d.semana}_${d.anio}.${res.ext}`;
          extractedFiles.push({
            category: 'excels_oficiales_arauco',
            subfolder: `semana_${d.semana}_${d.anio}`,
            filename: sanitizeFilename(originalName),
            buffer: res.buffer
          });
          excelFilesCount++;
        }
      }
    }
    stats['Archivos Excel PS Extraídos'] = excelFilesCount;

    // 5. Descargar Triaje Contactos
    console.log('\n📥 [5/11] Descargando Triaje Contactos...');
    const contactos = await prisma.triajeContacto.findMany();
    fs.writeFileSync(path.join(tablasDir, 'triaje_contactos.json'), JSON.stringify(contactos, null, 2), 'utf8');
    stats['Contactos Triaje'] = contactos.length;
    console.log(`   ✓ ${contactos.length} contactos de triaje exportados`);

    // 6. Descargar Personal y Ausencias
    console.log('\n📥 [6/11] Descargando Personal y Ausencias...');
    const personal = await prisma.personal.findMany({ include: { ausencias: true } });
    fs.writeFileSync(path.join(tablasDir, 'personal.json'), JSON.stringify(personal, null, 2), 'utf8');
    const ausencias = await prisma.ausenciaPersonal.findMany();
    fs.writeFileSync(path.join(tablasDir, 'ausencias_personal.json'), JSON.stringify(ausencias, null, 2), 'utf8');
    stats['Personal'] = personal.length;
    stats['Ausencias'] = ausencias.length;
    console.log(`   ✓ ${personal.length} personas y ${ausencias.length} ausencias exportadas`);

    // 7. Descargar Programación Semanal
    console.log('\n📥 [7/11] Descargando Programación Semanal...');
    const progSemanal = await prisma.programacionSemanal.findMany();
    fs.writeFileSync(path.join(tablasDir, 'programacion_semanal.json'), JSON.stringify(progSemanal, null, 2), 'utf8');
    stats['Asignaciones Semanales'] = progSemanal.length;
    console.log(`   ✓ ${progSemanal.length} asignaciones exportadas`);

    // 8. Descargar Obras y Libros Diarios
    console.log('\n📥 [8/11] Descargando Obras y Libros Diarios...');
    const obras = await prisma.obra.findMany();
    fs.writeFileSync(path.join(tablasDir, 'obras.json'), JSON.stringify(obras, null, 2), 'utf8');
    const libros = await prisma.libroDiario.findMany();
    fs.writeFileSync(path.join(tablasDir, 'libros_diarios.json'), JSON.stringify(libros, null, 2), 'utf8');
    stats['Obras'] = obras.length;
    stats['Libros Diarios'] = libros.length;
    console.log(`   ✓ ${obras.length} obras y ${libros.length} libros diarios exportados`);

    // Extraer firmas de libros
    for (const lib of libros) {
      if (lib.firmaSupervisorUrl) {
        const res = parseBase64Data(lib.firmaSupervisorUrl);
        if (res) {
          extractedFiles.push({
            category: 'firmas',
            subfolder: 'libros_diarios',
            filename: `firma_supervisor_libro_${sanitizeFilename(lib.id)}.${res.ext}`,
            buffer: res.buffer
          });
        }
      }
      if (lib.firmaClienteUrl) {
        const res = parseBase64Data(lib.firmaClienteUrl);
        if (res) {
          extractedFiles.push({
            category: 'firmas',
            subfolder: 'libros_diarios',
            filename: `firma_cliente_libro_${sanitizeFilename(lib.id)}.${res.ext}`,
            buffer: res.buffer
          });
        }
      }
    }

    // 9. Descargar Fotos de Bitácora
    console.log('\n📥 [9/11] Descargando Fotos de Bitácora...');
    const fotosBitacora = await prisma.fotoBitacora.findMany();
    fs.writeFileSync(path.join(tablasDir, 'fotos_bitacora.json'), JSON.stringify(fotosBitacora, null, 2), 'utf8');
    stats['Fotos Bitácora'] = fotosBitacora.length;
    console.log(`   ✓ ${fotosBitacora.length} fotos de bitácora exportadas`);

    let fotosBitacoraFilesCount = 0;
    for (const fb of fotosBitacora) {
      const res = parseBase64Data(fb.url);
      if (res) {
        extractedFiles.push({
          category: 'fotos_bitacora',
          subfolder: `libro_${sanitizeFilename(fb.libroDiarioId)}`,
          filename: `foto_${sanitizeFilename(fb.id)}_${sanitizeFilename(fb.etapa)}.${res.ext}`,
          buffer: res.buffer,
          meta: { diagnosticoPie: fb.diagnosticoPie }
        });
        fotosBitacoraFilesCount++;
      }
    }

    // 10. Descargar Informes CRR
    console.log('\n📥 [10/11] Descargando Informes Técnicos CRR...');
    const informesCRR = await prisma.informeCRR.findMany();
    fs.writeFileSync(path.join(tablasDir, 'informes_crr.json'), JSON.stringify(informesCRR, null, 2), 'utf8');
    stats['Informes CRR'] = informesCRR.length;
    console.log(`   ✓ ${informesCRR.length} informes CRR exportados`);

    for (const inf of informesCRR) {
      if (inf.lugarObraFotoUrl) {
        const res = parseBase64Data(inf.lugarObraFotoUrl);
        if (res) {
          extractedFiles.push({
            category: 'fotos_informes_crr',
            subfolder: `informe_${sanitizeFilename(inf.codigoInforme || inf.id)}`,
            filename: `lugar_obra.${res.ext}`,
            buffer: res.buffer
          });
        }
      }
      if (inf.firmaElaboroUrl) {
        const res = parseBase64Data(inf.firmaElaboroUrl);
        if (res) {
          extractedFiles.push({
            category: 'firmas',
            subfolder: 'informes_crr',
            filename: `firma_elaboro_${sanitizeFilename(inf.codigoInforme || inf.id)}.${res.ext}`,
            buffer: res.buffer
          });
        }
      }
      if (inf.firmaAproboUrl) {
        const res = parseBase64Data(inf.firmaAproboUrl);
        if (res) {
          extractedFiles.push({
            category: 'firmas',
            subfolder: 'informes_crr',
            filename: `firma_aprobo_${sanitizeFilename(inf.codigoInforme || inf.id)}.${res.ext}`,
            buffer: res.buffer
          });
        }
      }
    }

    // 11. Descargar Fotos de Informes CRR
    console.log('\n📥 [11/11] Descargando Fotos de Informes CRR...');
    const fotosInformeCRR = await prisma.fotoInformeCRR.findMany();
    fs.writeFileSync(path.join(tablasDir, 'fotos_informe_crr.json'), JSON.stringify(fotosInformeCRR, null, 2), 'utf8');
    stats['Fotos Informes CRR'] = fotosInformeCRR.length;
    console.log(`   ✓ ${fotosInformeCRR.length} fotos de informes CRR exportadas`);

    let fotosInfFilesCount = 0;
    for (const fi of fotosInformeCRR) {
      const res = parseBase64Data(fi.url);
      if (res) {
        extractedFiles.push({
          category: 'fotos_informes_crr',
          subfolder: `informe_${sanitizeFilename(fi.informeId)}`,
          filename: `foto_${sanitizeFilename(fi.id)}_${sanitizeFilename(fi.etapa)}.${res.ext}`,
          buffer: res.buffer,
          meta: { pie: fi.pieDeFoto, diagnostico: fi.diagnosticoTecnico }
        });
        fotosInfFilesCount++;
      }
    }

    // 12. Escribir todas las fotos y archivos decodificados en disco
    console.log(`\n💾 Guardando ${extractedFiles.length} archivos multimedia/fotos en disco...`);
    for (const item of extractedFiles) {
      const targetFolder = path.join(fotosDir, item.category, item.subfolder);
      fs.mkdirSync(targetFolder, { recursive: true });
      fs.writeFileSync(path.join(targetFolder, item.filename), item.buffer);
    }
    stats['Total Archivos Físicos Extraídos'] = extractedFiles.length;

    // 13. Dump Consolidado
    console.log('\n📦 Generando archivo maestro consolidado...');
    const dumpConsolidado = {
      backupDate: now.toISOString(),
      databaseUrlSource: maskedUrl,
      stats,
      data: {
        usuarios,
        avisos,
        operaciones,
        dotaciones,
        contactos,
        personal,
        ausencias,
        progSemanal,
        obras,
        libros,
        fotosBitacora,
        informesCRR,
        fotosInformeCRR
      }
    };
    fs.writeFileSync(
      path.join(backupRoot, 'backup_completo_consolidado.json'),
      JSON.stringify(dumpConsolidado, null, 2),
      'utf8'
    );

    // 14. Reporte final
    const summaryLines = [
      '====================================================',
      '✅ RESPALDO COMPLETADO EXITOSAMENTE',
      '====================================================',
      `Fecha y Hora: ${now.toLocaleString()}`,
      `Destino: ${backupRoot}`,
      '',
      '--- RESUMEN DE REGISTROS RESPALDADOS ---',
      ...Object.entries(stats).map(([k, v]) => `• ${k.padEnd(35, '.')}: ${v}`),
      '',
      'Estructura de la carpeta generada:',
      '  ├── backup_completo_consolidado.json (Todas las tablas en un solo archivo)',
      '  ├── tablas_json/                     (Cada tabla en un JSON individual)',
      '  └── archivos_y_fotos/                (Todas las fotos y Excels decodificados en carpetas)',
      '===================================================='
    ];

    const reportText = summaryLines.join('\n');
    fs.writeFileSync(path.join(backupRoot, 'REPORTE_BACKUP.txt'), reportText, 'utf8');

    console.log('\n' + reportText);
    console.log(`\n📁 Tu respaldo está a salvo en:\n${backupRoot}\n`);

  } catch (error: any) {
    console.error('\n❌ Error durante el respaldo:', error.message);
    if (error.code) console.error(`Código de error Prisma: ${error.code}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runBackup().catch((e) => {
  console.error(e);
  process.exit(1);
});

