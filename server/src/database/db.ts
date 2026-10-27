import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

// Middleware global de Soft-Delete: Prohíbe DELETE físico en toda la base de datos
prisma.$use(async (params, next) => {
  // 1. Interceptar delete unitario y convertirlo en soft-delete
  if (params.action === 'delete') {
    params.action = 'update';
    params.args = {
      ...params.args,
      data: { ...(params.args?.data || {}), activo: false }
    };
  }

  // 2. Interceptar delete masivo y convertirlo en updateMany
  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    if (!params.args) params.args = {};
    params.args.data = { ...(params.args.data || {}), activo: false };
  }

  // 3. Filtrar registros activos por defecto en consultas de lectura
  if (['findMany', 'findFirst', 'count', 'aggregate'].includes(params.action)) {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.activo === undefined) {
      params.args.where.activo = true;
    }
  }

  return next(params);
});

export default prisma;
