import fs from 'fs';
import path from 'path';
import { SapParserService } from '../services/sapParser.service';
import prisma from '../database/db';

async function test() {
  const filePath = path.resolve(__dirname, '../../uploads/Panel-Avisos-OM.xlsx');
  console.log(`Leyendo archivo de prueba: ${filePath}`);
  const buffer = fs.readFileSync(filePath);

  const summary = await SapParserService.processExcelFile(buffer, 'Panel-Avisos-OM.xlsx');
  console.log('--- RESUMEN DE INGESTA SAP ---');
  console.log(JSON.stringify(summary, null, 2));

  const totalAvisosDb = await prisma.aviso.count();
  console.log(`Total avisos en base de datos: ${totalAvisosDb}`);

  // Probar segunda pasada (idempotencia y protección de campos)
  console.log('\nEjecutando segunda pasada para probar UPSERT...');
  const summary2 = await SapParserService.processExcelFile(buffer, 'Panel-Avisos-OM.xlsx');
  console.log(`Segunda pasada -> Insertados: ${summary2.insertados}, Actualizados: ${summary2.actualizados}`);
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
