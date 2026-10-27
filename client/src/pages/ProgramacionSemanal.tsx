import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Search,
  Building,
  Wrench,
  Clock,
  Layers,
  Save,
  Check
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

export const ProgramacionSemanal: React.FC = () => {
  const [semana, setSemana] = useState(43);
  const [anio, setAnio] = useState(2026);
  const [ptoTbjo, setPtoTbjo] = useState('340CRR');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Modal para agregar operación desde Backlog IW37N
  const [showAddModal, setShowAddModal] = useState(false);
  const [backlogOps, setBacklogOps] = useState<any[]>([]);
  const [searchBacklog, setSearchBacklog] = useState('');
  const [loadingBacklog, setLoadingBacklog] = useState(false);

  // Edición rápida de dotación
  const [editDotacion, setEditDotacion] = useState(false);
  const [dotacionForm, setDotacionForm] = useState({
    opMiercoles: 7,
    opJueves: 8,
    opViernes: 8,
    opSabado: 0,
    opDomingo: 0,
    opLunes: 7,
    opMartes: 8,
    horasJornada: 7
  });

  const loadProgramacion = async () => {
    setLoading(true);
    try {
      const res = await api.getProgramacionArauco(semana, anio, ptoTbjo);
      setData(res);
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
    loadProgramacion();
  }, [semana, anio, ptoTbjo]);

  // Subida de archivo PS...xlsm
  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadSuccess(null);
    try {
      const res = await api.uploadPSFile(file);
      setUploadSuccess(`Archivo ${file.name} importado exitosamente (${res.summary.totalOperaciones} operaciones).`);
      setSemana(res.summary.semana);
      setAnio(res.summary.anio);
      await loadProgramacion();
      setTimeout(() => setUploadSuccess(null), 5000);
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
      const fieldMap: Record<string, string> = {
        mi: 'hhMiercoles',
        ju: 'hhJueves',
        vi: 'hhViernes',
        sa: 'hhSabado',
        dom: 'hhDomingo',
        lu: 'hhLunes',
        ma: 'hhMartes'
      };

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
        hhMiercoles: op.horasEstimadas || 7 // Por defecto asigna en miércoles
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
              Programa Diario Semanal de Mantenimiento ({ptoTbjo})
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
                className="p-1.5 hover:bg-slate-700 rounded-lg transition"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sky-300">
                Semana {semana} ({anio})
              </span>
              <button
                onClick={() => setSemana((s) => Math.min(52, s + 1))}
                className="p-1.5 hover:bg-slate-700 rounded-lg transition"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Imprimir Formato Arauco</span>
            </button>

            <button
              onClick={loadProgramacion}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Notificación de carga exitosa */}
        {uploadSuccess && (
          <div className="mt-4 p-3 bg-emerald-950 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{uploadSuccess}</span>
          </div>
        )}
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
              Arrastra y suéltalo aquí para importar al instante todas las operaciones, dotación y horas asignadas.
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
                {data?.horasDisponibles?.total || 266} <span className="text-xs font-normal text-slate-300">HH Objetivo</span>
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
              Operaciones Programadas en Semana {semana} (Detalle Diario)
            </h3>
            <p className="text-[11px] text-slate-500">
              Distribución de Horas Hombre cargadas desde Órdenes SAP y operaciones IW37N
            </p>
          </div>
          <button
            onClick={openBacklogModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm self-start sm:self-auto"
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
                <th className="py-3 px-4">Descripción Operación</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Mi</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Ju</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Vi</th>
                <th className="py-3 px-2 text-center bg-slate-100/80">Sa</th>
                <th className="py-3 px-2 text-center bg-slate-100/80">Do</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Lu</th>
                <th className="py-3 px-2 text-center bg-sky-50/60">Ma</th>
                <th className="py-3 px-3 text-center bg-slate-200/80 font-bold">Total HH</th>
                <th className="py-3 px-2 text-center">Quitar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {(!data?.operaciones || data.operaciones.length === 0) ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    No hay operaciones programadas para esta semana. Arrastra el archivo <strong className="text-slate-600">PS{semana}{anio} 340CRR.xlsm</strong> o haz clic en "+ Añadir Operación desde IW37N".
                  </td>
                </tr>
              ) : (
                data.operaciones.map((op: any) => (
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
                    <td className="py-2.5 px-4 font-medium text-slate-900 max-w-xs truncate" title={op.textoOperacion}>
                      {op.textoOperacion}
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

                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => handleRemoveOp(op.id)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition"
                        title="Quitar operación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
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
                  {data?.horasDisponibles?.total ?? 266}
                </td>
                <td></td>
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
                <td></td>
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
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

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
                className="text-slate-400 hover:text-slate-600 font-bold"
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
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex-shrink-0"
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
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
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
