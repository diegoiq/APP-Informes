import {
  UserRole,
  RubroType,
  TipoRiesgoCivilFisico,
  TipoCondicionFinal,
  EfectoType,
  FaseAvanceType
} from '../constants';

// =====================================================================
// AUTENTICACIÓN Y USUARIOS
// =====================================================================
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  activo: boolean;
  creadoEn: string | Date;
}

export interface AuthUserSummary {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface LoginResponse {
  token: string;
  usuario: AuthUserSummary;
}

export interface RegisterDTO {
  nombre: string;
  email: string;
  password: string;
  rol?: UserRole;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UserQuotaStats {
  registrados: number;
  maximo: number;
  cuposDisponibles: number;
  limiteAlcanzado: boolean;
}

// =====================================================================
// MÓDULO SAP (AVISOS, ÓRDENES Y ANÁLISIS)
// =====================================================================
export interface AvisoRawSAP {
  aviso: string;
  fechaNotificacion?: string | Date;
  descripcion: string;
  orden?: string;
  estadoSistema: string;
  autor?: string;
  efecto?: string;
  prioridad?: string;
}

export interface OrdenRawSAP {
  orden: string;
  aviso?: string;
  ptoTbjoResponsable: string;
  revision?: string;
  ubicacionTecnica?: string;
  denominacionUbicacion?: string;
  claseOrden?: string;
  costesReales?: number;
  areaEmpresa?: string;
  fechaInicioExtrema?: string | Date;
  fechaFinExtrema?: string | Date;
  fechaInicioReal?: string | Date;
  fechaFinReal?: string | Date;
}

export interface AnalisisRawSAP {
  aviso?: string;
  orden?: string;
  rubro?: RubroType;
  tipoRiesgo?: TipoRiesgoCivilFisico;
  tipoCondicionFinal?: TipoCondicionFinal;
  efecto?: EfectoType;
  faseAvance?: FaseAvanceType;
}

export interface AvisoConsolidado {
  id: string;
  numeroAviso: string;
  fechaNotificacion?: string;
  descripcion: string;
  numeroOrden?: string;
  estadoSistema: string;
  autor?: string;
  efecto?: string;
  prioridadSap?: string;

  // Cruce OM
  ptoTbjoResponsable?: string;
  revision?: string;
  ubicacionTecnica?: string;
  denominacionUbicacion?: string;
  claseOrden?: string;
  costesReales?: number;
  areaEmpresa?: string;
  fechaInicioExtrema?: string;
  fechaFinExtrema?: string;
  fechaInicioReal?: string;
  fechaFinReal?: string;

  // Taxonomía Operativa
  rubro?: RubroType;
  tipoRiesgo?: TipoRiesgoCivilFisico;
  tipoCondicionFinal?: TipoCondicionFinal;
  faseAvance?: FaseAvanceType;

  // Triaje y Datos de Campo (Protegidos de sobreescritura SAP)
  prioridadRealAcordada?: number; // 1 a 4
  contadorInsistencias: number;
  notasCampo?: string;
  horasRealesIncurridas?: number;
  asignadoAId?: string;

  // Relevamiento y Enriquecimiento de Terreno
  comentariosTerreno?: string;
  fotosInspeccion?: string;
  revisionPs?: string;
  hhEstimadasTerreno?: number;
  personasEstimadas?: number;
  hhRealesAcumuladas?: number;

  // Control SAP y Estado
  estadoSapOm?: string;
  fechaModificacionSap?: string;
  activo?: boolean;

  creadoEn: string;
  actualizadoEn: string;
}

export interface RelevamientoDTO {
  comentariosTerreno?: string;
  fotosInspeccion?: string[];
  horasEstimadas?: number;
  personasEstimadas?: number;
  revisionPs?: string; // ej: PS43, PS44, PS50
  diaSemana?: 'mi' | 'ju' | 'vi' | 'sa' | 'dom' | 'lu' | 'ma';
}

export interface ExcelIngestionSummary {
  nombreArchivo: string;
  totalAvisosProcesados: number;
  totalOMProcesadas: number;
  totalAnalisisProcesados: number;
  avisosAbiertos: number;
  avisosCerrados: number;
  avisosConOM: number;
  totalOperacionesIW37N?: number;
  insertados: number;
  actualizados: number;
  filtrados340CRR: number;
  otrosPuestos: number;
  errores: string[];
  fechaIngesta: string;
}

// =====================================================================
// TRIAJE OPERATIVO
// =====================================================================
export interface TriajeAviso {
  id: string;
  avisoId: string;
  prioridadSap: string;
  prioridadRealAcordada: number;
  historialContactos: HistorialContacto[];
  contadorInsistencias: number;
  ultimoContacto?: string;
  plantillaRespuesta?: string;
  actualizadoPorId?: string;
  actualizadoEn: string;
}

export interface HistorialContacto {
  id: string;
  fecha: string;
  canal: 'Correo' | 'Llamada' | 'Presencial' | 'SAP';
  solicitante: string;
  resumen: string;
  acuerdosTomados: string;
  registradoPor: string;
}

// =====================================================================
// PERSONAL Y PROGRAMACIÓN SEMANAL DE HH
// =====================================================================
export interface Personal {
  id: string;
  legajo: string;
  nombre: string;
  especialidad: RubroType;
  regimenHorario: number; // 8 o 9 horas
  activo: boolean;
  creadoEn: string;
}

export interface AusenciaPersonal {
  id: string;
  personalId: string;
  tipo: 'Vacaciones' | 'Licencia Médica' | 'Curso/Capacitación' | 'Permiso Particular' | 'Otra';
  fechaInicio: string;
  fechaFin: string;
  observaciones?: string;
}

export interface AsignacionDia {
  id: string;
  personalId: string;
  diaSemana: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
  fecha: string;
  avisoId?: string;
  ordenId?: string;
  horasAsignadas: number;
  descripcionTarea?: string;
  cumplida: boolean;
}

export interface BalanceCapacidadOperario {
  personal: Personal;
  capacidadDisponibleHoras: number;
  horasAsignadasTotales: number;
  porcentajeOcupacion: number;
  estadoSemaforo: 'verde' | 'amarillo' | 'rojo'; // verde 75-100%, amarillo <75%, rojo >100%
  asignaciones: AsignacionDia[];
}

// =====================================================================
// OBRAS Y LIBRO DIARIO DE OBRA
// =====================================================================
export interface Obra {
  id: string;
  codigo: string;
  nombre: string;
  ubicacion: string;
  fechaInicio: string;
  fechaFin: string;
  avanceProgramado: number; // 0-100%
  avanceReal: number; // 0-100%
  estado: 'Planificación' | 'En Ejecución' | 'Suspendida' | 'Finalizada';
  supervisorResponsableId?: string;
}

export interface LibroDiarioEntry {
  id: string;
  obraId: string;
  fecha: string;
  condicionClimatica: string;
  interferencias: string[];
  descripcionJornada: string;
  observacionesSeguridad: string;
  supervisorId: string;
  firmaSupervisorUrl?: string;
  validadoCliente: boolean;
  firmaClienteUrl?: string;
  tokenValidacion?: string;
  emailClienteNotificado?: string;
  fotos: FotoBitacora[];
  creadoEn: string;
}

export interface FotoBitacora {
  id: string;
  libroDiarioId: string;
  etapa: 'Antes' | 'Durante' | 'Después';
  url: string;
  diagnosticoPie: string;
  creadoEn: string;
}

// =====================================================================
// INFORME TÉCNICO CRR (MODELO ARAUCO)
// =====================================================================
export interface TareasCRR {
  computosMetricos: string; // m2 / m lineales
  montajeAndamios: string; // Homologados
  preparacionSuperficie: string; // Sa 2 / Sa 2 1/2 con cerramiento envolvente
  criterioReemplazoPerfiles: string; // Pérdida >= 40%
  esquemaPintura: string; // Epoxi imprimación + Epoxi intermedio + Poliuretano
  ordenAseoDossier: string;
}

export interface FotoInformeCRR {
  id: string;
  url: string;
  etapa: 'Antes' | 'Durante' | 'Después';
  diagnosticoTecnico: string;
  pieDeFoto: string;
}

export interface InformeCRR {
  id: string;
  codigoInforme: string; // Ej: CRR – 00124 – 2026
  titulo: string;
  empresaContratista: string;
  distribucion: string;
  responsableId: string;
  responsableNombre: string;
  avisoNumero?: string;
  ordenNumero?: string;
  ubicacionTecnica?: string;
  objetivo: string;
  normativaArauco: string;
  tareasEstandar: TareasCRR;
  galeriaFotos: FotoInformeCRR[];
  firmaElaboroUrl?: string;
  firmaAproboUrl?: string;
  aprobadorNombre?: string;
  fechaElaboracion: string;
  estado: 'Borrador' | 'Preliminar' | 'Aprobado';
}
