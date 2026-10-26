import { Request, Response } from 'express';
import prisma from '../database/db';

export class PersonalController {
  /**
   * Listar personal con cálculo de disponibilidad y ausencias
   */
  public static async list(req: Request, res: Response) {
    try {
      const personal = await prisma.personal.findMany({
        where: { activo: true },
        include: {
          ausencias: {
            orderBy: { fechaInicio: 'desc' }
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

      const nuevo = await prisma.personal.create({
        data: {
          legajo: String(legajo).trim(),
          nombre: String(nombre).trim(),
          especialidad: String(especialidad),
          regimenHorario: Number(regimenHorario) || 9
        }
      });
      return res.status(201).json(nuevo);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al crear personal', error: error.message });
    }
  }

  /**
   * Registrar ausencia (vacaciones, licencias, etc.)
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
        // Actualizar asignación existente
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
        // Crear nueva asignación
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
