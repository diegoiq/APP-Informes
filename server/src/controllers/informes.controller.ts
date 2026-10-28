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

      // Generar consecutivo de código CRR: INF_ CRR – 00XXX - 2026
      const count = await prisma.informeCRR.count();
      const correlativo = String(count + 1).padStart(5, '0');
      const anio = new Date().getFullYear();
      const defaultCodigo = `INF_ CRR – ${correlativo} - ${anio}`;

      const {
        codigoInforme = defaultCodigo,
        tipoInforme = 'INFORME PRELIMINAR',
        titulo,
        empresaContratista = 'A DEFINIR',
        observaciones = '',
        distribucion = 'Inspección Técnica Arauco / Operaciones 340CRR',
        copiaAsignada = 'Inspección Técnica Arauco',
        avisoNumero,
        ordenNumero,
        ubicacionTecnica,
        objetivo = 'Describir el objetivo de la obra o relevamiento.',
        lugarObraTexto = 'Captura de imagen de la zona de la obra o descripción.',
        lugarObraFotoUrl,
        anexosTexto = 'Agregar planos o elementos que complementen al informe.',
        anexosFotos,
        normativaArauco = 'Especificación Técnica Arauco ET-PINT-01 / Criterios HSE Mitigación de Riesgos Físicos.',
        computosMetricos,
        montajeAndamios,
        preparacionSuperficie,
        criterioReemplazoPerfiles,
        esquemaPintura,
        ordenAseoDossier,
        firmaElaboroUrl,
        fotos = [] // Array de { etapa: 'Antes'|'Durante'|'Después', url, diagnosticoTecnico, pieDeFoto }
      } = req.body;

      const nuevoInforme = await prisma.informeCRR.create({
        data: {
          codigoInforme,
          tipoInforme,
          titulo: titulo || `Informe Técnico Estructural ${avisoNumero || '340CRR'}`,
          empresaContratista,
          observaciones,
          distribucion,
          copiaAsignada,
          responsableId: req.user.id,
          avisoNumero,
          ordenNumero,
          ubicacionTecnica,
          objetivo,
          lugarObraTexto,
          lugarObraFotoUrl,
          anexosTexto,
          anexosFotos: typeof anexosFotos === 'object' ? JSON.stringify(anexosFotos) : anexosFotos,
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
                  etapa: f.etapa || 'Antes',
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

      // Cargar logo base64 si existe
      let logoDataUri = '/logo-arauco.png';
      try {
        const logoTxtPath = path.resolve(__dirname, '../../../templates/logo-base64.txt');
        if (fs.existsSync(logoTxtPath)) {
          const b64 = fs.readFileSync(logoTxtPath, 'utf8').trim();
          logoDataUri = `data:image/png;base64,${b64}`;
        }
      } catch (e) {
        // Fallback a ruta estática
      }

      // Reemplazar variables del encabezado y metadatos
      html = html
        .replace(/{{logoBase64}}/g, logoDataUri)
        .replace(/{{tipoInforme}}/g, informe.tipoInforme || 'INFORME PRELIMINAR')
        .replace(/{{codigoInforme}}/g, informe.codigoInforme)
        .replace(/{{titulo}}/g, informe.titulo)
        .replace(/{{empresaContratista}}/g, informe.empresaContratista || 'A DEFINIR')
        .replace(/{{observaciones}}/g, informe.observaciones || 'Sin observaciones registradas.')
        .replace(/{{fechaElaboracion}}/g, new Date(informe.fechaElaboracion).toLocaleDateString('es-CL'))
        .replace(/{{avisoNumero}}/g, informe.avisoNumero || 'N/A')
        .replace(/{{distribucion}}/g, informe.distribucion || 'Inspección Técnica Arauco / Operaciones 340CRR')
        .replace(/{{copiaAsignada}}/g, informe.copiaAsignada || 'Inspección Técnica Arauco')
        .replace(/{{ubicacionTecnica}}/g, informe.ubicacionTecnica || 'Planta Industrial Celulosa Puerto Esperanza')
        .replace(/{{responsableNombre}}/g, informe.responsable?.nombre || 'DAC.')
        .replace(/{{aprobadorNombre}}/g, informe.aprobadorNombre || 'Inspección Técnica Arauco');

      // Sección 1: Objetivo
      html = html.replace(/{{objetivo}}/g, informe.objetivo || 'Describir el objetivo de la obra o relevamiento.');

      // Sección 2: Lugar de la obra
      html = html.replace(/{{lugarObraTexto}}/g, informe.lugarObraTexto || 'Captura de imagen de la zona de la obra o descripción.');
      if (informe.lugarObraFotoUrl) {
        html = html
          .replace('{{#if lugarObraFotoUrl}}', '')
          .replace('{{/if}}', '')
          .replace(/{{lugarObraFotoUrl}}/g, informe.lugarObraFotoUrl);
      } else {
        html = html.replace(/{{#if lugarObraFotoUrl}}[\s\S]*?{{else}}/, '').replace('{{/if}}', '');
      }

      // Sección 3: Registro fotográfico
      let fotosHtml = '';
      if (informe.fotos && informe.fotos.length > 0) {
        for (const foto of informe.fotos) {
          const etapaClass = (foto.etapa || 'general').toLowerCase().replace(/[^a-z]/g, '');
          fotosHtml += `
            <div class="photo-card">
              <img src="${foto.url}" alt="Evidencia Fotográfica" class="photo-card-img" />
              <div class="photo-card-body">
                <span class="badge-etapa badge-${etapaClass}">${foto.etapa || 'Evidencia'}</span>
                <div class="photo-diagnostico">${foto.diagnosticoTecnico || 'Registro de campo'}</div>
                <div class="photo-pie">${foto.pieDeFoto || ''}</div>
              </div>
            </div>
          `;
        }
      } else {
        fotosHtml = `
          <div style="grid-column: 1 / -1; padding: 18px; text-align: center; color: #94a3b8; font-size: 9pt; border: 1px dashed #cbd5e1; border-radius: 6px;">
            No se han registrado evidencias fotográficas en este informe.
          </div>
        `;
      }
      html = html.replace('{{fotosHtml}}', fotosHtml);

      // Sección 4: Anexos
      html = html.replace(/{{anexosTexto}}/g, informe.anexosTexto || 'Agregar planos o elementos que complementen al informe.');
      let anexosFotosHtml = '';
      if (informe.anexosFotos) {
        try {
          const parsed = JSON.parse(informe.anexosFotos);
          if (Array.isArray(parsed) && parsed.length > 0) {
            anexosFotosHtml = '<div class="anexos-grid">';
            for (const item of parsed) {
              const url = typeof item === 'string' ? item : item.url;
              anexosFotosHtml += `<img src="${url}" alt="Anexo Plano o Elemento" class="anexo-item-img" />`;
            }
            anexosFotosHtml += '</div>';
          }
        } catch (e) {
          // Si es una sola URL directa
          if (informe.anexosFotos.startsWith('data:') || informe.anexosFotos.startsWith('http')) {
            anexosFotosHtml = `<div class="anexos-grid"><img src="${informe.anexosFotos}" alt="Anexo Plano" class="anexo-item-img" /></div>`;
          }
        }
      }
      html = html.replace('{{anexosFotosHtml}}', anexosFotosHtml);

      // Firmas
      if (informe.firmaElaboroUrl) {
        html = html
          .replace('{{#if firmaElaboroUrl}}', '')
          .replace('{{/if}}', '')
          .replace('{{firmaElaboroUrl}}', informe.firmaElaboroUrl);
      } else {
        html = html.replace(/{{#if firmaElaboroUrl}}[\s\S]*?{{\/if}}/, '');
      }

      if (informe.firmaAproboUrl) {
        html = html
          .replace('{{#if firmaAproboUrl}}', '')
          .replace('{{/if}}', '')
          .replace('{{firmaAproboUrl}}', informe.firmaAproboUrl);
      } else {
        html = html.replace(/{{#if firmaAproboUrl}}[\s\S]*?{{\/if}}/, '');
      }

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch (error: any) {
      return res.status(500).send(`Error al renderizar HTML de informe: ${error.message}`);
    }
  }

  /**
   * Eliminar un informe técnico individual por ID (y sus fotos asociadas)
   */
  public static async deleteById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await prisma.fotoInformeCRR.deleteMany({ where: { informeId: id } });
      await prisma.informeCRR.delete({ where: { id } });
      return res.json({ message: 'Informe eliminado exitosamente' });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al eliminar el informe', error: error.message });
    }
  }

  /**
   * Eliminar múltiples informes seleccionados (borrado selectivo por lote)
   */
  public static async deleteBatch(req: AuthenticatedRequest, res: Response) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Seleccione al menos un informe para eliminar.' });
      }

      await prisma.fotoInformeCRR.deleteMany({
        where: { informeId: { in: ids } }
      });

      const deleted = await prisma.informeCRR.deleteMany({
        where: { id: { in: ids } }
      });

      return res.json({
        message: `${deleted.count} informe(s) eliminado(s) correctamente.`,
        deletedCount: deleted.count
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al eliminar informes seleccionados', error: error.message });
    }
  }
}
