import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  Filter,
  CalendarDays,
  BookOpen,
  FileText,
  LogOut,
  Users,
  ShieldCheck,
  HardHat
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, stats, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/sap', label: 'Ingesta SAP', icon: FileSpreadsheet },
    { to: '/triaje', label: 'Triaje Operativo', icon: Filter },
    { to: '/personal', label: 'Dotación', icon: Users },
    { to: '/programacion', label: 'Programación HH', icon: CalendarDays },
    { to: '/obras', label: 'Libro Diario', icon: BookOpen },
    { to: '/informes', label: 'Informes CRR', icon: FileText },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo y Marca */}
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-sky-600 p-2 rounded-lg shadow-md flex items-center justify-center">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-white">APP-Informes</span>
                <span className="px-2 py-0.5 text-xs font-bold bg-sky-950 text-sky-400 border border-sky-800 rounded">
                  340CRR
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
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
          <div className="flex items-center gap-3">
            {/* Badge de Cupos 5 Usuarios */}
            {stats && (
              <div
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
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

            {/* Usuario Actual */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-200">{user.nombre}</div>
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
