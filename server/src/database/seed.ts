import bcrypt from 'bcryptjs';
import prisma from './db';

async function seed() {
  console.log('🌱 Inicializando seed para APP-Informes...');

  // 1. Crear usuarios iniciales (2 de 5 cupos utilizados)
  const existingUsers = await prisma.usuario.count();
  if (existingUsers === 0) {
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const supPass = await bcrypt.hash('sup123', salt);

    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Ing. Carlos Mendoza (Admin)',
        email: 'admin@arauco-crr.cl',
        passwordHash: adminPass,
        rol: 'admin',
        activo: true
      }
    });

    const supervisor = await prisma.usuario.create({
      data: {
        nombre: 'Patricio Riquelme (Supervisor 340CRR)',
        email: 'supervisor@arauco-crr.cl',
        passwordHash: supPass,
        rol: 'supervisor',
        activo: true
      }
    });

    console.log(`✅ Usuarios creados: 2 / 5 cupos ocupados. Quedan 3 cupos libres.`);

    // 2. Crear personal inicial
    const p1 = await prisma.personal.create({
      data: {
        legajo: 'LEG-1042',
        nombre: 'Héctor San Martín',
        especialidad: 'Civil',
        regimenHorario: 9,
        activo: true
      }
    });

    const p2 = await prisma.personal.create({
      data: {
        legajo: 'LEG-1085',
        nombre: 'Rodrigo Valenzuela',
        especialidad: 'Pintura/Aislación',
        regimenHorario: 9,
        activo: true
      }
    });

    const p3 = await prisma.personal.create({
      data: {
        legajo: 'LEG-1120',
        nombre: 'Esteban Paredes C.',
        especialidad: 'Soldador',
        regimenHorario: 9,
        activo: true
      }
    });

    const p4 = await prisma.personal.create({
      data: {
        legajo: 'LEG-1194',
        nombre: 'Claudio Bravo M.',
        especialidad: 'Cañerías/Mecánica',
        regimenHorario: 9,
        activo: true
      }
    });

    console.log(`✅ Dotación de personal creada (4 operarios especializados).`);

    // 3. Crear obra planificada inicial
    const obra = await prisma.obra.create({
      data: {
        codigo: 'OBRA-2026-CRR-01',
        nombre: 'Reparación Estructural y Pintura Torre Enfriamiento N° 1',
        ubicacion: 'Área Celulosa - Planta Industrial Arauco',
        fechaInicio: new Date('2026-10-20'),
        fechaFin: new Date('2026-11-15'),
        avanceProgramado: 45,
        avanceReal: 38,
        estado: 'En Ejecución',
        supervisorResponsableId: supervisor.id
      }
    });

    // 4. Crear entrada de Libro Diario de Obra
    await prisma.libroDiario.create({
      data: {
        obraId: obra.id,
        fecha: new Date('2026-10-25'),
        condicionClimatica: 'Despejado / Óptimo',
        interferencias: JSON.stringify(['Espera liberación permiso bloqueo HSE (30 min)']),
        descripcionJornada: 'Se ejecutó arenado Sa 2½ en 14 m² de vigas de soporte principal bajo cerramiento envolvente. Medición de perfil de anclaje conforme según norma SSPC.',
        observacionesSeguridad: 'Charla de 5 minutos sobre trabajo en altura y revisión de arneses con doble cabo de vida.',
        supervisorId: supervisor.id,
        validadoCliente: false
      }
    });

    console.log(`✅ Obra inicial y bitácora de libro diario creadas.`);
  } else {
    console.log(`ℹ️ La base de datos ya contiene ${existingUsers} usuarios.`);
  }

  console.log('🚀 Seed completado exitosamente.');
}

seed()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
