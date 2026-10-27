import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Briefcase,
  Search,
  Filter,
  Layers,
  Upload,
  RefreshCw,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { RUBROS, RubroType } from '@app-informes/shared';

export const GestionPersonal: React.FC = () => {
  const { user } = useAuth();
  const [personalList, setPersonalList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [rubroFilter, setRubroFilter] = useState('');

  // Modal Nuevo / Editar Operario
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [legajo, setLegajo] = useState('');
  const [nombre, setNombre] = useState('');
  const [especialidad, setEspecialidad] = useState<string>(RUBROS[0]);
  const [regimenHorario, setRegimenHorario] = useState(9);
  const [activo, setActivo] = useState(true);

  // Modal Carga Masiva (Lote / Excel / CSV)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState<any | null>(null);

  // Modal Ausencia
  const [showAusenciaModal, setShowAusenciaModal] = useState(false);
  const [selectedOperarioAusencia, setSelectedOperarioAusencia] = useState<any | null>(null);
  const [tipoAusencia, setTipoAusencia] = useState('Vacaciones');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [obsAusencia, setObsAusencia] = useState('');

  // Modal Limpiar Datos Demo
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleanAvisos, setCleanAvisos] = useState(false);
  const [cleanObras, setCleanObras] = useState(false);
  const [cleanPersonal, setCleanPersonal] = useState(false);
  const [cleanInformes, setCleanInformes] = useState(false);
  const [cleanDemoUsers, setCleanDemoUsers] = useState(false);
  const [cleanLoading, setCleanLoading] = useState(false);

  const loadPersonal = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { includeInactive: 'true' };
      if (search) params.search = search;
      if (rubroFilter) params.rubro = rubroFilter;

      const data = await api.getPersonal(params);
      setPersonalList(data);
    } catch (err) {
      console.error('Error al cargar personal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPersonal();
  }, [search, rubroFilter]);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedId(null);
    setLegajo('');
    setNombre('');
    setEspecialidad(RUBROS[0]);
    setRegimenHorario(9);
    setActivo(true);
    setShowModal(true);
  };

  const handleOpenEdit = (p: any) => {
    setIsEditing(true);
    setSelectedId(p.id);
    setLegajo(p.legajo);
    setNombre(p.nombre);
    setEspecialidad(p.especialidad);
    setRegimenHorario(p.regimenHorario || 9);
    setActivo(p.activo);
    setShowModal(true);
  };

  const handleSaveOperario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedId) {
        await api.updatePersonal(selectedId, {
          legajo,
          nombre,
          especialidad,
          regimenHorario,
          activo
        });
      } else {
        await api.createPersonal({
          legajo,
          nombre,
          especialidad,
          regimenHorario
        });
      }
      setShowModal(false);
      await loadPersonal();
    } catch (err: any) {
      alert(err.message || 'Error al guardar operario');
    }
  };

  const handleDeleteOperario = async (id: string, nom: string) => {
    if (!confirm(`¿Estás seguro de eliminar al operario ${nom}? Se cancelarán sus asignaciones.`)) return;
    try {
      await api.deletePersonal(id);
      await loadPersonal();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar operario');
    }
  };

  // Carga Masiva: Procesa texto copiado desde Excel o CSV
  const handleProcessBulk = async () => {
    if (!bulkText.trim()) {
      alert('Por favor ingresa o pega las filas de operarios.');
      return;
    }

    const lines = bulkText.split('\n');
    const operarios = [];

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      // Soporta separador por tabuladores (copiado directo de Excel) o comas/punto y coma
      const parts = cleanLine.includes('\t')
        ? cleanLine.split('\t')
        : cleanLine.includes(';')
        ? cleanLine.split(';')
        : cleanLine.split(',');

      if (parts.length >= 2) {
        const leg = parts[0]?.trim();
        const nom = parts[1]?.trim();
        const esp = parts[2]?.trim() || 'Mantenimiento General';
        const reg = parts[3] ? Number(parts[3].trim()) : 9;

        operarios.push({
          legajo: leg,
          nombre: nom,
          especialidad: esp,
          regimenHorario: isNaN(reg) ? 9 : reg
        });
      }
    }

    if (operarios.length === 0) {
      alert('No se detectaron registros válidos. Usa el formato: Legajo, Nombre, Especialidad, Horas');
      return;
    }

    try {
      const res = await api.bulkCreatePersonal(operarios);
      setBulkResult(res);
      setBulkText('');
      await loadPersonal();
    } catch (err: any) {
      alert(err.message || 'Error en la carga masiva');
    }
  };

  // Registrar Ausencia
  const handleOpenAusencia = (p: any) => {
    setSelectedOperarioAusencia(p);
    setTipoAusencia('Vacaciones');
    setFechaInicio(new Date().toISOString().split('T')[0]);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setFechaFin(nextWeek.toISOString().split('T')[0]);
    setObsAusencia('');
    setShowAusenciaModal(true);
  };

  const handleSaveAusencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperarioAusencia) return;
    try {
      await api.registrarAusencia(selectedOperarioAusencia.id, {
        tipo: tipoAusencia,
        fechaInicio,
        fechaFin,
        observaciones: obsAusencia
      });
      setShowAusenciaModal(false);
      await loadPersonal();
    } catch (err: any) {
      alert(err.message || 'Error al registrar ausencia');
    }
  };

  const handleDeleteAusencia = async (ausenciaId: string) => {
    if (!confirm('¿Eliminar esta ausencia registrada?')) return;
    try {
      await api.eliminarAusencia(ausenciaId);
      await loadPersonal();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar ausencia');
    }
  };

  // Limpiar Datos Demo
  const handleExecuteClean = async () => {
    if (!cleanAvisos && !cleanObras && !cleanPersonal && !cleanInformes && !cleanDemoUsers) {
      alert('Debes seleccionar al menos una casilla para limpiar.');
      return;
    }
    if (!confirm('⚠️ ¿Confirmas eliminar los datos seleccionados? Esta acción es irreversible y eliminará los registros de la base de datos.')) return;
    setCleanLoading(true);
    try {
      const res = await api.cleanDemoData({
        cleanAvisos,
        cleanObras,
        cleanPersonal,
        cleanInformes,
        cleanDemoUsers
      });
      alert(res.message);
      setShowCleanModal(false);
      await loadPersonal();
    } catch (err: any) {
      alert(err.message || 'Error al limpiar datos');
    } finally {
      setCleanLoading(false);
    }
  };

  // Métricas
  const totalOperarios = personalList.length;
  const activos = personalList.filter((p) => p.activo).length;
  const totalHH = personalList
    .filter((p) => p.activo)
    .reduce((acc, p) => acc + (p.regimenHorario || 9) * 5, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>Módulo de Dotación & Personal Operativo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Gestión y Carga de Personal (Puesto 340CRR)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Alta individual, carga masiva desde Excel/CSV, especialidades y control de ausencias para cálculo de capacidad neta semanal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {user?.rol === 'admin' && (
            <button
              onClick={() => setShowCleanModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition shadow-sm"
              title="Limpiar datos de prueba para ingresar datos reales"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Limpiar Datos Demo</span>
            </button>
          )}

          <button
            onClick={() => {
              setBulkResult(null);
              setShowBulkModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Carga Masiva (Excel / CSV)</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-sky-950/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Nuevo Operario</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Dotación */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-sky-600" />
            <span>Total Dotación</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalOperarios}</div>
          <span className="text-[10px] text-slate-400">operarios en nómina</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Operarios Activos</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{activos}</div>
          <span className="text-[10px] text-slate-400">disponibles en planta</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Capacidad Semanal</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalHH} h</div>
          <span className="text-[10px] text-slate-400">HH brutas disponibles</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-sky-600" />
            <span>Rubros Activos</span>
          </div>
          <div className="text-2xl font-extrabold text-sky-700 mt-1">
            {new Set(personalList.map((p) => p.especialidad)).size}
          </div>
          <span className="text-[10px] text-slate-400">especialidades cubiertas</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Legajo o Nombre..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={rubroFilter}
            onChange={(e) => setRubroFilter(e.target.value)}
            className="py-1.5 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="">Todas las Especialidades</option>
            {RUBROS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Dotación */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Legajo</th>
                <th className="py-3 px-4">Nombre y Apellido</th>
                <th className="py-3 px-4">Especialidad / Rubro</th>
                <th className="py-3 px-4">Régimen Diario</th>
                <th className="py-3 px-4">Capacidad Semanal</th>
                <th className="py-3 px-4">Ausencias Registradas</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {personalList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No hay operarios registrados en la dotación. Haz clic en <strong>+ Nuevo Operario</strong> o en <strong>Carga Masiva</strong> para comenzar.
                  </td>
                </tr>
              ) : (
                personalList.map((p) => {
                  const tieneAusenciaActiva = p.ausencias && p.ausencias.length > 0;
                  const horasSemana = (p.regimenHorario || 9) * 5;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-extrabold text-sky-800 text-xs">
                        {p.legajo}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 text-xs">
                        {p.nombre}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                          {p.especialidad}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {p.regimenHorario || 9}h / día
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {horasSemana}h / sem
                      </td>
                      <td className="py-3 px-4">
                        {tieneAusenciaActiva ? (
                          <div className="space-y-1">
                            {p.ausencias.map((a: any) => (
                              <div
                                key={a.id}
                                className="flex items-center gap-1.5 text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded group"
                              >
                                <span className="font-bold">{a.tipo}:</span>
                                <span>{new Date(a.fechaInicio).toLocaleDateString('es-CL')} - {new Date(a.fechaFin).toLocaleDateString('es-CL')}</span>
                                <button
                                  onClick={() => handleDeleteAusencia(a.id)}
                                  className="text-red-500 hover:text-red-700 ml-auto opacity-0 group-hover:opacity-100 transition"
                                  title="Eliminar ausencia"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sin ausencias</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => handleOpenAusencia(p)}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-bold transition"
                          title="Registrar vacaciones, licencia o curso"
                        >
                          + Ausencia
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1 hover:bg-slate-100 text-slate-600 rounded transition"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOperario(p.id, p.nombre)}
                          className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo / Editar Operario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">
              {isEditing ? 'Editar Operario' : 'Registrar Nuevo Operario'}
            </h3>
            <form onSubmit={handleSaveOperario} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">N° de Legajo</label>
                <input
                  type="text"
                  required
                  value={legajo}
                  onChange={(e) => setLegajo(e.target.value)}
                  placeholder="Ej: LEG-2026-01"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Marcelo Morales Soto"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Especialidad / Rubro Operativo</label>
                <select
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold bg-white"
                >
                  {RUBROS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Régimen Horario Diario</label>
                <select
                  value={regimenHorario}
                  onChange={(e) => setRegimenHorario(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold bg-white"
                >
                  <option value={9}>9 Horas / día (45 horas semanales)</option>
                  <option value={8}>8 Horas / día (40 horas semanales)</option>
                </select>
              </div>

              {isEditing && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="activoCheck"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="rounded text-sky-600 h-4 w-4"
                  />
                  <label htmlFor="activoCheck" className="font-bold text-slate-700 cursor-pointer">
                    Operario en estado Activo
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Operario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Carga Masiva (Lote / Copiado Excel / CSV) */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Carga Masiva de Dotación de Personal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pega directamente las columnas desde Excel o ingresa filas separadas por comas.
                </p>
              </div>
              <button
                onClick={() => {
                  setBulkText(`LEG-201\tJuan Pérez Miranda\tCivil\t9\nLEG-202\tRodrigo Valdés\tPintura/Aislación\t9\nLEG-203\tMarcos Soto\tSoldador\t9\nLEG-204\tEsteban Silva\tCañerías/Mecánica\t8`);
                }}
                className="text-xs text-sky-600 hover:text-sky-700 font-bold underline"
              >
                Cargar Ejemplo
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 text-[11px]">
                <strong>Formato de columnas (por línea):</strong>
                <div className="font-mono mt-1 text-slate-800">
                  Legajo [tab/coma] Nombre Completo [tab/coma] Especialidad [tab/coma] Horas
                </div>
              </div>

              <textarea
                rows={9}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="LEG-1001&#9;Juan Pérez Miranda&#9;Civil&#9;9&#10;LEG-1002&#9;Carlos Díaz Morales&#9;Soldador&#9;9"
                className="w-full p-3 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
              />

              {bulkResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>¡Carga masiva ejecutada con éxito!</span>
                  </div>
                  <div>- Nuevos operarios creados: <strong>{bulkResult.creados}</strong></div>
                  <div>- Existentes actualizados: <strong>{bulkResult.actualizados}</strong></div>
                  {bulkResult.errores.length > 0 && (
                    <div className="text-red-700 text-[11px] mt-1">
                      <strong>Observaciones:</strong> {bulkResult.errores.join(', ')}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={handleProcessBulk}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow"
                >
                  Procesar y Guardar Dotación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Ausencia */}
      {showAusenciaModal && selectedOperarioAusencia && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">
              Registrar Ausencia para {selectedOperarioAusencia.nombre}
            </h3>
            <p className="text-xs text-slate-500">
              Legajo: <strong className="text-sky-800">{selectedOperarioAusencia.legajo}</strong> | Especialidad: {selectedOperarioAusencia.especialidad}
            </p>

            <form onSubmit={handleSaveAusencia} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Ausencia</label>
                <select
                  value={tipoAusencia}
                  onChange={(e) => setTipoAusencia(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="Vacaciones">Vacaciones Legales</option>
                  <option value="Licencia Médica">Licencia Médica</option>
                  <option value="Curso/Capacitación">Curso / Capacitación HSE</option>
                  <option value="Permiso Particular">Permiso Particular</option>
                  <option value="Otra">Otra Causa</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones / Respaldo</label>
                <textarea
                  rows={2}
                  value={obsAusencia}
                  onChange={(e) => setObsAusencia(e.target.value)}
                  placeholder="Licencia médica autorizada por RRHH..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAusenciaModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow"
                >
                  Asentar Ausencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Limpiar Datos Demo */}
      {showCleanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600 border-b pb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-900">
                Limpieza de Datos de Prueba (Demo)
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Selecciona los módulos de prueba que deseas reiniciar a cero para comenzar con datos reales de planta:
            </p>

            <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanAvisos}
                  onChange={(e) => setCleanAvisos(e.target.checked)}
                  className="rounded text-red-600 h-4 w-4"
                />
                <span className="font-bold text-slate-800">Borrar Avisos y Triajes Demo (dejar listo para subir Panel SAP real)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanPersonal}
                  onChange={(e) => setCleanPersonal(e.target.checked)}
                  className="rounded text-red-600 h-4 w-4"
                />
                <span className="font-bold text-slate-800">Borrar Personal Demo (limpiar dotación para cargar operarios reales)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanObras}
                  onChange={(e) => setCleanObras(e.target.checked)}
                  className="rounded text-red-600 h-4 w-4"
                />
                <span className="font-bold text-slate-800">Borrar Obras y Libros Diarios Demo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanInformes}
                  onChange={(e) => setCleanInformes(e.target.checked)}
                  className="rounded text-red-600 h-4 w-4"
                />
                <span className="font-bold text-slate-800">Borrar Informes Técnicos CRR Demo</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-slate-200">
                <input
                  type="checkbox"
                  checked={cleanDemoUsers}
                  onChange={(e) => setCleanDemoUsers(e.target.checked)}
                  className="rounded text-red-600 h-4 w-4"
                />
                <span className="font-bold text-red-700">Eliminar Usuarios Demo (admin@arauco-crr.cl / supervisor@arauco-crr.cl)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowCleanModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={cleanLoading}
                onClick={handleExecuteClean}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow disabled:opacity-50"
              >
                {cleanLoading ? 'Limpiando...' : 'Confirmar y Limpiar Datos'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default GestionPersonal;
