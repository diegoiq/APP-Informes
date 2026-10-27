import bcrypt from 'bcryptjs';
import prisma from './db';

async function seed() {
  console.log('🌱 APP-Informes DB Inicializada.');
  const email = 'diego.a.cristaldo@arauco.com';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Arauco2026', salt);

  await prisma.usuario.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      nombre: 'Diego A. Cristaldo',
      email,
      passwordHash,
      rol: 'admin',
      activo: true
    }
  });
  console.log(`✅ Usuario ${email} sincronizado con clave Arauco2026`);
}

seed()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
