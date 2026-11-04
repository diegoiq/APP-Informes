import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function insertInBatches(model: any, items: any[], modelName: string, batchSize = 500) {
  if (!items || items.length === 0) return;
  console.log(`📥 Insertando ${items.length} ${modelName}...`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await model.createMany({
      data: batch,
      skipDuplicates: true
    });
    const current = Math.min(i + batchSize, items.length);
    const pct = Math.round((current / items.length) * 100);
    process.stdout.write(`\r   Progreso ${modelName}: ${current}/${items.length} (${pct}%)`);
  }
  console.log('');
}

async function runRestore() {
  const targetDbUrl = process.argv[2] || process.env.DIRECT_URL || process.env.DATABASE_URL;
  const backupFolderArg = process.argv[3];

  console.log('====================================================');
  console.log('⚡ RESTAURACIÓN ACELERADA DE BACKUP A SUPABASE');
  console.log('====================================================');

  if (!targetDbUrl) {
    console.error('❌ Falta la URL de destino de Supabase.');
    process.exit(1);
  }

  const backupsRoot = path.resolve(__dirname, '../../../backups');
  let backupFolder = backupFolderArg;
  if (!backupFolder) {
    const folders = fs.readdirSync(backupsRoot)
      .filter(f => f.startsWith('backup_render_'))
      .sort()
      .reverse();
    if (folders.length === 0) {
      console.error('❌ No se encontró ninguna carpeta de respaldo en:', backupsRoot);
      process.exit(1);
    }
    backupFolder = path.join(backupsRoot, folders[0]);
  }

  const jsonFile = path.join(backupFolder, 'backup_completo_consolidado.json');
  console.log(`📁 Leyendo backup desde: ${backupFolder}`);
  const raw = fs.readFileSync(jsonFile, 'utf8');
  const backup = JSON.parse(raw);
  const data = backup.data;

  const prisma = new PrismaClient({
    datasources: { db: { url: targetDbUrl } }
  });

  try {
    console.log('\n🚀 Conectando a Supabase...');
    await prisma.$connect();

    // 1. Usuarios
    if (data.usuarios?.length) {
      await insertInBatches(prisma.usuario, data.usuarios, 'Usuarios', 100);
    }

    // 2. Personal (limpiar relaciones si vienen anidadas)
    if (data.personal?.length) {
      const cleanPersonal = data.personal.map((p: any) => {
        const { ausencias, asignaciones, ...rest } = p;
        return rest;
      });
      await insertInBatches(prisma.personal, cleanPersonal, 'Personal', 100);
    }

    // 3. Ausencias
    if (data.ausencias?.length) {
      await insertInBatches(prisma.ausenciaPersonal, data.ausencias, 'Ausencias', 100);
    }

    // 4. Avisos
    if (data.avisos?.length) {
      const cleanAvisos = data.avisos.map((a: any) => {
        const { contactosTriaje, programaciones, operaciones, ...rest } = a;
        return rest;
      });
      await insertInBatches(prisma.aviso, cleanAvisos, 'Avisos', 500);
    }

    // 5. Operaciones OM
    if (data.operaciones?.length) {
      const cleanOps = data.operaciones.map((op: any) => {
        const { aviso, ...rest } = op;
        return rest;
      });
      await insertInBatches(prisma.operacionOM, cleanOps, 'Operaciones OM', 500);
    }

    // 6. Dotaciones Arauco
    if (data.dotaciones?.length) {
      await insertInBatches(prisma.dotacionSemanalArauco, data.dotaciones, 'Dotaciones Arauco', 100);
    }

    // 7. Triaje Contactos
    if (data.contactos?.length) {
      const cleanContactos = data.contactos.map((c: any) => {
        const { aviso, ...rest } = c;
        return rest;
      });
      await insertInBatches(prisma.triajeContacto, cleanContactos, 'Contactos Triaje', 200);
    }

    // 8. Obras
    if (data.obras?.length) {
      const cleanObras = data.obras.map((o: any) => {
        const { librosDiarios, ...rest } = o;
        return rest;
      });
      await insertInBatches(prisma.obra, cleanObras, 'Obras', 100);
    }

    // 9. Libros Diarios
    if (data.libros?.length) {
      const cleanLibros = data.libros.map((l: any) => {
        const { fotos, supervisor, obra, ...rest } = l;
        return rest;
      });
      await insertInBatches(prisma.libroDiario, cleanLibros, 'Libros Diarios', 100);
    }

    // 10. Fotos Bitácora
    if (data.fotosBitacora?.length) {
      const cleanFb = data.fotosBitacora.map((fb: any) => {
        const { libroDiario, ...rest } = fb;
        return rest;
      });
      await insertInBatches(prisma.fotoBitacora, cleanFb, 'Fotos Bitácora', 100);
    }

    // 11. Informes CRR
    if (data.informesCRR?.length) {
      const cleanInf = data.informesCRR.map((inf: any) => {
        const { fotos, responsable, ...rest } = inf;
        return rest;
      });
      await insertInBatches(prisma.informeCRR, cleanInf, 'Informes CRR', 50);
    }

    // 12. Fotos Informes CRR (lotes de 25 debido a peso base64)
    if (data.fotosInformeCRR?.length) {
      const cleanFotos = data.fotosInformeCRR.map((f: any) => {
        const { informe, ...rest } = f;
        return rest;
      });
      await insertInBatches(prisma.fotoInformeCRR, cleanFotos, 'Fotos Informes CRR', 25);
    }

    console.log('\n====================================================');
    console.log('🎉 RESTAURACIÓN COMPLETADA EXITOSAMENTE EN SUPABASE');
    console.log('====================================================\n');

  } catch (err: any) {
    console.error('\n❌ Error durante la restauración:', err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

runRestore().catch(e => {
  console.error(e);
  process.exit(1);
});
