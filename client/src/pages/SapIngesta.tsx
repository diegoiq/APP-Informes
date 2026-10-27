import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Building,
  Calendar,
  Clock,
  Sparkles,
  Download,
  HardHat,
  Trash2
} from 'lucide-react';
import { RUBROS } from '@app-informes/shared';
import ModalRelevamientoPS from '../components/ModalRelevamientoPS';

export const SapIngesta: React.FC = () => {
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal Relevamiento & Movilización a PS
  const [selectedAvisoRelevamiento, setSelectedAvisoRelevamiento] = useState<any | null>(null);
  const [showRelevamientoModal, setShowRelevamientoModal] = useState(false);

  // Modal Advertencia y Borrado de Toda la Base Cargada
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState<string | null>(null);
  const [includeAllModules, setIncludeAllModules] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [revisionFilter, setRevisionFilter] = useState('');
  const [availableRevisiones, setAvailableRevisiones] = useState<string[]>([]);
  const [estadoFilter, setEstadoFilter] = useState<'abiertos' | 'todos' | 'cerrados'>('abiertos');
  const [omFilter, setOmFilter] = useState<'todos' | 'con_om' | 'sin_om'>('todos');
  const [solo340, setSolo340] = useState(true);

  const loadRevisiones = async () => {
    try {
      const data = await api.getRevisiones();
      setAvailableRevisiones(data || []);
    } catch (err) {
      console.warn('Error al cargar revisiones:', err);
    }
  };

  useEffect(() => {
    loadRevisiones();
  }, []);

  const fetchAvisos = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (revisionFilter) params.revision = revisionFilter;
      if (estadoFilter !== 'todos') params.estado = estadoFilter;
      if (omFilter === 'con_om') params.conOM = 'true';
      if (omFilter === 'sin_om') params.conOM = 'false';
      if (solo340) params.solo340CRR = 'true';

      const data = await api.getAvisos(params);
      setAvisos(data);
    } catch (err: any) {
      setError(err.message || 'Error al obtener avisos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvisos();
  }, [search, revisionFilter, estadoFilter, omFilter, solo340]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Por favor selecciona un archivo Excel (.xlsx o .xls)');
      return;
    }

    setUploading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await api.uploadSapExcel(file);
      setSummary(res.summary);
      await loadRevisiones();
      await fetchAvisos();
    } catch (err: any) {
      setError(err.message || 'Error durante la ingesta del archivo Excel');
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

  const handleClearExcelData = async () => {
    setClearing(true);
    setError(null);
    try {
      const res = await api.clearSapData({
        fullReset: includeAllModules,
        includeObras: includeAllModules,
        includeInformes: includeAllModules
      });
      setClearSuccess(res.message || 'Toda la base cargada ha sido eliminada exitosamente.');
      setShowClearModal(false);
      setIncludeAllModules(false);
      await fetchAvisos();
      await loadRevisiones();
      setTimeout(() => setClearSuccess(null), 6000);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la base cargada.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Título de Sección Responsivo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider flex-wrap">
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span className="break-words">Módulo de Ingesta Inteligente SAP PM</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5 break-words">
            Sincronización de Avisos & Órdenes (OM)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consolidación automática incremental (Upsert) protegiendo campos de terreno con filtrado preferente 340CRR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <a
            href="/api/sap/sample-file"
            download="Panel-Avisos-OM.xlsx"
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>Descargar Plantilla Estándar</span>
          </a>
          <button
            onClick={fetchAvisos}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={() => setShowClearModal(true)}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
            title="Borrar toda la base cargada (Avisos, Órdenes SAP y registros asociados)"
          >
            <Trash2 className="w-4 h-4 text-white" />
            <span>Borrar toda la base cargada</span>
          </button>
        </div>
      </div>

      {/* Notificación de Limpieza Exitosa */}
      {clearSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{clearSuccess}</span>
        </div>
      )}

      {/* Zona Drag & Drop para Ingesta Excel */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="bg-gradient-to-b from-sky-50 to-white border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-2xl p-8 text-center transition shadow-sm relative group cursor-pointer"
      >
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
          <div className="p-4 bg-sky-600 text-white rounded-2xl shadow-lg shadow-sky-600/30 group-hover:scale-105 transition">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-800">
              Arrastra y suelta aquí el archivo estándar <span className="text-sky-700">Panel-Avisos-OM.xlsx</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              O haz clic para seleccionar desde tu equipo. Soporta cruce automático y sincronización sin sobreescribir datos de campo.
            </p>
          </div>
          {uploading && (
            <div className="flex items-center gap-2 text-xs font-bold text-sky-700 bg-sky-100 px-4 py-1.5 rounded-full animate-pulse mt-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Procesando hojas de Excel y aplicando reglas de Upsert...</span>
            </div>
          )}
        </div>
      </div>

      {/* Banner de Resumen de Ingesta */}
      {summary && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Resultado de la Ingesta SAP & Cruce Relacional</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="text-[11px] text-slate-300 font-medium">Avisos Leídos</div>
              <div className="text-xl font-extrabold text-white mt-0.5">{summary.totalAvisosProcesados}</div>
            </div>
            <div className="bg-emerald-950/70 p-3 rounded-xl border border-emerald-700/80">
              <div className="text-[11px] text-emerald-300 font-medium">🟢 Abiertos (MEAB)</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{summary.avisosAbiertos ?? '-'}</div>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="text-[11px] text-slate-400 font-medium">⚪ Cerrados (MECE)</div>
              <div className="text-xl font-extrabold text-slate-300 mt-0.5">{summary.avisosCerrados ?? '-'}</div>
            </div>
            <div className="bg-sky-950/70 p-3 rounded-xl border border-sky-700/80">
              <div className="text-[11px] text-sky-300 font-medium">🛠️ Con Orden (OT)</div>
              <div className="text-xl font-extrabold text-sky-300 mt-0.5">{summary.avisosConOM ?? summary.totalOMProcesadas}</div>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="text-[11px] text-slate-300 font-medium">Nuevos (+)</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5">+{summary.insertados}</div>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <div className="text-[11px] text-slate-300 font-medium">Actualizados</div>
              <div className="text-xl font-extrabold text-sky-300 mt-0.5">{summary.actualizados}</div>
            </div>
            <div className="bg-amber-950/70 p-3 rounded-xl border border-amber-700/80">
              <div className="text-[11px] text-amber-300 font-medium">Filtro 340CRR</div>
              <div className="text-xl font-extrabold text-amber-300 mt-0.5">{summary.filtrados340CRR}</div>
            </div>
          </div>
          {summary.errores.length > 0 && (
            <div className="mt-4 p-3 bg-red-950/80 border border-red-800 rounded-lg text-xs text-red-200">
              <strong>Advertencias encontradas:</strong> {summary.errores.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar Aviso, OT, Ubicación o Texto..."
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Selector Estado: Abiertos vs Cerrados vs Todos */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setEstadoFilter('abiertos')}
              className={`px-3 py-1.5 rounded-md transition ${
                estadoFilter === 'abiertos'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🟢 Solo Abiertos
            </button>
            <button
              onClick={() => setEstadoFilter('todos')}
              className={`px-3 py-1.5 rounded-md transition ${
                estadoFilter === 'todos'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setEstadoFilter('cerrados')}
              className={`px-3 py-1.5 rounded-md transition ${
                estadoFilter === 'cerrados'
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚪ Cerrados (MECE)
            </button>
          </div>

          {/* Selector OM: Todos vs Con Orden vs Sin Orden */}
          <select
            value={omFilter}
            onChange={(e) => setOmFilter(e.target.value as any)}
            className="py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="todos">Todas las OMs</option>
            <option value="con_om">🛠️ Solo con Orden (OT)</option>
            <option value="sin_om">⚠️ Sin Orden Asignada</option>
          </select>

          {/* Selector Revisión: PS vs Obra vs Específica */}
          <select
            value={revisionFilter}
            onChange={(e) => setRevisionFilter(e.target.value)}
            className="py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          >
            <option value="">Todas las Revisiones</option>
            <option value="PS">📅 Solo Programas Semanales (PS)</option>
            <option value="OBRA">🏗️ Solo Obras (OBRA)</option>
            <option value="sin_revision">⚪ Sin Revisión Asignada</option>

            {availableRevisiones.some((r) => r.toUpperCase().includes('PS')) && (
              <optgroup label="── Programas Semanales (PS) ──">
                {availableRevisiones
                  .filter((r) => r.toUpperCase().includes('PS'))
                  .map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </optgroup>
            )}

            {availableRevisiones.some((r) => r.toUpperCase().includes('OBRA')) && (
              <optgroup label="── Obras (OBRA) ──">
                {availableRevisiones
                  .filter((r) => r.toUpperCase().includes('OBRA'))
                  .map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </optgroup>
            )}

            {availableRevisiones.some(
              (r) => !r.toUpperCase().includes('PS') && !r.toUpperCase().includes('OBRA')
            ) && (
              <optgroup label="── Otras Revisiones ──">
                {availableRevisiones
                  .filter((r) => !r.toUpperCase().includes('PS') && !r.toUpperCase().includes('OBRA'))
                  .map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none ml-1">
            <input
              type="checkbox"
              checked={solo340}
              onChange={(e) => setSolo340(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
            />
            <span>Pto. 340CRR</span>
          </label>
        </div>
      </div>

      {/* Tabla de Avisos y OMs Sincronizados */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 text-sm">Registros Sincronizados en Base de Datos</h3>
            <span className="px-2 py-0.5 text-xs font-bold bg-sky-100 text-sky-800 rounded-full">
              {avisos.length} avisos {estadoFilter === 'abiertos' ? 'abiertos' : estadoFilter === 'cerrados' ? 'cerrados' : 'en total'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              disabled={clearing}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Borrar toda la base cargada"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Borrar toda la base cargada</span>
            </button>
            <span className="text-xs text-slate-400 hidden lg:inline">Cruce relacional Avisos ↔ OM ↔ Análisis</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">N° Aviso & Cruce OT</th>
                <th className="py-3 px-4">Descripción Requerimiento</th>
                <th className="py-3 px-4">Pto. Trabajo & Ubicación</th>
                <th className="py-3 px-4">Prioridad SAP vs Real</th>
                <th className="py-3 px-4 text-center">Fase</th>
                <th className="py-3 px-4 text-center">Relevamiento & PS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {avisos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron avisos que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                avisos.map((item) => {
                  const isCerrado = /MECE|CTEC|CERR/i.test(item.estadoSistema);
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/80 transition ${isCerrado ? 'opacity-70 bg-slate-50/40' : ''}`}>
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-sky-700 text-sm">{item.numeroAviso}</div>
                        {item.numeroOrden ? (
                          <div className="text-[11px] text-slate-800 font-bold flex items-center gap-1 mt-0.5">
                            <span>OT: {item.numeroOrden}</span>
                            {item.revision && (
                              <button
                                type="button"
                                onClick={() => setRevisionFilter(item.revision)}
                                title={`Filtrar por revisión ${item.revision}`}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold border transition hover:opacity-80 cursor-pointer ${
                                  item.revision.toUpperCase().includes('OBRA')
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : item.revision.toUpperCase().includes('PS')
                                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                {item.revision.toUpperCase().includes('OBRA') ? '🏗️ ' : item.revision.toUpperCase().includes('PS') ? '📅 ' : ''}
                                {item.revision}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Sin Orden SAP</div>
                        )}
                        <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded ${
                          isCerrado
                            ? 'bg-slate-200 text-slate-600 border border-slate-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {isCerrado ? '⚪' : '🟢'} {item.estadoSistema}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 leading-snug">{item.descripcion}</div>
                        <div className="text-[10px] text-slate-400 mt-1">Autor: {item.autor || 'N/A'}</div>
                        {(item.fechaInicioExtrema || item.fechaFinExtrema) && (
                          <div className="text-[10px] text-sky-700 font-medium mt-0.5">
                            Plan: {item.fechaInicioExtrema ? new Date(item.fechaInicioExtrema).toLocaleDateString('es-CL') : ''} {item.fechaFinExtrema ? `al ${new Date(item.fechaFinExtrema).toLocaleDateString('es-CL')}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 font-bold text-slate-800">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.ptoTbjoResponsable || '340CRR'}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                          {item.ubicacionTecnica || 'AR-PLANTA-CRR'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                          {item.denominacionUbicacion || ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-slate-500">SAP: <strong>{item.prioridadSap || 'Media'}</strong></div>
                        <div className="mt-1">
                          {item.prioridadRealAcordada ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              item.prioridadRealAcordada === 1
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : item.prioridadRealAcordada === 2
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}>
                              Prio {item.prioridadRealAcordada}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold">Por triar</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {item.faseAvance || '1. Planificación'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {item.hhEstimadasTerreno ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 whitespace-nowrap">
                              {item.revisionPs || item.revision || 'PS'} ({item.hhEstimadasTerreno} HH)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAvisoRelevamiento(item);
                                setShowRelevamientoModal(true);
                              }}
                              className="text-[10px] text-sky-600 hover:text-sky-800 font-bold underline cursor-pointer"
                            >
                              Ver / Modificar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAvisoRelevamiento(item);
                              setShowRelevamientoModal(true);
                            }}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-lg text-[11px] font-bold shadow-sm transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                            title="Relevamiento de terreno con fotos y movilización a PS"
                          >
                            <HardHat className="w-3.5 h-3.5" />
                            <span>Relevar PS</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Relevamiento y Movilización a PS */}
      {showRelevamientoModal && selectedAvisoRelevamiento && (
        <ModalRelevamientoPS
          isOpen={showRelevamientoModal}
          onClose={() => {
            setShowRelevamientoModal(false);
            setSelectedAvisoRelevamiento(null);
          }}
          aviso={selectedAvisoRelevamiento}
          onSaved={() => {
            fetchAvisos();
          }}
        />
      )}

      {/* Modal de Advertencia y Confirmación antes de Borrar Toda la Base Cargada */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera con advertencia */}
            <div className="bg-red-50 border-b border-red-100 p-5 flex items-start gap-3.5">
              <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-md shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  ¿Deseas borrar toda la base cargada?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Esta acción archivará de la vista activa todos los avisos, requerimientos y órdenes cargadas en la base de datos.
                </p>
              </div>
            </div>

            {/* Contenido con detalles y advertencias */}
            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Resumen de registros a limpiar (Soft-Delete seguro):
                </div>
                <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                  <li>
                    <strong>{avisos.length} avisos SAP</strong> actualmente en la cartera activa.
                  </li>
                  <li>
                    Operaciones de órdenes y horas estimadas de SAP (hoja <strong>IW37N / OM-HH</strong>).
                  </li>
                  <li>
                    Programaciones semanales y contactos de triaje asociados a estos avisos.
                  </li>
                </ul>
              </div>

              {/* Casilla de reinicio extendido */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={includeAllModules}
                  onChange={(e) => setIncludeAllModules(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500 h-4 w-4"
                />
                <div className="text-[11px] text-slate-700">
                  <span className="font-bold text-slate-900">Reinicio total del sistema (Opcional):</span>
                  <p className="text-slate-500 mt-0.5">
                    Incluir también el borrado de Obras, Libros Diarios de Obra e Informes Técnicos CRR cargados en el sistema.
                  </p>
                </div>
              </label>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                ⚠️ <strong>Nota de Seguridad:</strong> Se aplica <em>soft-delete</em> estricto (no se realiza borrado físico destructivo en la BD). La base quedará limpia para que puedas cargar una nueva versión de la planilla Excel sin duplicados ni interferencias.
              </div>
            </div>

            {/* Botones de acción */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(false);
                  setIncludeAllModules(false);
                }}
                disabled={clearing}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClearExcelData}
                disabled={clearing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {clearing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Borrando toda la base...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sí, borrar toda la base cargada</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SapIngesta;
