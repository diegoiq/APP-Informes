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
  Download
} from 'lucide-react';
import { RUBROS } from '@app-informes/shared';

export const SapIngesta: React.FC = () => {
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [rubroFilter, setRubroFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'abiertos' | 'todos' | 'cerrados'>('abiertos');
  const [omFilter, setOmFilter] = useState<'todos' | 'con_om' | 'sin_om'>('todos');
  const [solo340, setSolo340] = useState(true);

  const fetchAvisos = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (rubroFilter) params.rubro = rubroFilter;
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
  }, [search, rubroFilter, estadoFilter, omFilter, solo340]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Título de Sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Módulo de Ingesta Inteligente SAP</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Sincronización de Avisos & Órdenes (OM)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consolidación automática de hojas <span className="font-semibold text-slate-700">Avisos</span>, <span className="font-semibold text-slate-700">OM</span> y taxonomía <span className="font-semibold text-slate-700">Analisis</span> con filtrado preferente 340CRR.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

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

          {/* Selector Rubro */}
          <select
            value={rubroFilter}
            onChange={(e) => setRubroFilter(e.target.value)}
            className="py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Todos los Rubros</option>
            {RUBROS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
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
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Registros Sincronizados en Base de Datos</h3>
            <span className="px-2 py-0.5 text-xs font-bold bg-sky-100 text-sky-800 rounded-full">
              {avisos.length} avisos {estadoFilter === 'abiertos' ? 'abiertos' : estadoFilter === 'cerrados' ? 'cerrados' : 'en total'}
            </span>
          </div>
          <span className="text-xs text-slate-400">Cruce relacional Avisos ↔ OM ↔ Análisis</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">N° Aviso & Cruce OT</th>
                <th className="py-3 px-4">Descripción Requerimiento</th>
                <th className="py-3 px-4">Pto. Trabajo & Ubicación</th>
                <th className="py-3 px-4">Rubro / Especialidad</th>
                <th className="py-3 px-4">Riesgo / Condición</th>
                <th className="py-3 px-4">Prioridad SAP vs Real</th>
                <th className="py-3 px-4 text-center">Fase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {avisos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
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
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                {item.revision}
                              </span>
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
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          {item.rubro || 'Mantenimiento General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {item.tipoRiesgo || 'Condición Subestándar'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {item.tipoCondicionFinal || 'Tratamiento Anticorrosivo'}
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default SapIngesta;
