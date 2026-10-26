import { Request, Response } from 'express';
import prisma from '../database/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class TriajeController {
  /**
   * Registra un nuevo contacto con el solicitante (llamada, correo, presencial)
   */
  public static async registrarContacto(req: AuthenticatedRequest, res: Response) {
    try {
      const { avisoId } = req.params;
      const { canal, solicitante, resumen, acuerdosTomados } = req.body;

      if (!canal || !solicitante || !resumen) {
        return res.status(400).json({ message: 'Canal, solicitante y resumen son obligatorios.' });
      }

      const contacto = await prisma.triajeContacto.create({
        data: {
          avisoId,
          canal,
          solicitante,
          resumen,
          acuerdosTomados: acuerdosTomados || 'Sin acuerdos registrados',
          registradoPor: req.user?.nombre || 'Operador APP-Informes'
        }
      });

      // Si el canal es Correo, incrementamos el contador de insistencias
      if (canal.toLowerCase().includes('correo')) {
        await prisma.aviso.update({
          where: { id: avisoId },
          data: {
            contadorInsistencias: { increment: 1 }
          }
        });
      }

      return res.status(201).json(contacto);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al registrar contacto de triaje', error: error.message });
    }
  }

  /**
   * Genera plantilla de correo estandarizada de respuesta al solicitante
   */
  public static async generarPlantillaRespuesta(req: Request, res: Response) {
    try {
      const { avisoId } = req.params;
      const aviso = await prisma.aviso.findUnique({
        where: { id: avisoId }
      });

      if (!aviso) {
        return res.status(404).json({ message: 'Aviso no encontrado' });
      }

      const prioridadTexto =
        aviso.prioridadRealAcordada === 1
          ? 'EMERGENCIA HSE / PLANTA (Atención inmediata en 24h)'
          : aviso.prioridadRealAcordada === 2
          ? 'URGENTE (Programación prioritaria dentro de 72h)'
          : aviso.prioridadRealAcordada === 3
          ? 'PROGRAMABLE PRÓXIMA SEMANA (Nivelación de carga en curso)'
          : 'RUTINA / BACKLOG (Sujeto a ventana operacional)';

      const plantilla = `Estimado/a ${aviso.autor || 'Solicitante'},

Nos comunicamos desde el equipo de Mantenimiento y Estructuras (Puesto de Trabajo 340CRR) en relación a su requerimiento ingresado en SAP:

• N° Aviso: ${aviso.numeroAviso}
• N° Orden: ${aviso.numeroOrden || 'En proceso de generación'}
• Descripción: ${aviso.descripcion}
• Ubicación Técnica: ${aviso.ubicacionTecnica || 'Por validar'} (${aviso.denominacionUbicacion || ''})

ESTADO DE TRIAJE OPERATIVO:
- Prioridad Real Asignada: ${prioridadTexto}
- Rubro Asignado: ${aviso.rubro || 'Mantenimiento General'}
- Fase Actual: ${aviso.faseAvance || '1. Planificación'}
- Programación Estimada: ${
        aviso.fechaInicioExtrema
          ? new Date(aviso.fechaInicioExtrema).toLocaleDateString('es-CL')
          : 'Ventana de intervención en revisión'
      }

Le informamos que el requerimiento ha sido clasificado y nivelado en nuestro programa semanal de dotación y recursos. Ante cualquier cambio en la condición de seguridad de la planta, favor responder a este correo.

Atentamente,
Equipo de Programación y Triaje Operativo 340CRR
APP-Informes | Arauco Planta`;

      return res.json({ plantilla });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al generar plantilla de correo', error: error.message });
    }
  }
}
