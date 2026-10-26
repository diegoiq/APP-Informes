import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function generateSampleExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APP-Informes';
  workbook.created = new Date();

  // 1. Hoja 'Avisos'
  const sheetAvisos = workbook.addWorksheet('Avisos');
  sheetAvisos.columns = [
    { header: 'Aviso', key: 'aviso', width: 14 },
    { header: 'Fecha notificación', key: 'fechaNotificacion', width: 18 },
    { header: 'Descripción', key: 'descripcion', width: 45 },
    { header: 'Orden', key: 'orden', width: 14 },
    { header: 'Estado del sistema', key: 'estadoSistema', width: 18 },
    { header: 'Autor', key: 'autor', width: 20 },
    { header: 'Efecto', key: 'efecto', width: 22 },
    { header: 'Prioridad', key: 'prioridad', width: 14 }
  ];

  sheetAvisos.addRows([
    {
      aviso: '10045281',
      fechaNotificacion: new Date('2026-10-10'),
      descripcion: 'Corrosión severa en soporte cañería licor negro',
      orden: '40081290',
      estadoSistema: 'MEAB',
      autor: 'jgonzalez_ara',
      efecto: 'Seguridad',
      prioridad: 'Muy Alta'
    },
    {
      aviso: '10045282',
      fechaNotificacion: new Date('2026-10-12'),
      descripcion: 'Rejilla Tramex suelta en plataforma caldera biomasa',
      orden: '40081291',
      estadoSistema: 'MEAB',
      autor: 'mramirez_op',
      efecto: 'Seguridad',
      prioridad: 'Alta'
    },
    {
      aviso: '10045283',
      fechaNotificacion: new Date('2026-10-15'),
      descripcion: 'Desprendimiento loseta hormigón en canaleta efluentes',
      orden: '40081292',
      estadoSistema: 'MEAB',
      autor: 'cfernandez_hse',
      efecto: 'Medio Ambiente',
      prioridad: 'Media'
    },
    {
      aviso: '10045284',
      fechaNotificacion: new Date('2026-10-18'),
      descripcion: 'Falla fijación portón acceso nave celulosa',
      orden: '40081293',
      estadoSistema: 'MEAB',
      autor: 'lmorales_mtto',
      efecto: 'Inter. Hombre Máquina',
      prioridad: 'Baja'
    },
    {
      aviso: '10045285',
      fechaNotificacion: new Date('2026-10-20'),
      descripcion: 'Pérdida de espesor viga estructural torre enfriamiento',
      orden: '40081294',
      estadoSistema: 'MEAB',
      autor: 'atorres_insp',
      efecto: 'Seguridad',
      prioridad: 'Muy Alta'
    }
  ]);

  // 2. Hoja 'OM'
  const sheetOM = workbook.addWorksheet('OM');
  sheetOM.columns = [
    { header: 'Orden', key: 'orden', width: 14 },
    { header: 'Aviso', key: 'aviso', width: 14 },
    { header: 'Pto.tbjo.responsable', key: 'ptoTbjoResponsable', width: 22 },
    { header: 'Revisión', key: 'revision', width: 14 },
    { header: 'Ubicación técnica', key: 'ubicacionTecnica', width: 25 },
    { header: 'Denominación de la ubicación técnica', key: 'denominacionUbicacion', width: 38 },
    { header: 'Clase de orden', key: 'claseOrden', width: 16 },
    { header: 'Costes tot.reales', key: 'costesReales', width: 18 },
    { header: 'Área de empresa', key: 'areaEmpresa', width: 20 },
    { header: 'Fecha de inicio extrema', key: 'fechaInicioExtrema', width: 22 },
    { header: 'Fecha fin extrema', key: 'fechaFinExtrema', width: 22 },
    { header: 'Fecha inicio real', key: 'fechaInicioReal', width: 20 },
    { header: 'Fecha real de fin', key: 'fechaRealFin', width: 20 }
  ];

  sheetOM.addRows([
    {
      orden: '40081290',
      aviso: '10045281',
      ptoTbjoResponsable: '340CRR',
      revision: 'PS502026',
      ubicacionTecnica: 'AR-CEL-DIG-01-V01',
      denominacionUbicacion: 'Digestores y Recuperación Química',
      claseOrden: 'ZAM',
      costesReales: 4500000,
      areaEmpresa: 'Celulosa',
      fechaInicioExtrema: new Date('2026-10-28'),
      fechaFinExtrema: new Date('2026-11-04'),
      fechaInicioReal: null,
      fechaRealFin: null
    },
    {
      orden: '40081291',
      aviso: '10045282',
      ptoTbjoResponsable: '340CRR',
      revision: 'PS502026',
      ubicacionTecnica: 'AR-CAL-BIO-02-P03',
      denominacionUbicacion: 'Caldera de Biomasa Nivel +12m',
      claseOrden: 'ZAM',
      costesReales: 1200000,
      areaEmpresa: 'Energía',
      fechaInicioExtrema: new Date('2026-10-27'),
      fechaFinExtrema: new Date('2026-10-30'),
      fechaInicioReal: null,
      fechaRealFin: null
    },
    {
      orden: '40081292',
      aviso: '10045283',
      ptoTbjoResponsable: '340CRR',
      revision: 'PS502026',
      ubicacionTecnica: 'AR-EFL-TRT-01-C02',
      denominacionUbicacion: 'Tratamiento Primario Efluentes',
      claseOrden: 'ZME',
      costesReales: 2800000,
      areaEmpresa: 'Medio Ambiente',
      fechaInicioExtrema: new Date('2026-11-02'),
      fechaFinExtrema: new Date('2026-11-10'),
      fechaInicioReal: null,
      fechaRealFin: null
    },
    {
      orden: '40081293',
      aviso: '10045284',
      ptoTbjoResponsable: '340CRR',
      revision: 'PS502026',
      ubicacionTecnica: 'AR-CEL-NAV-03-A01',
      denominacionUbicacion: 'Nave de Empaque y Despacho',
      claseOrden: 'ZME',
      costesReales: 850000,
      areaEmpresa: 'Logística',
      fechaInicioExtrema: new Date('2026-11-05'),
      fechaFinExtrema: new Date('2026-11-12'),
      fechaInicioReal: null,
      fechaRealFin: null
    },
    {
      orden: '40081294',
      aviso: '10045285',
      ptoTbjoResponsable: '340CRR',
      revision: 'PS502026',
      ubicacionTecnica: 'AR-TOR-ENF-01-E04',
      denominacionUbicacion: 'Torres de Enfriamiento Circuito 1',
      claseOrden: 'ZAM',
      costesReales: 9200000,
      areaEmpresa: 'Servicios',
      fechaInicioExtrema: new Date('2026-10-26'),
      fechaFinExtrema: new Date('2026-11-08'),
      fechaInicioReal: null,
      fechaRealFin: null
    }
  ]);

  // 3. Hoja 'Analisis'
  const sheetAnalisis = workbook.addWorksheet('Analisis');
  sheetAnalisis.columns = [
    { header: 'Aviso', key: 'aviso', width: 14 },
    { header: 'Orden', key: 'orden', width: 14 },
    { header: 'Rubro', key: 'rubro', width: 24 },
    { header: 'Tipo de Riesgo Civil / Físico', key: 'tipoRiesgo', width: 35 },
    { header: 'Tipo Condición Final', key: 'tipoCondicionFinal', width: 35 },
    { header: 'Efecto', key: 'efecto', width: 24 },
    { header: 'Fase de Avance', key: 'faseAvance', width: 20 }
  ];

  sheetAnalisis.addRows([
    {
      aviso: '10045281',
      orden: '40081290',
      rubro: 'Pintura/Aislación',
      tipoRiesgo: 'Integridad de Proceso / Fuga / Piping',
      tipoCondicionFinal: 'CS-Pintura/Tratamiento Anticorrosivo',
      efecto: 'Seguridad',
      faseAvance: '1. Planificación'
    },
    {
      aviso: '10045282',
      orden: '40081291',
      rubro: 'Civil',
      tipoRiesgo: 'Caída en altura / Accesos',
      tipoCondicionFinal: 'CS-Rejilla',
      efecto: 'Seguridad',
      faseAvance: '1. Planificación'
    },
    {
      aviso: '10045283',
      orden: '40081292',
      rubro: 'Civil',
      tipoRiesgo: 'Caída al mismo nivel',
      tipoCondicionFinal: 'CS-Loseta',
      efecto: 'Medio Ambiente',
      faseAvance: '1. Planificación'
    },
    {
      aviso: '10045284',
      orden: '40081293',
      rubro: 'Soldador',
      tipoRiesgo: 'Interacción vial / Guardas / Cerramientos',
      tipoCondicionFinal: 'CS-Acceso/Portones',
      efecto: 'Inter. Hombre Máquina',
      faseAvance: '2. En Ejecución'
    },
    {
      aviso: '10045285',
      orden: '40081294',
      rubro: 'Cañerías/Mecánica',
      tipoRiesgo: 'Daño estructural civil / Edilicio',
      tipoCondicionFinal: 'CS-Estructura Metálica',
      efecto: 'Seguridad',
      faseAvance: '1. Planificación'
    }
  ]);

  const outputDir = path.resolve(__dirname, '../../uploads');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, 'Panel-Avisos-OM.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`[SUCCESS] Archivo de prueba estándar generado en: ${filePath}`);
}

generateSampleExcel().catch(console.error);
