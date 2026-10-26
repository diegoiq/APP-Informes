import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  CalendarDays,
  Users,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  Filter,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { RUBROS, RubroType } from '@app-informes/shared';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const ProgramacionSemanal: React.FC = () => {
  const [semana, setSemana] = useState(44);
  const [anio, setAnio] = useState(2026);
  const [rubroFilter, setRubroFilter] = useState('');
  const [tablero, setTablero] = useState<any[]>([]);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Asignar Tarea
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOperario, setSelectedOperario] = useState<any | null>(null);
  const [selectedDia, setSelectedDia] = useState('Lunes');
  const [selectedAvisoId, setSelectedAvisoId] = useState('');
  const [horas, setHoras] = useState(4);
  const [tareaDesc, setTareaDesc] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [progData, avisosData] = await Promise.all([
        api.getProgramacionSemanal(semana, anio, rubroFilter || undefined),
        api.getAvisos({ solo340CRR: 'true' })
      ]);
      setTablero(progData);
      setAvisos(avisosData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [semana, anio, rubroFilter]);

  const handleOpenAssignModal = (operario: any, dia: string) => {
    setSelectedOperario(operario);
    setSelectedDia(dia);
    setSelectedAvisoId(avisos[0]?.id || '');
    setHoras(4);
    setTareaDesc('');
    setShowAssignModal(true);
  };

  const handleGuardarAsignacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperario) return;

    try {
      // Fecha ficticia según día de la semana
      const baseDate = new Date(anio, 9, 26); // Semana de prueba en Oct 2026
      const diaOffset = DIAS.indexOf(selectedDia);
      const fechaAsig = new Date(baseDate);
      fechaAsig.setDate(baseDate.getDate() + diaOffset);

      await api.guardarAsignacion({
        semana,
        anio,
        personalId: selectedOperario.id,
        avisoId: selectedAvisoId || null,
        diaSemana: selectedDia,
        fecha: fechaAsig.toISOString(),
        horasAsignadas: horas,
        descripcionTarea: tareaDesc || 'Mantenimiento estructural preventivo'
      });

      setShowAssignModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al guardar asignación');
    }
  };

  const handleEliminarAsignacion = async (asigId: string) => {
    if (!confirm('¿Eliminar esta asignación horaria?')) return;
    try {
      await api.eliminarAsignacion(asigId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider">
            <CalendarDays className="w-4 h-4" />
            <span>Dotación & Programación Semanal de Horas Hombre</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Tablero de Nivelación de Carga (Semana {semana} - {anio})
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Control de capacidad neta, semaforización de dotación (75-100%) y coincidencia de rubro técnico.
          </p>
        </div>

        {/* Controles de Semana y Filtro de Rubro */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm">
            <button
              onClick={() => setSemana((s) => Math.max(1, s - 1))}
              className="p-2 hover:bg-slate-100 rounded-l-lg text-slate-600 transition"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800">
              Semana {semana}
            </span>
            <button
              onClick={() => setSemana((s) => Math.min(52, s + 1))}
              className="p-2 hover:bg-slate-100 rounded-r-lg text-slate-600 transition"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={rubroFilter}
              onChange={(e) => setRubroFilter(e.target.value)}
              className="py-2 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Todos los Rubros</option>
              {RUBROS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leyenda de Semáforo de Capacidad */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-slate-300">Semáforo de Carga:</span>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            <span>Verde: <strong>75% - 100%</strong> (Nivelado Óptimo)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <span>Amarillo: <strong>&lt; 75%</strong> (Capacidad Ociosa / Libre)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400"></span>
            <span>Rojo: <strong>&gt; 100%</strong> (Sobreasignación Peligrosa)</span>
          </div>
        </div>
      </div>

      {/* Grilla Semanal por Operario */}
      <div className="space-y-4">
        {tablero.map((item) => {
          const { personal, porcentajeOcupacion, horasAsignadasTotales, capacidadDisponibleHoras, estadoSemaforo, asignaciones } = item;
          const horasBase = (personal.regimenHorario || 9) * 5;

          const semaforoBg =
            estadoSemaforo === 'verde'
              ? 'bg-emerald-500'
              : estadoSemaforo === 'amarillo'
              ? 'bg-amber-400'
              : 'bg-red-500';

          return (
            <div
              key={personal.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition"
            >
              {/* Header de Operario y Carga */}
              <div className="bg-slate-50 px-6 py-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${semaforoBg} shadow-sm animate-pulse`}></div>
                  <div>
                    <span className="font-extrabold text-sm text-slate-900">{personal.nombre}</span>
                    <span className="ml-2 text-xs font-semibold text-slate-500 font-mono">({personal.legajo})</span>
                    <span className="ml-3 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-800">
                      {personal.especialidad}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-slate-500">Carga Semanal: </span>
                    <strong className="text-slate-900">{horasAsignadasTotales}h / {horasBase}h</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${semaforoBg}`}
                        style={{ width: `${Math.min(100, porcentajeOcupacion)}%` }}
                      ></div>
                    </div>
                    <span className="font-extrabold text-slate-800">{porcentajeOcupacion}%</span>
                  </div>
                </div>
              </div>

              {/* Grilla de Días (Lunes a Viernes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 p-3">
                {DIAS.map((dia) => {
                  const asignacionesDia = asignaciones.filter((a: any) => a.diaSemana === dia);
                  const totalHorasDia = asignacionesDia.reduce((sum: number, a: any) => sum + a.horasAsignadas, 0);

                  return (
                    <div key={dia} className="p-2.5 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-xs font-bold text-slate-700">{dia}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400">{totalHorasDia}h</span>
                          <button
                            onClick={() => handleOpenAssignModal(personal, dia)}
                            className="p-1 hover:bg-sky-50 text-sky-600 rounded transition"
                            title={`Asignar tarea el ${dia}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Tareas del día */}
                      <div className="space-y-1.5 min-h-[70px]">
                        {asignacionesDia.length === 0 ? (
                          <div className="text-[10px] text-slate-400 italic text-center py-4">
                            Disponible
                          </div>
                        ) : (
                          asignacionesDia.map((asig: any) => (
                            <div
                              key={asig.id}
                              className="bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 p-2 rounded-lg text-xs transition group relative"
                            >
                              <div className="flex items-center justify-between font-extrabold text-sky-900 text-[11px]">
                                <span>Aviso {asig.aviso?.numeroAviso || '340CRR'}</span>
                                <span className="text-[10px] text-slate-500 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  {asig.horasAsignadas}h
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                                {asig.descripcionTarea || asig.aviso?.descripcion}
                              </p>
                              
                              <button
                                onClick={() => handleEliminarAsignacion(asig.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 absolute top-1 right-1 p-1 transition"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal Asignar Tarea */}
      {showAssignModal && selectedOperario && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">
              Asignar Tarea a {selectedOperario.nombre}
            </h3>
            <p className="text-xs text-slate-500">
              Día: <strong className="text-slate-800">{selectedDia}</strong> | Especialidad: <strong className="text-sky-700">{selectedOperario.especialidad}</strong>
            </p>

            <form onSubmit={handleGuardarAsignacion} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Aviso SAP a Ejecutar</label>
                <select
                  value={selectedAvisoId}
                  onChange={(e) => setSelectedAvisoId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  {avisos.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.numeroAviso} - {a.descripcion.substring(0, 45)}... ({a.rubro || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Horas Asignadas para la Jornada</label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  required
                  value={horas}
                  onChange={(e) => setHoras(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción de la Tarea / Alcance</label>
                <textarea
                  rows={2}
                  value={tareaDesc}
                  onChange={(e) => setTareaDesc(e.target.value)}
                  placeholder="Ej: Montaje de andamio Sa 2 y preparación de superficie..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow"
                >
                  Asignar Horas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProgramacionSemanal;
