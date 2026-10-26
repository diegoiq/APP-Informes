import { Request, Response } from 'express';
import prisma from '../database/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import fs from 'fs';
import path from 'path';

export class InformesController {
  /**
   * Listar todos los informes técnicos CRR
   */
  public static async list(req: Request, res: Response) {
    try {
      const informes = await prisma.informeCRR.findMany({
        orderBy: { fechaElaboracion: 'desc' },
        include: {
          responsable: {
            select: { id: true, nombre: true, email: true, rol: true }
          },
          fotos: true
        }
      });
      return res.json(informes);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al listar informes CRR', error: error.message });
    }
  }

  /**
   * Obtener detalle de informe CRR por ID o código
   */
  public static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const informe = await prisma.informeCRR.findFirst({
        where: {
          OR: [{ id }, { codigoInforme: id }]
        },
        include: {
          responsable: {
            select: { id: true, nombre: true, email: true, rol: true }
          },
          fotos: true
        }
      });

      if (!informe) {
        return res.status(404).json({ message: 'Informe CRR no encontrado' });
      }

      return res.json(informe);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener informe', error: error.message });
    }
  }

  /**
   * Crear informe técnico modelo CRR
   */
  public static async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      // Generar consecutivo de código CRR: CRR - 00XXX - 2026
      const count = await prisma.informeCRR.count();
      const correlativo = String(count + 1).padStart(5, '0');
      const anio = new Date().getFullYear();
      const defaultCodigo = `CRR – ${correlativo} – ${anio}`;

      const {
        codigoInforme = defaultCodigo,
        titulo,
        empresaContratista = 'CONTRATISTA INDUSTRIAL CRR',
        distribucion = 'Inspección Técnica Arauco / Operaciones 340CRR',
        avisoNumero,
        ordenNumero,
        ubicacionTecnica,
        objetivo = 'Tratamiento anticorrosivo integral y mitigación de condiciones subestándares en estructuras y soportería.',
        normativaArauco = 'Especificación Técnica Arauco ET-PINT-01 / Criterios HSE Mitigación de Riesgos Físicos.',
        computosMetricos = 'Área estimada de intervención: 48.5 m² en perfiles metálicos y soportes.',
        montajeAndamios = 'Montaje de andamios multidireccionales homologados con tarjeta verde y cálculo estructural.',
        preparacionSuperficie = 'Limpieza con chorro abrasivo Sa 2 / Sa 2½ bajo cerramiento envolvente con contención de polvo.',
        criterioReemplazoPerfiles = 'Pérdida de espesor por corrosión mayor o igual al 40% requiere sustitución estructural.',
        esquemaPintura = 'Capa 1: Imprimación Epoxi rica en Zinc (75µm) + Capa 2: Epoxi MIO alto espesor (150µm) + Capa 3: Esmalte Poliuretano alifático (50µm).',
        ordenAseoDossier = 'Limpieza final del área, retiro de residuos clasificados y entrega de dossier de calidad con medición de espesores.',
        firmaElaboroUrl,
        fotos = [] // Array de { etapa: 'Antes'|'Durante'|'Después', url, diagnosticoTecnico, pieDeFoto }
      } = req.body;

      const nuevoInforme = await prisma.informeCRR.create({
        data: {
          codigoInforme,
          titulo: titulo || `Informe Técnico Estructural ${avisoNumero || '340CRR'}`,
          empresaContratista,
          distribucion,
          responsableId: req.user.id,
          avisoNumero,
          ordenNumero,
          ubicacionTecnica,
          objetivo,
          normativaArauco,
          computosMetricos,
          montajeAndamios,
          preparacionSuperficie,
          criterioReemplazoPerfiles,
          esquemaPintura,
          ordenAseoDossier,
          firmaElaboroUrl,
          fotos: {
            create: Array.isArray(fotos)
              ? fotos.map((f: any) => ({
                  etapa: f.etapa,
                  url: f.url,
                  diagnosticoTecnico: f.diagnosticoTecnico || 'Condición observada',
                  pieDeFoto: f.pieDeFoto || ''
                }))
              : []
          }
        },
        include: {
          fotos: true,
          responsable: {
            select: { id: true, nombre: true, email: true }
          }
        }
      });

      return res.status(201).json(nuevoInforme);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al generar informe CRR', error: error.message });
    }
  }

  /**
   * Exportar vista HTML lista para imprimir / PDF
   */
  public static async exportHTML(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const informe = await prisma.informeCRR.findFirst({
        where: { OR: [{ id }, { codigoInforme: id }] },
        include: {
          responsable: true,
          fotos: true
        }
      });

      if (!informe) {
        return res.status(404).send('Informe no encontrado');
      }

      const templatePath = path.resolve(__dirname, '../../../templates/informe-crr-modelo.html');
      let html = fs.readFileSync(templatePath, 'utf8');

      // Reemplazar variables simples
      html = html
        .replace(/{{codigoInforme}}/g, informe.codigoInforme)
        .replace(/{{fechaElaboracion}}/g, new Date(informe.fechaElaboracion).toLocaleDateString('es-CL'))
        .replace(/{{empresaContratista}}/g, informe.empresaContratista)
        .replace(/{{avisoNumero}}/g, informe.avisoNumero || 'N/A')
        .replace(/{{responsableNombre}}/g, informe.responsable?.nombre || 'Responsable Técnico')
        .replace(/{{ordenNumero}}/g, informe.ordenNumero || 'N/A')
        .replace(/{{distribucion}}/g, informe.distribucion)
        .replace(/{{ubicacionTecnica}}/g, informe.ubicacionTecnica || 'Planta Industrial Arauco')
        .replace(/{{objetivo}}/g, informe.objetivo)
        .replace(/{{normativaArauco}}/g, informe.normativaArauco)
        .replace(/{{tareasEstandar.computosMetricos}}/g, informe.computosMetricos)
        .replace(/{{tareasEstandar.montajeAndamios}}/g, informe.montajeAndamios)
        .replace(/{{tareasEstandar.preparacionSuperficie}}/g, informe.preparacionSuperficie)
        .replace(/{{tareasEstandar.criterioReemplazoPerfiles}}/g, informe.criterioReemplazoPerfiles)
        .replace(/{{tareasEstandar.esquemaPintura}}/g, informe.esquemaPintura)
        .replace(/{{tareasEstandar.ordenAseoDossier}}/g, informe.ordenAseoDossier)
        .replace(/{{aprobadorNombre}}/g, informe.aprobadorNombre || 'Inspección Técnica Arauco');

      // Renderizar fotos en grilla 2 columnas
      let fotosHtml = '';
      for (const foto of informe.fotos) {
        const etapaClass = foto.etapa.toLowerCase().replace(/[^a-z]/g, '');
        fotosHtml += `
          <div class="photo-card">
            <img src="${foto.url}" alt="Evidencia Fotográfica" class="photo-img"/>
            <div class="photo-body">
              <span class="badge-etapa badge-${etapaClass}">${foto.etapa}</span>
              <div style="font-weight: 700; color: #0f172a; margin-bottom: 4px;">${foto.diagnosticoTecnico}</div>
              <div style="color: #64748b; font-size: 8.5pt;">${foto.pieDeFoto}</div>
            </div>
          </div>
        `;
      }
      html = html.replace('{{#galeriaFotos}}', '').replace('{{/galeriaFotos}}', '').replace(/<div class="photo-card">[\s\S]*?<\/div>\s*<\/div>/, fotosHtml);

      // Firmas
      if (informe.firmaElaboroUrl) {
        html = html.replace('{{firmaElaboroUrl}}', informe.firmaElaboroUrl).replace('{{#if firmaElaboroUrl}}', '').replace('{{/if}}', '');
      } else {
        html = html.replace(/{{#if firmaElaboroUrl}}[\s\S]*?{{\/if}}/, '');
      }

      if (informe.firmaAproboUrl) {
        html = html.replace('{{firmaAproboUrl}}', informe.firmaAproboUrl).replace('{{#if firmaAproboUrl}}', '').replace('{{/if}}', '');
      } else {
        html = html.replace(/{{#if firmaAproboUrl}}[\s\S]*?{{\/if}}/, '');
      }

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error: any) {
      return res.status(500).send(`Error al renderizar HTML de informe: ${error.message}`);
    }
  }
}
