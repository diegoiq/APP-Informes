import prisma from './db';

async function seed() {
  console.log('🌱 APP-Informes DB Inicializada en modo producción (Limpia sin datos demo).');
  // No se cargan datos ficticios. Los usuarios y la dotación se gestionan desde la plataforma.
}

seed()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
