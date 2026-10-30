import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  FileSpreadsheet,
  Filter,
  CalendarDays,
  BookOpen,
  FileText,
  LogOut,
  Users,
  HardHat,
  Trash2,
  AlertTriangle,
  Activity,
  Database,
  Cpu,
  HardDrive,
  Server,
  RefreshCw,
  X,
  CheckCircle2,
  Sliders
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, stats, logout } = useAuth();
  const navigate = useNavigate();

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [includeAllModules, setIncludeAllModules] = useState(false);

  // Estado de Render y Espacios Disponibles
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [sysStatus, setSysStatus] = useState<any | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const fetchSystemStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await api.getSystemStatus();
      setSysStatus(res);
    } catch (err) {
      console.error('Error al obtener estado de Render:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNavbarClear = async () => {
    setClearing(true);
    try {
      await api.clearSapData({
        fullReset: includeAllModules,
        includeObras: includeAllModules,
        includeInformes: includeAllModules
      });
      setShowClearModal(false);
      setIncludeAllModules(false);
      alert('Toda la base cargada ha sido eliminada exitosamente.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la base cargada.');
    } finally {
      setClearing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatUptime = (sec?: number) => {
    if (!sec) return '0m';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const navItems = [
    { to: '/sap', label: 'Ingesta SAP', shortLabel: 'SAP', icon: FileSpreadsheet },
    { to: '/programacion', label: 'Programa Semanal PS', shortLabel: 'Programa PS', icon: CalendarDays },
    { to: '/triaje', label: 'Cartera & Backlog OM', shortLabel: 'Cartera OM', icon: Filter },
    { to: '/personal', label: 'Dotación', shortLabel: 'Dotación', icon: Users },
    { to: '/obras', label: 'Libro Diario', shortLabel: 'Libro Diario', icon: BookOpen },
    { to: '/informes', label: 'Informes CRR', shortLabel: 'Informes CRR', icon: FileText },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Logo y Marca */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 py-1">
            <div className="bg-gradient-to-br from-emerald-500 to-sky-600 p-1.5 sm:p-2 rounded-lg shadow-md flex items-center justify-center shrink-0">
              <HardHat className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 sm:gap-2 leading-none">
                <span className="font-extrabold tracking-tight text-sm sm:text-lg text-white leading-tight truncate">APP-Informes</span>
                <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-bold bg-sky-950 text-sky-400 border border-sky-800 rounded shrink-0 leading-none">
                  340CRR
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block truncate leading-tight mt-0.5">
                Arauco Mantenimiento & Estructuras
              </span>
            </div>
          </div>

          {/* Menú de Navegación Escritorio Amplio */}
          <nav className="hidden xl:flex items-center gap-1 shrink-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden 2xl:inline">{item.label}</span>
                  <span className="2xl:hidden">{item.shortLabel}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Estado Render, Usuario, Cupos y Salida */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
            {/* Botón Estado de Render y Espacios Disponibles */}
            <button
              type="button"
              onClick={() => {
                fetchSystemStatus();
                setShowRenderModal(true);
              }}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition cursor-pointer shadow-sm shrink-0"
              title="Ver Estado de Render, Espacios Disponibles en BD/RAM y Variables del Sistema"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <Server className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden 2xl:inline">
                Render: {sysStatus?.storage?.database?.availableMb ?? '1014'} MB disp.
              </span>
              <span className="hidden sm:inline 2xl:hidden">
                {sysStatus?.storage?.database?.availableMb ?? '1014'} MB
              </span>
              <span className="sm:hidden">Render</span>
            </button>

            {/* Badge de Cupos 5 Usuarios */}
            {stats && (
              <div
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${
                  stats.limiteAlcanzado
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                }`}
                title="Límite estricto de 5 usuarios registrados en la plataforma"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden 2xl:inline">Cupos: {stats.registrados} / {stats.maximo}</span>
                <span className="2xl:hidden">{stats.registrados}/{stats.maximo}</span>
              </div>
            )}

            {/* Botón Borrar Toda la Base (Acceso Rápido Administrador) */}
            {user?.rol === 'admin' && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
                title="Borrar toda la base cargada (Avisos, Órdenes SAP y registros asociados)"
              >
                <Trash2 className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="hidden 2xl:inline">Borrar toda la base</span>
                <span className="hidden xl:inline 2xl:hidden">Borrar base</span>
                <span className="xl:hidden sm:inline">Borrar</span>
              </button>
            )}

            {/* Usuario Actual */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block max-w-[130px] truncate">
                  <div className="text-xs font-bold text-slate-200 truncate">{user.nombre}</div>
                  <div className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold">
                    {user.rol}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Modal de Estado de Render, Espacios Disponibles y Variables Pertinentes */}
      {showRenderModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 text-slate-800"
          onClick={() => setShowRenderModal(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      Monitor de Estado de Render & Espacios Disponibles
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Servicio: <strong className="text-slate-200">{sysStatus?.render?.serviceName || 'app-informes'}</strong> • Región: <strong className="text-slate-200">{sysStatus?.render?.region || 'oregon'}</strong> • Uptime: <strong className="text-emerald-300">{formatUptime(sysStatus?.render?.uptimeSeconds)}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSystemStatus}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                  title="Actualizar métricas"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin text-sky-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowRenderModal(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Contenido con Scroll */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
              
              {/* Tarjetas de Almacenamiento y Recursos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* 1. Base de Datos PostgreSQL */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-sky-600" />
                      <span>BD PostgreSQL</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                      {sysStatus?.storage?.database?.usagePercent ?? 1}% en uso
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.max(3, sysStatus?.storage?.database?.usagePercent || 2)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Usado: <strong>{sysStatus?.storage?.database?.usedMb ?? 8.5} MB</strong></span>
                    <span className="text-emerald-700 font-bold">
                      Libre: {sysStatus?.storage?.database?.availableMb ?? 1015.5} MB
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Capacidad Total Plan Render: {sysStatus?.storage?.database?.limitMb ?? 1024} MB (1 GB)
                  </div>
                </div>

                {/* 2. Memoria RAM Instancia Render */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-purple-600" />
                      <span>Memoria RAM Render</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                      {sysStatus?.storage?.memory?.usagePercent ?? 18}% en uso
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-sky-500 rounded-full transition-all"
                      style={{ width: `${Math.max(5, sysStatus?.storage?.memory?.usagePercent || 18)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Usado: <strong>{sysStatus?.storage?.memory?.usedRssMb ?? 95} MB</strong></span>
                    <span className="text-emerald-700 font-bold">
                      Libre: {sysStatus?.storage?.memory?.availableMb ?? 417} MB
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Límite Contenedor Web: {sysStatus?.storage?.memory?.limitMb ?? 512} MB (Heap: {sysStatus?.storage?.memory?.heapUsedMb ?? 42} MB)
                  </div>
                </div>

                {/* 3. Cupos de Usuarios & Disco */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-emerald-600" />
                      <span>Cupos & Disco</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {sysStatus?.usuarios?.disponibles ?? 3} cupos libres
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${((sysStatus?.usuarios?.registrados || 1) / (sysStatus?.usuarios?.maximo || 5)) * 100}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Usuarios: <strong>{sysStatus?.usuarios?.registrados ?? 1} / {sysStatus?.usuarios?.maximo ?? 5}</strong></span>
                    <span className="text-sky-700 font-bold">
                      Disco Libre: {sysStatus?.storage?.disk?.availableGb ?? 8.8} GB
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Rama Git: {sysStatus?.render?.branch || 'main'} ({sysStatus?.render?.commit || 'latest'})
                  </div>
                </div>
              </div>

              {/* Conteo de Registros Almacenados en BD */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-extrabold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Inventario de Datos Almacenados en Base de Datos</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-lg font-black text-slate-900">{sysStatus?.registros?.avisos ?? 0}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Avisos SAP</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-lg font-black text-sky-700">{sysStatus?.registros?.operacionesOM ?? 0}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Operaciones OM</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                    <div className="text-lg font-black text-sky-800">{sysStatus?.registros?.operacionesEnPS ?? 0}</div>
                    <div className="text-[10px] text-sky-700 font-bold">Líneas en PS</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="text-lg font-black text-emerald-700">{sysStatus?.registros?.informesCRR ?? 0}</div>
                    <div className="text-[10px] text-emerald-700 font-bold">Informes CRR</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="text-lg font-black text-purple-700">{sysStatus?.registros?.fotosAlmacenadas ?? 0}</div>
                    <div className="text-[10px] text-purple-700 font-bold">Fotos en Informes</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-lg font-black text-slate-900">{sysStatus?.registros?.personal ?? 0}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">Personal Activo</div>
                  </div>
                </div>
              </div>

              {/* Programas Semanales Cargados */}
              {sysStatus?.programasCargados && sysStatus.programasCargados.length > 0 && (
                <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-4 space-y-2">
                  <div className="font-extrabold text-sky-950 uppercase tracking-wider text-[11px]">
                    Programas Semanales (PS) Almacenados en Servidor
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sysStatus.programasCargados.map((ps: any) => (
                      <span
                        key={ps.codigo}
                        className="px-3 py-1.5 rounded-lg bg-white border border-sky-300 text-sky-900 font-bold text-xs shadow-sm"
                      >
                        📅 {ps.codigo} ({ps.hhDisponibles} HH disp. • Turno {ps.horasJornada}h)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables Pertinentes del Entorno Render y Reglas de Negocio */}
              <div className="bg-slate-900 text-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-extrabold text-sky-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Variables de Entorno Render & Parámetros Operativos Pertinentes</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {sysStatus?.variables &&
                    Object.entries(sysStatus.variables).map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between bg-slate-800/90 px-3 py-2 rounded-lg border border-slate-700"
                      >
                        <span className="font-mono text-slate-400">{key}:</span>
                        <span className="font-bold text-emerald-300 text-right ml-2">{String(val)}</span>
                      </div>
                    ))}
                </div>
              </div>

            </div>

            {/* Pie */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-500">
                Node {sysStatus?.render?.nodeVersion} • {sysStatus?.render?.plan}
              </span>
              <button
                type="button"
                onClick={() => setShowRenderModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition cursor-pointer"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Advertencia y Confirmación antes de Borrar Toda la Base */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 text-slate-800">
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
                  <li>Todos los avisos SAP en la cartera de trabajo.</li>
                  <li>Operaciones de órdenes y horas estimadas (hoja IW37N / OM-HH).</li>
                  <li>Programaciones semanales y contactos de triaje asociados.</li>
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
                    Incluir también el borrado de Obras, Libros Diarios de Obra e Informes Técnicos CRR.
                  </p>
                </div>
              </label>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
                ⚠️ <strong>Nota de Seguridad:</strong> Se aplica <em>soft-delete</em> estricto (no se realiza borrado físico destructivo en la BD). La base quedará limpia para una nueva carga sin duplicados.
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
                onClick={handleNavbarClear}
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

      {/* Menú Móvil y Tablet (< 1280px) */}
      <div className="xl:hidden flex overflow-x-auto border-t border-slate-800 px-2 py-1.5 bg-slate-950 scrollbar-none gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap font-bold transition ${
                  isActive ? 'bg-slate-800 text-sky-400 border border-sky-500/40' : 'text-slate-400 hover:text-white'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </header>
  );
};

export default Navbar;
