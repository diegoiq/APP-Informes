import { Request, Response } from 'express';
import prisma from '../database/db';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class ObrasController {
  /**
   * Listar obras con avance programado vs real para vista Gantt
   */
  public static async listObras(req: Request, res: Response) {
    try {
      const obras = await prisma.obra.findMany({
        orderBy: { fechaInicio: 'asc' },
        include: {
          librosDiarios: {
            orderBy: { fecha: 'desc' },
            take: 1
          }
        }
      });
      return res.json(obras);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al listar obras', error: error.message });
    }
  }

  /**
   * Crear nueva obra planificada o parada
   */
  public static async createObra(req: Request, res: Response) {
    try {
      const { codigo, nombre, ubicacion, fechaInicio, fechaFin, avanceProgramado, supervisorResponsableId } = req.body;
      const obra = await prisma.obra.create({
        data: {
          codigo: String(codigo).trim(),
          nombre: String(nombre).trim(),
          ubicacion: String(ubicacion).trim(),
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          avanceProgramado: Number(avanceProgramado) || 0,
          avanceReal: 0,
          supervisorResponsableId
        }
      });
      return res.status(201).json(obra);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al crear obra', error: error.message });
    }
  }

  /**
   * Listar entradas del Libro Diario de una obra
   */
  public static async getLibroDiarioEntries(req: Request, res: Response) {
    try {
      const { obraId } = req.params;
      const entries = await prisma.libroDiario.findMany({
        where: { obraId },
        orderBy: { fecha: 'desc' },
        include: {
          supervisor: {
            select: { id: true, nombre: true, email: true }
          },
          fotos: true
        }
      });
      return res.json(entries);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener bitácora de obra', error: error.message });
    }
  }

  /**
   * Crear entrada diaria en el Libro Diario Digital (inmutable)
   */
  public static async createLibroDiarioEntry(req: AuthenticatedRequest, res: Response) {
    try {
      const { obraId } = req.params;
      const {
        fecha,
        condicionClimatica,
        interferencias,
        descripcionJornada,
        observacionesSeguridad,
        firmaSupervisorUrl,
        emailClienteNotificado,
        fotos // Array de { etapa: 'Antes'|'Durante'|'Después', url, diagnosticoPie }
      } = req.body;

      if (!req.user) {
        return res.status(401).json({ message: 'Debe estar autenticado para registrar el libro diario' });
      }

      // Generar token criptográfico único para validación remota del cliente
      const tokenValidacion = crypto.randomBytes(24).toString('hex');

      const entry = await prisma.libroDiario.create({
        data: {
          obraId,
          fecha: new Date(fecha || Date.now()),
          condicionClimatica: condicionClimatica || 'Despejado / Óptimo',
          interferencias: Array.isArray(interferencias) ? JSON.stringify(interferencias) : interferencias,
          descripcionJornada: descripcionJornada || 'Jornada operativa ejecutada según plan.',
          observacionesSeguridad: observacionesSeguridad || 'Sin incidentes HSE reportados en el frente.',
          supervisorId: req.user.id,
          firmaSupervisorUrl,
          tokenValidacion,
          emailClienteNotificado,
          fotos: {
            create: Array.isArray(fotos)
              ? fotos.map((f: any) => ({
                  etapa: f.etapa,
                  url: f.url,
                  diagnosticoPie: f.diagnosticoPie || ''
                }))
              : []
          }
        },
        include: {
          fotos: true,
          supervisor: {
            select: { id: true, nombre: true, email: true }
          }
        }
      });

      return res.status(201).json(entry);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al registrar entrada en libro diario', error: error.message });
    }
  }

  /**
   * Validar y firmar entrada de Libro Diario (Cliente / Inspección Técnica) mediante enlace o token
   */
  public static async validarFirmaCliente(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { firmaClienteUrl } = req.body;

      const entry = await prisma.libroDiario.findUnique({
        where: { tokenValidacion: token }
      });

      if (!entry) {
        return res.status(404).json({ message: 'Enlace de validación inválido o expirado' });
      }

      const updated = await prisma.libroDiario.update({
        where: { id: entry.id },
        data: {
          validadoCliente: true,
          firmaClienteUrl
        }
      });

      return res.json({ message: 'Libro diario validado y firmado exitosamente por el cliente', entry: updated });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al validar firma del cliente', error: error.message });
    }
  }
}
