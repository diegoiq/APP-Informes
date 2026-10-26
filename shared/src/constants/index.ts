// Constantes operativas del sistema APP-Informes

export const MAX_ALLOWED_USERS = 5;

export const MAIN_WORK_CENTER_FILTER = '340CRR';

export const USER_ROLES = ['admin', 'supervisor', 'programador'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RUBROS = [
  'Mantenimiento General',
  'Pintura/Aislación',
  'Civil',
  'Soldador',
  'Cañerías/Mecánica',
  'Eléctrico'
] as const;
export type RubroType = (typeof RUBROS)[number];

export const TIPOS_RIESGO_CIVIL_FISICO = [
  'Interacción vial / Guardas / Cerramientos',
  'Daño estructural civil / Edilicio',
  'Caída de escombro',
  'Caída en altura / Accesos',
  'Caída al mismo nivel',
  'Integridad de Proceso / Fuga / Piping',
  'Riesgo Eléctrico / Bloqueo',
  'Condición Subestándar General'
] as const;
export type TipoRiesgoCivilFisico = (typeof TIPOS_RIESGO_CIVIL_FISICO)[number];

export const TIPOS_CONDICION_FINAL = [
  'CS-Protecciones',
  'CS-Pintura/Tratamiento Anticorrosivo',
  'CS-Loseta',
  'CS-Soportería/Fijación',
  'CS-Hormigon',
  'CS-Rejilla',
  'CS-Acceso/Portones',
  'CS-Estructura Metálica',
  'CS-Escalera/Plataforma',
  'CS-Sellado/Canaleta'
] as const;
export type TipoCondicionFinal = (typeof TIPOS_CONDICION_FINAL)[number];

export const EFECTOS = [
  'Seguridad',
  'Inter. Hombre Máquina',
  'Limitación de producción',
  'Parada de la producción',
  'Medio Ambiente',
  'Calidad / Integridad'
] as const;
export type EfectoType = (typeof EFECTOS)[number];

export const FASES_AVANCE = [
  '1. Planificación',
  '2. En Ejecución',
  '3. Finalizada'
] as const;
export type FaseAvanceType = (typeof FASES_AVANCE)[number];

export const PRIORIDADES_REALES = [
  { id: 1, label: '1 - Emergencia HSE/Planta', color: 'red', maxDiasRespuesta: 1 },
  { id: 2, label: '2 - Urgente', color: 'orange', maxDiasRespuesta: 3 },
  { id: 3, label: '3 - Programable Próx. Semana', color: 'blue', maxDiasRespuesta: 7 },
  { id: 4, label: '4 - Rutina/Backlog', color: 'slate', maxDiasRespuesta: 30 }
] as const;

export const INTERFERENCIAS_TIPOS = [
  'Climática (Lluvia/Viento > 35km/h)',
  'Falta de Frente / Área no liberada por Producción',
  'Interferencia de Seguridad / Permiso Bloqueo demorado',
  'Falta de Andamio / Certificación pendiente',
  'Falta de Materiales / Repuestos',
  'Parada no programada'
] as const;

export const CLIMA_CONDICIONES = [
  'Despejado / Óptimo',
  'Nublado',
  'Lluvia Ligera',
  'Lluvia Torrencial / Inclemencia',
  'Viento Severo (>35 km/h)',
  'Humedad Relativa > 85%'
] as const;
