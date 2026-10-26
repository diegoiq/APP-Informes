import { Request, Response } from 'express';
import prisma from '../database/db';

export class PersonalController {
  /**
   * Listar personal con cálculo de disponibilidad, ausencias y filtros
   */
  public static async list(req: Request, res: Response) {
    try {
      const { search, rubro, includeInactive } = req.query;
      const where: any = {};

      if (includeInactive !== 'true') {
        where.activo = true;
      }

      if (rubro) {
        where.especialidad = String(rubro);
      }

      if (search) {
        const q = String(search).trim();
        where.OR = [
          { nombre: { contains: q } },
          { legajo: { contains: q } }
        ];
      }

      const personal = await prisma.personal.findMany({
        where,
        include: {
          ausencias: {
            orderBy: { fechaInicio: 'desc' }
          },
          asignaciones: {
            take: 10,
            orderBy: { fecha: 'desc' }
          }
        },
        orderBy: { nombre: 'asc' }
      });
      return res.json(personal);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al listar personal', error: error.message });
    }
  }

  /**
   * Crear nuevo operario
   */
  public static async create(req: Request, res: Response) {
    try {
      const { legajo, nombre, especialidad, regimenHorario } = req.body;
      if (!legajo || !nombre || !especialidad) {
        return res.status(400).json({ message: 'Legajo, nombre y especialidad son obligatorios.' });
      }

      const legajoClean = String(legajo).trim().toUpperCase();

      // Verificar legajo duplicado
      const existing = await prisma.personal.findUnique({
        where: { legajo: legajoClean }
      });
      if (existing) {
        return res.status(400).json({ message: `El legajo ${legajoClean} ya se encuentra registrado.` });
      }

      const nuevo = await prisma.personal.create({
        data: {
          legajo: legajoClean,
          nombre: String(nombre).trim(),
          especialidad: String(especialidad),
          regimenHorario: Number(regimenHorario) || 9,
          activo: true
        }
      });
      return res.status(201).json(nuevo);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al crear personal', error: error.message });
    }
  }

  /**
   * Carga masiva de operarios (Batch / Lote / CSV)
   */
  public static async bulkCreate(req: Request, res: Response) {
    try {
      const { operarios } = req.body; // Array de { legajo, nombre, especialidad, regimenHorario }
      if (!Array.isArray(operarios) || operarios.length === 0) {
        return res.status(400).json({ message: 'Se requiere una lista de operarios para la carga masiva.' });
      }

      let creados = 0;
      let actualizados = 0;
      const errores: string[] = [];

      for (const item of operarios) {
        const legajo = String(item.legajo || '').trim().toUpperCase();
        const nombre = String(item.nombre || '').trim();
        const especialidad = String(item.especialidad || 'Mantenimiento General').trim();
        const regimenHorario = Number(item.regimenHorario) || 9;

        if (!legajo || !nombre) {
          errores.push(`Fila omitida por falta de legajo o nombre: ${JSON.stringify(item)}`);
          continue;
        }

        try {
          const existing = await prisma.personal.findUnique({ where: { legajo } });
          if (existing) {
            await prisma.personal.update({
              where: { id: existing.id },
              data: { nombre, especialidad, regimenHorario, activo: true }
            });
            actualizados++;
          } else {
            await prisma.personal.create({
              data: { legajo, nombre, especialidad, regimenHorario, activo: true }
            });
            creados++;
          }
        } catch (err: any) {
          errores.push(`Legajo ${legajo}: ${err.message}`);
        }
      }

      return res.json({
        message: 'Carga masiva completada',
        creados,
        actualizados,
        totalProcesados: operarios.length,
        errores
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error en la carga masiva de personal', error: error.message });
    }
  }

  /**
   * Actualizar operario
   */
  public static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { legajo, nombre, especialidad, regimenHorario, activo } = req.body;

      const updated = await prisma.personal.update({
        where: { id },
        data: {
          ...(legajo && { legajo: String(legajo).trim().toUpperCase() }),
          ...(nombre && { nombre: String(nombre).trim() }),
          ...(especialidad && { especialidad: String(especialidad) }),
          ...(regimenHorario !== undefined && { regimenHorario: Number(regimenHorario) }),
          ...(activo !== undefined && { activo: Boolean(activo) })
        }
      });
      return res.json(updated);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al actualizar personal', error: error.message });
    }
  }

  /**
   * Eliminar operario
   */
  public static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.personal.delete({ where: { id } });
      return res.json({ message: 'Operario eliminado correctamente de la dotación' });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al eliminar operario', error: error.message });
    }
  }

  /**
   * Registrar ausencia (vacaciones, licencias, cursos)
   */
  public static async registrarAusencia(req: Request, res: Response) {
    try {
      const { personalId } = req.params;
      const { tipo, fechaInicio, fechaFin, observaciones } = req.body;

      const ausencia = await prisma.ausenciaPersonal.create({
        data: {
          personalId,
          tipo,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          observaciones
        }
      });
      return res.status(201).json(ausencia);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al registrar ausencia', error: error.message });
    }
  }

  /**
   * Eliminar ausencia
   */
  public static async eliminarAusencia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.ausenciaPersonal.delete({ where: { id } });
      return res.json({ message: 'Ausencia eliminada correctamente' });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al eliminar ausencia', error: error.message });
    }
  }

  /**
   * Obtener tablero de programación semanal con semáforos de capacidad
   */
  public static async getProgramacionSemanal(req: Request, res: Response) {
    try {
      const semana = Number(req.query.semana) || 44;
      const anio = Number(req.query.anio) || 2026;
      const rubroFiltro = req.query.rubro ? String(req.query.rubro) : undefined;

      const wherePersonal: any = { activo: true };
      if (rubroFiltro) {
        wherePersonal.especialidad = rubroFiltro;
      }

      const personalList = await prisma.personal.findMany({
        where: wherePersonal,
        include: {
          ausencias: true,
          asignaciones: {
            where: { semana, anio },
            include: { aviso: true }
          }
        }
      });

      // Cálculo de balance de capacidad
      const tablero = personalList.map((p: any) => {
        // Horas base semanales (régimen 8 o 9 horas * 5 días laborales = 40 o 45h)
        const horasBaseSemanales = (p.regimenHorario || 9) * 5;

        // Sumar horas asignadas en la semana
        const horasAsignadasTotales = p.asignaciones.reduce(
          (acc: number, asig: any) => acc + (asig.horasAsignadas || 0),
          0
        );

        const porcentajeOcupacion =
          horasBaseSemanales > 0
            ? Math.round((horasAsignadasTotales / horasBaseSemanales) * 100)
            : 0;

        let estadoSemaforo: 'verde' | 'amarillo' | 'rojo' = 'verde';
        if (porcentajeOcupacion > 100) {
          estadoSemaforo = 'rojo'; // Sobreasignado
        } else if (porcentajeOcupacion < 75) {
          estadoSemaforo = 'amarillo'; // Ocioso / Capacidad disponible
        } else {
          estadoSemaforo = 'verde'; // Nivelado (75-100%)
        }

        return {
          personal: p,
          capacidadDisponibleHoras: Math.max(0, horasBaseSemanales - horasAsignadasTotales),
          horasAsignadasTotales,
          porcentajeOcupacion,
          estadoSemaforo,
          asignaciones: p.asignaciones
        };
      });

      return res.json(tablero);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener programación semanal', error: error.message });
    }
  }

  /**
   * Asignar o reprogramar tarea a un operario (Drag & Drop)
   */
  public static async guardarAsignacion(req: Request, res: Response) {
    try {
      const {
        id,
        semana,
        anio,
        personalId,
        avisoId,
        diaSemana,
        fecha,
        horasAsignadas,
        descripcionTarea
      } = req.body;

      if (id) {
        const updated = await prisma.programacionSemanal.update({
          where: { id },
          data: {
            personalId,
            diaSemana,
            fecha: new Date(fecha),
            horasAsignadas: Number(horasAsignadas) || 4,
            descripcionTarea
          }
        });
        return res.json(updated);
      } else {
        const created = await prisma.programacionSemanal.create({
          data: {
            semana: Number(semana),
            anio: Number(anio),
            personalId,
            avisoId: avisoId || null,
            diaSemana,
            fecha: new Date(fecha),
            horasAsignadas: Number(horasAsignadas) || 4,
            descripcionTarea: descripcionTarea || 'Mantenimiento preventivo/correctivo'
          }
        });
        return res.status(201).json(created);
      }
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al guardar asignación de programación', error: error.message });
    }
  }

  /**
   * Eliminar asignación
   */
  public static async eliminarAsignacion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.programacionSemanal.delete({ where: { id } });
      return res.json({ message: 'Asignación eliminada correctamente' });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al eliminar asignación', error: error.message });
    }
  }
}
