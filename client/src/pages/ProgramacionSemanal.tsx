import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  CalendarDays,
  UploadCloud,
  RefreshCw,
  Plus,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Search,
  Building,
  Wrench,
  Save,
  Camera,
  MessageSquarePlus,
  FileText,
  ExternalLink,
  X,
  Upload,
  Sparkles,
  Database,
  Server
} from 'lucide-react';

const DIAS = [
  { key: 'mi', label: 'Miércoles', short: 'Mi', dayIndex: 0 },
  { key: 'ju', label: 'Jueves', short: 'Ju', dayIndex: 1 },
  { key: 'vi', label: 'Viernes', short: 'Vi', dayIndex: 2 },
  { key: 'sa', label: 'Sábado', short: 'Sa', dayIndex: 3 },
  { key: 'dom', label: 'Domingo', short: 'Do', dayIndex: 4 },
  { key: 'lu', label: 'Lunes', short: 'Lu', dayIndex: 5 },
  { key: 'ma', label: 'Martes', short: 'Ma', dayIndex: 6 }
];

interface FotoEvidenciaItem {
  url: string;
  etapa: 'Antes' | 'Durante' | 'Después';
  comentario: string;
  fecha?: string;
}

export const ProgramacionSemanal: React.FC = () => {
  const navigate = useNavigate();
  const [semana, setSemana] = useState<number>(() => {
    const saved = localStorage.getItem('ps_semana_activa');
    return saved ? parseInt(saved, 10) || 44 : 44;
  });
  const [anio, setAnio] = useState<number>(() => {
    const saved = localStorage.getItem('ps_anio_activo');
    return saved ? parseInt(saved, 10) || 2026 : 2026;
  });
  const [ptoTbjo] = useState('340CRR');
  const [data, setData] = useState<any | null>(null);
  const [sysStatus, setSysStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [syncingInforme, setSyncingInforme] = useState(false);

  // Modal para agregar operación desde Backlog IW37N
  const [showAddModal, setShowAddModal] = useState(false);
  const [backlogOps, setBacklogOps] = useState<any[]>([]);
  const [searchBacklog, setSearchBacklog] = useState('');
  const [loadingBacklog, setLoadingBacklog] = useState(false);

  // Modal por línea del PS para subir fotos y comentarios hacia el Informe de la Semana
  const [selectedOpEvidencia, setSelectedOpEvidencia] = useState<any | null>(null);
  const [estadoEjecucion, setEstadoEjecucion] = useState('En Ejecución');
  const [comentariosEjecucion, setComentariosEjecucion] = useState('');
  const [fotosEjecucion, setFotosEjecucion] = useState<FotoEvidenciaItem[]>([]);
  const [etapaNuevaFoto, setEtapaNuevaFoto] = useState<'Antes' | 'Durante' | 'Después'>('Durante');
  const [savingEvidencia, setSavingEvidencia] = useState(false);

  // Edición rápida de dotación
  const [editDotacion, setEditDotacion] = useState(false);
  const [dotacionForm, setDotacionForm] = useState({
    opMiercoles: 4,
    opJueves: 6,
    opViernes: 8,
    opSabado: 0,
    opDomingo: 0,
    opLunes: 9,
    opMartes: 9,
    horasJornada: 7
  });

  const loadProgramacion = async () => {
    setLoading(true);
    try {
      const [res, statusRes] = await Promise.all([
        api.getProgramacionArauco(semana, anio, ptoTbjo),
        api.getSystemStatus().catch(() => null)
      ]);
      setData(res);
      if (statusRes) setSysStatus(statusRes);
      if (res.dotacion) {
        setDotacionForm({
          opMiercoles: res.dotacion.opMiercoles,
          opJueves: res.dotacion.opJueves,
          opViernes: res.dotacion.opViernes,
          opSabado: res.dotacion.opSabado,
          opDomingo: res.dotacion.opDomingo,
          opLunes: res.dotacion.opLunes,
          opMartes: res.dotacion.opMartes,
          horasJornada: res.dotacion.horasJornada || 7
        });
      }
    } catch (err: any) {
      console.error('Error al cargar programación Arauco:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('ps_semana_activa', String(semana));
    localStorage.setItem('ps_anio_activo', String(anio));
    loadProgramacion();
  }, [semana, anio, ptoTbjo]);

  // Subida de archivo PS...xlsm
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadSuccess(null);
    try {
      const res = await api.uploadPSFile(file);
      setUploadSuccess(
        `Archivo ${file.name} importado (${res.summary.totalOperaciones} operaciones | ${res.summary.hhDisponibles} HH disp. | ${res.summary.hhProgramadas} HH prog. | Densidad ${res.summary.densidad}%). Informe semanal PS${res.summary.semana}${res.summary.anio} ${res.summary.ptoTbjo} activo.`
      );
      if (res.summary.semana !== semana || res.summary.anio !== anio) {
        setSemana(res.summary.semana);
        setAnio(res.summary.anio);
      } else {
        await loadProgramacion();
      }
      setTimeout(() => setUploadSuccess(null), 7000);
    } catch (err: any) {
      alert(err.message || 'Error al importar archivo de programación');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Guardar cambio de dotación
  const handleSaveDotacion = async () => {
    try {
      await api.updateDotacionArauco({
        semana,
        anio,
        ptoTbjo,
        ...dotacionForm
      });
      setEditDotacion(false);
      await loadProgramacion();
    } catch (err: any) {
      alert(err.message || 'Error al guardar dotación');
    }
  };

  // Guardar horas diarias de una operación
  const handleSaveOperacionHours = async (op: any, diaKey: string, horas: number) => {
    try {
      const payload = {
        id: op.id,
        semanaProg: semana,
        anioProg: anio,
        hhMiercoles: diaKey === 'mi' ? horas : op.hhMiercoles,
        hhJueves: diaKey === 'ju' ? horas : op.hhJueves,
        hhViernes: diaKey === 'vi' ? horas : op.hhViernes,
        hhSabado: diaKey === 'sa' ? horas : op.hhSabado,
        hhDomingo: diaKey === 'dom' ? horas : op.hhDomingo,
        hhLunes: diaKey === 'lu' ? horas : op.hhLunes,
        hhMartes: diaKey === 'ma' ? horas : op.hhMartes
      };

      await api.saveOperacionArauco(payload);
      await loadProgramacion();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Quitar operación de la semana
  const handleRemoveOp = async (opId: string) => {
    if (!confirm('¿Quitar esta operación del programa semanal y devolver al backlog?')) return;
    try {
      await api.removeOperacionArauco(opId);
      await loadProgramacion();
    } catch (err: any) {
      alert(err.message || 'Error al remover operación');
    }
  };

  // Parsear fotos de una operación
  const parseOpFotos = (op: any): FotoEvidenciaItem[] => {
    if (!op?.fotosEjecucion) return [];
    try {
      const parsed = JSON.parse(op.fotosEjecucion);
      if (Array.isArray(parsed)) {
        return parsed.map((item) =>
          typeof item === 'string'
            ? { url: item, etapa: 'Durante', comentario: '' }
            : {
                url: item.url,
                etapa: item.etapa || 'Durante',
                comentario: item.comentario || '',
                fecha: item.fecha
              }
        );
      }
    } catch {
      // ignore
    }
    return [];
  };

  // Abrir modal de fotos y comentarios para una línea del PS
  const openEvidenciaModal = (op: any) => {
    setSelectedOpEvidencia(op);
    setEstadoEjecucion(op.estadoEjecucion || 'En Ejecución');
    setComentariosEjecucion(op.comentariosEjecucion || '');
    setFotosEjecucion(parseOpFotos(op));
    setEtapaNuevaFoto('Durante');
  };

  // Subir fotos a Base64 dentro del modal de la línea del PS
  const handleLinePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setFotosEjecucion((prev) => [
            ...prev,
            {
              url: base64,
              etapa: etapaNuevaFoto,
              comentario: '',
              fecha: new Date().toISOString()
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSaveEvidencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpEvidencia) return;
    setSavingEvidencia(true);
    try {
      const res = await api.guardarEvidenciaOperacionArauco(selectedOpEvidencia.id, {
        estadoEjecucion,
        comentariosEjecucion,
        fotosEjecucion
      });
      setUploadSuccess(res.message);
      setSelectedOpEvidencia(null);
      await loadProgramacion();
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Error al guardar fotos y comentarios de la línea');
    } finally {
      setSavingEvidencia(false);
    }
  };

  // Sincronizar manualmente el Informe Semanal del PS en curso
  const handleSyncInformeSemanal = async () => {
    setSyncingInforme(true);
    try {
      const res = await api.syncInformeSemanalArauco(semana, anio, ptoTbjo);
      setUploadSuccess(res.message);
      await loadProgramacion();
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Error al sincronizar el informe semanal');
    } finally {
      setSyncingInforme(false);
    }
  };

  // Buscar backlog para modal
  const openBacklogModal = async () => {
    setShowAddModal(true);
    setLoadingBacklog(true);
    try {
      const ops = await api.getBacklogOperaciones({
        sinSemana: 'true',
        ptoTbjo,
        search: searchBacklog
      });
      setBacklogOps(ops);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBacklog(false);
    }
  };

  const handleSearchBacklog = async (q: string) => {
    setSearchBacklog(q);
    setLoadingBacklog(true);
    try {
      const ops = await api.getBacklogOperaciones({
        sinSemana: 'true',
        ptoTbjo,
        search: q
      });
      setBacklogOps(ops);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBacklog(false);
    }
  };

  const handleAddOpFromBacklog = async (op: any) => {
    try {
      await api.saveOperacionArauco({
        id: op.id,
        semanaProg: semana,
        anioProg: anio,
        hhMiercoles: op.horasEstimadas || 7
      });
      setShowAddModal(false);
      await loadProgramacion();
    } catch (err: any) {
      alert(err.message || 'Error al agregar operación');
    }
  };

  // Fechas del período (calculadas para el Miércoles a Martes)
  const getPeriodoFechas = () => {
    if (!data?.dotacion?.fechaInicio) return '';
    const fIni = new Date(data.dotacion.fechaInicio);
    const fFin = new Date(data.dotacion.fechaFin);
    return `${fIni.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })} al ${fFin.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  };

  const codigoPSActual = `PS${semana}${anio} ${ptoTbjo}`;
  const opsConEvidenciaCount = (data?.operaciones || []).filter(
    (op: any) =>
      (op.comentariosEjecucion && op.comentariosEjecucion.trim() !== '') ||
      parseOpFotos(op).length > 0 ||
      (op.estadoEjecucion && op.estadoEjecucion !== 'Pendiente')
  ).length;
  const totalFotosSemana = (data?.operaciones || []).reduce(
    (acc: number, op: any) => acc + parseOpFotos(op).length,
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Encabezado Oficial Arauco Responsivo */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sky-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider flex-wrap">
              <Building className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="break-words">PC01 Planta Celulosa Puerto Esperanza | Mantenimiento Industrial</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight mt-1.5 break-words">
              Programa Diario Semanal — <span className="text-sky-400">{codigoPSActual}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-300 mt-2">
              <span>Puesto Ejecutor: <strong className="text-sky-300">{ptoTbjo}</strong></span>
              <span>•</span>
              <span>Grupo Planificación: <strong className="text-sky-300">{data?.dotacion?.grupoPlanif || 'TA1'}</strong></span>
              <span>•</span>
              <span>Período Oficial: <strong className="text-emerald-300">{getPeriodoFechas() || 'Ciclo Miércoles a Martes'}</strong></span>
            </div>
          </div>

          {/* Selectores de Semana y Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs font-bold">
              <button
                onClick={() => setSemana((s) => Math.max(1, s - 1))}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sky-300">
                PS{semana}{anio} (Sem. {semana})
              </span>
              <button
                onClick={() => setSemana((s) => Math.min(52, s + 1))}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Imprimir Planilla</span>
            </button>

            <button
              onClick={loadProgramacion}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Notificación de carga o guardado exitoso */}
        {uploadSuccess && (
          <div className="mt-4 p-3 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}
      </div>

      {/* BARRA DE INFORME SEMANAL EN CURSO (AUTO-ARMADO) + ESTADO DE RENDER Y ESPACIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tarjeta Informe Semanal en Curso */}
        <div className="lg:col-span-2 bg-gradient-to-r from-sky-950 via-slate-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-sky-800/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase">
                Informe Semanal Auto-Almacenado
              </span>
              <span className="font-mono text-xs font-extrabold text-sky-300">
                {codigoPSActual}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              Informe de Trabajos de la Semana: {codigoPSActual}
            </h3>
            <p className="text-xs text-slate-300">
              Las fotos y comentarios cargados en cada línea del PS se unen y guardan automáticamente en este informe (
              <strong className="text-emerald-300">{opsConEvidenciaCount} líneas con avance</strong> •{' '}
              <strong className="text-sky-300">{totalFotosSemana} fotos</strong>).
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-col items-stretch gap-2 shrink-0">
            {data?.informeSemanal ? (
              <a
                href={`/api/informes/${data.informeSemanal.id}/export-html`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow transition"
              >
                <FileText className="w-4 h-4" />
                <span>Ver / Imprimir Informe {codigoPSActual}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={handleSyncInformeSemanal}
                disabled={syncingInforme}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold shadow transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{syncingInforme ? 'Generando...' : `Inicializar Informe ${codigoPSActual}`}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/informes')}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-bold transition cursor-pointer"
            >
              <span>Ir a sección Informes CRR ({sysStatus?.registros?.informesCRR ?? 1})</span>
            </button>
          </div>
        </div>

        {/* Tarjeta Resumen Estado Render & Espacios Disponibles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-600" />
              <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                Estado Render & Almacenamiento
              </span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                <Database className="w-3 h-3 text-sky-600" />
                <span>Espacio Libre BD</span>
              </div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {sysStatus?.storage?.database?.availableMb ?? 1015} MB
              </div>
              <div className="text-[10px] text-emerald-700 font-bold">
                Usado: {sysStatus?.storage?.database?.usedMb ?? 8.5} MB / 1024 MB
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-500 font-semibold">RAM Libre Render</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {sysStatus?.storage?.memory?.availableMb ?? 415} MB
              </div>
              <div className="text-[10px] text-sky-700 font-bold">
                Cupos Usuario: {sysStatus?.usuarios?.registrados ?? 1}/{sysStatus?.usuarios?.maximo ?? 5}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Límite Payload Fotos: <strong>50 MB</strong></span>
            <span>Región: <strong className="text-slate-700">{sysStatus?.render?.region || 'oregon'}</strong></span>
          </div>
        </div>
      </div>

      {/* Zona Drag & Drop para importar archivo oficial PS...xlsm */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="bg-white border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-2xl p-5 text-center transition shadow-sm relative group cursor-pointer"
      >
        <input
          type="file"
          accept=".xlsm, .xlsx"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex items-center justify-center gap-3 pointer-events-none">
          <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-md group-hover:scale-105 transition">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-xs text-slate-800">
              ¿Tienes el archivo del programa <span className="text-sky-700">PS{semana}{anio} 340CRR.xlsm</span>?
            </h4>
            <p className="text-[11px] text-slate-500">
              Arrastra y suéltalo aquí para importar todas las operaciones, dotación (H2:N2) y horas asignadas preservando las fotos y comentarios.
            </p>
          </div>
          {uploading && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-100 px-3 py-1 rounded-full animate-pulse ml-auto">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Importando planilla Arauco...</span>
            </div>
          )}
        </div>
      </div>

      {/* Panel de Control de Dotación y Capacidad Neta Semanal */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="w-4 h-4 text-sky-600 shrink-0" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Dotación Diaria & Capacidad Neta de Horas Hombre ({getPeriodoFechas()})
            </h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              (data?.dotacion?.horasJornada || dotacionForm.horasJornada || 7) === 10
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-sky-100 text-sky-800 border border-sky-200'
            }`}>
              {(data?.dotacion?.horasJornada || dotacionForm.horasJornada || 7) === 10
                ? 'Turno 12h: 10 hs efectivas'
                : 'Turno 9h: 7 hs corridas normales'}
            </span>
          </div>
          <button
            onClick={() => {
              if (editDotacion) handleSaveDotacion();
              else setEditDotacion(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer self-start sm:self-auto ${
              editDotacion
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            {editDotacion ? <Save className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
            <span>{editDotacion ? 'Guardar Dotación' : 'Modificar Dotación'}</span>
          </button>
        </div>

        {/* Selector de Régimen de Jornada al Modificar Dotación */}
        {editDotacion && (
          <div className="bg-sky-50/80 border border-sky-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div>
              <span className="font-extrabold text-sky-950 block">Régimen Horario de la Dotación:</span>
              <span className="text-[11px] text-sky-800">
                Arauco 340CRR: Turno normal de 9h computa 7h corridas normales. Turno de 12h computa 10h efectivas.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDotacionForm({ ...dotacionForm, horasJornada: 7 })}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  (dotacionForm.horasJornada || 7) === 7
                    ? 'bg-sky-700 text-white shadow'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                7 hs corridas (Turno 9h normal)
              </button>
              <button
                type="button"
                onClick={() => setDotacionForm({ ...dotacionForm, horasJornada: 10 })}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  (dotacionForm.horasJornada || 7) === 10
                    ? 'bg-purple-700 text-white shadow'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                10 hs efectivas (Turno 12h extendido)
              </button>
            </div>
          </div>
        )}

        {/* Cajas Diarias de Dotación (Ciclo Miércoles a Martes) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DIAS.map((d) => {
            const formKey = d.key === 'mi' ? 'opMiercoles' :
                            d.key === 'ju' ? 'opJueves' :
                            d.key === 'vi' ? 'opViernes' :
                            d.key === 'sa' ? 'opSabado' :
                            d.key === 'dom' ? 'opDomingo' :
                            d.key === 'lu' ? 'opLunes' : 'opMartes';

            const numOperarios = (dotacionForm as any)[formKey] ?? 0;
            const jornadaActiva = editDotacion ? (dotacionForm.horasJornada || 7) : (data?.dotacion?.horasJornada || dotacionForm.horasJornada || 7);
            const hhDisp = data?.horasDisponibles?.[d.key] ?? (numOperarios * jornadaActiva);
            const hhProg = data?.horasProgramadas?.[d.key] ?? 0;
            const isFinDeSemana = d.key === 'sa' || d.key === 'dom';

            return (
              <div
                key={d.key}
                className={`p-3.5 rounded-xl border transition ${
                  isFinDeSemana
                    ? 'bg-slate-50 border-slate-200 opacity-60'
                    : 'bg-gradient-to-b from-sky-50/50 to-white border-sky-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{d.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">Día {d.dayIndex + 1}</span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Operarios:</span>
                  {editDotacion ? (
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={numOperarios}
                      onChange={(e) =>
                        setDotacionForm({ ...dotacionForm, [formKey]: Number(e.target.value) })
                      }
                      className="w-14 px-1.5 py-0.5 border border-sky-400 rounded text-center text-xs font-bold"
                    />
                  ) : (
                    <span className="font-extrabold text-sm text-slate-900">{numOperarios} op</span>
                  )}
                </div>

                <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 font-semibold">Disponible:</span>
                  <span className="font-extrabold text-sky-700">{hhDisp} HH</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-0.5">
                  <span className="text-[10px] text-slate-500 font-semibold">Programado:</span>
                  <span className={`font-extrabold ${hhProg > hhDisp ? 'text-red-600' : 'text-emerald-700'}`}>
                    {hhProg} HH
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen Global de Carga y Densidad Semanal */}
        <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Capacidad Total Semana</div>
              <div className="text-xl font-extrabold text-white mt-0.5">
                {data?.horasDisponibles?.total || 252} <span className="text-xs font-normal text-slate-300">HH Objetivo</span>
              </div>
            </div>
            <div className="border-l border-slate-700 pl-6">
              <div className="text-[11px] text-slate-400 font-medium">Total Programado en OMs</div>
              <div className="text-xl font-extrabold text-sky-400 mt-0.5">
                {data?.horasProgramadas?.total || 0} <span className="text-xs font-normal text-slate-300">HH Reales</span>
              </div>
            </div>
          </div>

          {/* Semáforo de Densidad (% de Uso de Recurso) */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-medium">Densidad Semanal (Arauco)</div>
              <div className="text-xs text-slate-300">Nivelación de Recurso</div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-lg font-extrabold border ${
              (data?.densidad?.total || 0) >= 90 && (data?.densidad?.total || 0) <= 105
                ? 'bg-emerald-950 text-emerald-400 border-emerald-600'
                : (data?.densidad?.total || 0) < 90
                ? 'bg-amber-950 text-amber-400 border-amber-600'
                : 'bg-red-950 text-red-400 border-red-600'
            }`}>
              {data?.densidad?.total || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Grilla Oficial de Operaciones Programadas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              Operaciones Programadas en Semana {semana} — {codigoPSActual}
            </h3>
            <p className="text-[11px] text-slate-500">
              Haz clic en <strong className="text-sky-700">"Fotos / Comentario"</strong> en cualquier línea para cargar evidencias que se unen al Informe Semanal <strong>{codigoPSActual}</strong>.
            </p>
          </div>
          <button
            onClick={openBacklogModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Añadir Operación desde IW37N</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Orden (OT)</th>
                <th className="py-3 px-2 text-center">Op.</th>
                <th className="py-3 px-3">Ubicación Técnica</th>
                <th className="py-3 px-4">Descripción Operación & Avance</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Mi</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Ju</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Vi</th>
                <th className="py-3 px-2 text-center bg-slate-100/80">Sa</th>
                <th className="py-3 px-2 text-center bg-slate-100/80">Do</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Lu</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Ma</th>
                <th className="py-3 px-3 text-center bg-slate-200/80 font-bold">Total HH</th>
                <th className="py-3 px-3 text-center bg-emerald-50/80 text-emerald-900">Evidencia Informe PS</th>
                <th className="py-3 px-2 text-center">Quitar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(!data?.operaciones || data.operaciones.length === 0) ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    No hay operaciones programadas para esta semana. Arrastra el archivo <strong className="text-slate-600">PS{semana}{anio} 340CRR.xlsm</strong> o haz clic en "+ Añadir Operación desde IW37N".
                  </td>
                </tr>
              ) : (
                data.operaciones.map((op: any) => {
                  const opFotos = parseOpFotos(op);
                  const tieneEvidencia =
                    opFotos.length > 0 ||
                    (op.comentariosEjecucion && op.comentariosEjecucion.trim() !== '');

                  return (
                    <tr key={op.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-extrabold text-sky-700 font-mono">
                        {op.numeroOrden}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-500 font-mono">
                        {op.numeroOperacion}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-mono text-slate-700 truncate max-w-[140px]" title={op.ubicacionTecnica}>
                        {op.ubicacionTecnica || 'AR-PLANTA-CRR'}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900 max-w-xs">
                        <div className="truncate font-semibold" title={op.textoOperacion}>
                          {op.textoOperacion}
                        </div>
                        {op.comentariosEjecucion && (
                          <div
                            className="text-[11px] text-emerald-700 font-medium truncate mt-0.5"
                            title={op.comentariosEjecucion}
                          >
                            💬 {op.comentariosEjecucion}
                          </div>
                        )}
                      </td>

                      {/* Inputs de Horas Diarias */}
                      {DIAS.map((d) => {
                        const propKey = d.key === 'mi' ? 'hhMiercoles' :
                                        d.key === 'ju' ? 'hhJueves' :
                                        d.key === 'vi' ? 'hhViernes' :
                                        d.key === 'sa' ? 'hhSabado' :
                                        d.key === 'dom' ? 'hhDomingo' :
                                        d.key === 'lu' ? 'hhLunes' : 'hhMartes';
                        const val = op[propKey] || 0;

                        return (
                          <td key={d.key} className="py-2 px-1 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="30"
                              defaultValue={val > 0 ? val : ''}
                              placeholder="-"
                              onBlur={(e) => {
                                const newH = parseFloat(e.target.value) || 0;
                                if (newH !== val) handleSaveOperacionHours(op, d.key, newH);
                              }}
                              className={`w-12 py-1 text-center rounded border font-bold text-xs transition ${
                                val > 0
                                  ? 'bg-sky-50 border-sky-400 text-sky-900 font-extrabold'
                                  : 'bg-transparent border-transparent hover:border-slate-300 text-slate-400'
                              }`}
                            />
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-center font-extrabold text-slate-900 bg-slate-50">
                        {op.hhTotalProgramado}
                      </td>

                      {/* Botón por línea para subir fotos o comentarios que se unen al Informe Semanal */}
                      <td className="py-2 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => openEvidenciaModal(op)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition shadow-sm cursor-pointer ${
                            tieneEvidencia
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200'
                          }`}
                          title="Subir fotos o comentarios de esta línea para el Informe Semanal del PS"
                        >
                          <Camera className="w-3.5 h-3.5 shrink-0" />
                          {tieneEvidencia ? (
                            <span>
                              {opFotos.length > 0 ? `${opFotos.length} foto(s)` : 'Con nota'}
                            </span>
                          ) : (
                            <span>+ Fotos / Nota</span>
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => handleRemoveOp(op.id)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition cursor-pointer"
                          title="Quitar operación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Filas Oficiales de Nivelación y Densidad al Pie */}
            <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-extrabold text-xs">
              <tr className="border-b border-slate-200">
                <td colSpan={4} className="py-3 px-4 text-right text-slate-700 uppercase tracking-wider text-[11px]">
                  Total HH disponibles por día
                </td>
                {DIAS.map((d) => (
                  <td key={d.key} className="py-3 px-1 text-center text-slate-800">
                    {data?.horasDisponibles?.[d.key] ?? 0}
                  </td>
                ))}
                <td className="py-3 px-3 text-center text-slate-900 bg-slate-200">
                  {data?.horasDisponibles?.total ?? 252}
                </td>
                <td colSpan={2}></td>
              </tr>

              <tr className="border-b border-slate-200">
                <td colSpan={4} className="py-3 px-4 text-right text-sky-800 uppercase tracking-wider text-[11px]">
                  Total HH programadas por día
                </td>
                {DIAS.map((d) => (
                  <td key={d.key} className="py-3 px-1 text-center text-sky-700">
                    {data?.horasProgramadas?.[d.key] ?? 0}
                  </td>
                ))}
                <td className="py-3 px-3 text-center text-sky-900 bg-sky-100">
                  {data?.horasProgramadas?.total ?? 0}
                </td>
                <td colSpan={2}></td>
              </tr>

              <tr className="bg-slate-900 text-white">
                <td colSpan={4} className="py-3 px-4 text-right text-emerald-400 uppercase tracking-wider text-[11px]">
                  Densidad (% de uso del recurso)
                </td>
                {DIAS.map((d) => {
                  const dens = data?.densidad?.[d.key];
                  return (
                    <td key={d.key} className="py-3 px-1 text-center font-extrabold text-emerald-400">
                      {dens !== undefined && dens > 0 ? `${dens}%` : '-'}
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-center text-emerald-400 bg-slate-950 font-extrabold text-sm">
                  {data?.densidad?.total ?? 0}%
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* =====================================================================
          MODAL POR LÍNEA DE PS: SUBIR FOTOS Y COMENTARIOS AL INFORME SEMANAL
      ===================================================================== */}
      {selectedOpEvidencia && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedOpEvidencia(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase">
                    Unión Automática a Informe {codigoPSActual}
                  </span>
                  <span className="text-xs font-mono text-sky-400 font-bold">
                    OT #{selectedOpEvidencia.numeroOrden} • Op. {selectedOpEvidencia.numeroOperacion}
                  </span>
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  {selectedOpEvidencia.textoOperacion}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  📍 Ubicación: <strong>{selectedOpEvidencia.ubicacionTecnica || '340CRR'}</strong> • Trabajo Programado: <strong>{selectedOpEvidencia.hhTotalProgramado} HH</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOpEvidencia(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveEvidencia} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Estado de Ejecución de la línea */}
              <div>
                <label className="block font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  Estado de Ejecución en la Semana
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Pendiente', 'En Ejecución', 'Completado', 'Observado'].map((est) => (
                    <button
                      key={est}
                      type="button"
                      onClick={() => setEstadoEjecucion(est)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition cursor-pointer ${
                        estadoEjecucion === est
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {est}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comentarios de la Línea */}
              <div>
                <label className="block font-extrabold text-slate-800 uppercase tracking-wider mb-1.5">
                  <MessageSquarePlus className="w-3.5 h-3.5 inline mr-1 text-sky-600" />
                  Comentarios de Terreno / Detalle del Trabajo Realizado
                </label>
                <textarea
                  rows={3}
                  value={comentariosEjecucion}
                  onChange={(e) => setComentariosEjecucion(e.target.value)}
                  placeholder="Describe los trabajos realizados en esta línea, avances, hallazgos o pendientes para el informe semanal..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50"
                />
              </div>

              {/* Subida de Fotos */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Fotos de la Operación ({fotosEjecucion.length})</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">Etapa foto:</span>
                    {(['Antes', 'Durante', 'Después'] as const).map((et) => (
                      <button
                        key={et}
                        type="button"
                        onClick={() => setEtapaNuevaFoto(et)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          etapaNuevaFoto === et
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {et}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/40 p-3.5 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer transition">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleLinePhotoUpload}
                      className="hidden"
                    />
                    <div className="p-2 bg-sky-600 text-white rounded-lg">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-sky-800 block">Subir desde Galería / PC</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG o WEBP (Etapa: {etapaNuevaFoto})</span>
                    </div>
                  </label>

                  <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 p-3.5 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer transition">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleLinePhotoUpload}
                      className="hidden"
                    />
                    <div className="p-2 bg-emerald-600 text-white rounded-lg">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-emerald-900 block">Tomar Foto con Celular</span>
                      <span className="text-[10px] text-slate-500">Captura directa en terreno</span>
                    </div>
                  </label>
                </div>

                {/* Lista de fotos cargadas en esta línea */}
                {fotosEjecucion.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {fotosEjecucion.map((item, idx) => (
                      <div
                        key={idx}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col"
                      >
                        <div className="relative h-36 bg-slate-200">
                          <img
                            src={item.url}
                            alt={`Evidencia ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-bold">
                            {item.etapa}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFotosEjecucion((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer"
                            title="Eliminar foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="p-2">
                          <input
                            type="text"
                            value={item.comentario}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFotosEjecucion((prev) =>
                                prev.map((f, i) => (i === idx ? { ...f, comentario: val } : f))
                              );
                            }}
                            placeholder="Pie de foto o nota específica (opcional)..."
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-[11px] text-sky-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  Al guardar, los comentarios y fotos de esta línea se almacenan y se unen automáticamente al informe semanal{' '}
                  <strong>{codigoPSActual}</strong> en la sección <strong>Informes CRR</strong>.
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedOpEvidencia(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEvidencia}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-xl font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {savingEvidencia
                      ? 'Uniendo al Informe Semanal...'
                      : `Guardar y Unir a Informe ${codigoPSActual}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para agregar operaciones desde Backlog IW37N */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Seleccionar Operación desde Backlog IW37N
                </h3>
                <p className="text-xs text-slate-500">
                  Operaciones disponibles en el puesto {ptoTbjo} con HH estimadas en SAP
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Buscador */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchBacklog}
                onChange={(e) => handleSearchBacklog(e.target.value)}
                placeholder="Buscar por N° Orden, Operación o Descripción..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Lista de operaciones en backlog */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {loadingBacklog ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Cargando operaciones del backlog...
                </div>
              ) : backlogOps.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No se encontraron operaciones pendientes en el backlog.
                </div>
              ) : (
                backlogOps.map((op) => (
                  <div
                    key={op.id}
                    className="pt-2 flex items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-lg transition"
                  >
                    <div className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sky-700">OT: {op.numeroOrden}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          Op: {op.numeroOperacion}
                        </span>
                        {op.revision && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                            {op.revision}
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-slate-900 mt-0.5">{op.textoOperacion}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {op.ubicacionTecnica} | Trabajo SAP: <strong>{op.horasEstimadas} HH</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddOpFromBacklog(op)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer"
                    >
                      + Programar
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProgramacionSemanal;
