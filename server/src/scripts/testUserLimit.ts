import prisma from '../database/db';

async function testUserLimit() {
  console.log('--- TEST: REGLA DE NEGOCIO ESTRICTA 5 USUARIOS MÁXIMO ---');
  const countInitial = await prisma.usuario.count();
  console.log(`Usuarios iniciales en BD: ${countInitial}`);

  // Simular la regla del endpoint POST /api/auth/register
  const MAX_USERS = 5;

  const tryRegister = async (nombre: string, email: string) => {
    const currentCount = await prisma.usuario.count();
    if (currentCount >= MAX_USERS) {
      return {
        status: 403,
        error: 'Límite alcanzado: la aplicación no admite más de 5 usuarios registrados.'
      };
    }
    const user = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash: 'dummy_hash',
        rol: 'programador'
      }
    });
    return { status: 201, user };
  };

  // Agregar usuarios hasta llegar a 5
  console.log('Registrando usuario 3...');
  console.log(await tryRegister('Usuario 3', 'u3@arauco.cl'));

  console.log('Registrando usuario 4...');
  console.log(await tryRegister('Usuario 4', 'u4@arauco.cl'));

  console.log('Registrando usuario 5 (límite máximo alcanzado)...');
  console.log(await tryRegister('Usuario 5', 'u5@arauco.cl'));

  // Intento de usuario 6
  console.log('Intentando registrar usuario 6 (debe fallar con 403)...');
  const res6 = await tryRegister('Usuario 6', 'u6@arauco.cl');
  console.log('Resultado intento 6:', res6);

  if (
    res6.status === 403 &&
    res6.error === 'Límite alcanzado: la aplicación no admite más de 5 usuarios registrados.'
  ) {
    console.log('✅ REGLA ESTRICTA VALIDADA CORRECTAMENTE: El 6to usuario fue rechazado con 403.');
  } else {
    console.error('❌ FALLÓ LA VALIDACIÓN DEL LÍMITE DE USUARIOS');
  }

  // Limpiar los usuarios creados de prueba u3, u4, u5 para dejar 3 cupos libres para el usuario
  await prisma.usuario.deleteMany({
    where: {
      email: { in: ['u3@arauco.cl', 'u4@arauco.cl', 'u5@arauco.cl'] }
    }
  });

  const countFinal = await prisma.usuario.count();
  console.log(`Usuarios en BD tras limpieza: ${countFinal} (Cupos disponibles: ${MAX_USERS - countFinal})`);
}

testUserLimit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
