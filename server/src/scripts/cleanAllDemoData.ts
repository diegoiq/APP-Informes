import prisma from '../database/db';

async function cleanAllDemoData() {
  if (process.env.FORCE_CLEAN_DEMO !== 'true') {
    console.log('⚠️ [CLEANUP] Limpieza omitida: No se definió FORCE_CLEAN_DEMO=true. Los datos reales están protegidos contra borrado involuntario.');
    return;
  }
  console.log('🧹 [CLEANUP] Limpiando datos demo en base de datos...');

  try {
    // 1. Fotos e Informes
    await prisma.fotoInformeCRR.deleteMany({});
    const inf = await prisma.informeCRR.deleteMany({});
    console.log(`- Informes CRR eliminados: ${inf.count}`);

    // 2. Fotos y Libros Diarios y Obras
    await prisma.fotoBitacora.deleteMany({});
    await prisma.libroDiario.deleteMany({});
    const obr = await prisma.obra.deleteMany({});
    console.log(`- Obras eliminadas: ${obr.count}`);

    // 3. Programación y Dotación de Personal demo
    await prisma.programacionSemanal.deleteMany({});
    await prisma.ausenciaPersonal.deleteMany({});
    const per = await prisma.personal.deleteMany({});
    console.log(`- Operarios eliminados: ${per.count}`);

    // 4. Contactos y Avisos demo
    await prisma.triajeContacto.deleteMany({});
    const avi = await prisma.aviso.deleteMany({});
    console.log(`- Avisos demo eliminados: ${avi.count}`);

    // 5. Usuarios demo precargados (si existen otros usuarios, se borran los demo para liberar los 5 cupos)
    const userCount = await prisma.usuario.count();
    const otherUsers = await prisma.usuario.count({
      where: {
        email: { notIn: ['admin@arauco-crr.cl', 'supervisor@arauco-crr.cl'] }
      }
    });

    if (otherUsers > 0) {
      // Si ya hay usuarios reales creados, borramos los 2 de demo
      await prisma.usuario.deleteMany({
        where: { email: { in: ['admin@arauco-crr.cl', 'supervisor@arauco-crr.cl'] } }
      });
      console.log('- Usuarios demo eliminados; se conservaron los usuarios reales registrados.');
    } else {
      console.log(`- Usuarios actuales: ${userCount}. Puedes registrar tu usuario real en /register.`);
    }

    console.log('✅ Base de datos limpia y lista para datos reales.');
  } catch (error: any) {
    console.error('Error durante la limpieza de datos demo:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllDemoData();
