import React, { useState } from 'react';
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
  ShieldCheck,
  HardHat,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, stats, logout } = useAuth();
  const navigate = useNavigate();

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [includeAllModules, setIncludeAllModules] = useState(false);

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

  const navItems = [
    { to: '/sap', label: 'Ingesta SAP', icon: FileSpreadsheet },
    { to: '/programacion', label: 'Programa Semanal PS', icon: CalendarDays },
    { to: '/triaje', label: 'Cartera & Backlog OM', icon: Filter },
    { to: '/personal', label: 'Dotación', icon: Users },
    { to: '/obras', label: 'Libro Diario', icon: BookOpen },
    { to: '/informes', label: 'Informes CRR', icon: FileText },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y Marca */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 py-1">
            <div className="bg-gradient-to-br from-emerald-500 to-sky-600 p-2 rounded-lg shadow-md flex items-center justify-center shrink-0">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 sm:gap-2 leading-none">
                <span className="font-extrabold tracking-tight text-base sm:text-lg text-white leading-tight">APP-Informes</span>
                <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-bold bg-sky-950 text-sky-400 border border-sky-800 rounded shrink-0 leading-none">
                  340CRR
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block truncate leading-tight mt-0.5">
                Arauco Mantenimiento & Estructuras
              </span>
            </div>
          </div>

          {/* Menú de Navegación */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-sky-400 border-b-2 border-sky-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Usuario, Cupos y Salida */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Badge de Cupos 5 Usuarios */}
            {stats && (
              <div
                className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  stats.limiteAlcanzado
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                }`}
                title="Límite estricto de 5 usuarios registrados en la plataforma"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cupos: {stats.registrados} / {stats.maximo}</span>
              </div>
            )}

            {/* Botón Borrar Toda la Base (Acceso Rápido Administrador) */}
            {user?.rol === 'admin' && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                title="Borrar toda la base cargada (Avisos, Órdenes SAP y registros asociados)"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Borrar toda la base</span>
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

      {/* Menú Móvil */}
      <div className="md:hidden flex overflow-x-auto border-t border-slate-800 px-2 py-1 bg-slate-950 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs whitespace-nowrap font-medium ${
                  isActive ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-white'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </header>
  );
};

export default Navbar;
