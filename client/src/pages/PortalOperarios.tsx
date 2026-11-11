import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { compressImage } from '../services/imageCompressor';
import {
  HardHat,
  Search,
  Camera,
  Upload,
  Plus,
  X,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CalendarDays,
  Sparkles,
  Flame,
  Building2,
  RefreshCw,
  User,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Check
} from 'lucide-react';

export interface FotoItem {
  url: string;
  etapa?: string;
  comentario?: string;
  fecha?: string;
  operario?: string;
}

export interface SemanaItem {
  semana: number;
  anio: number;
  label: string;
  rangoFechas: string;
  esActual: boolean;
}

export interface TareaOperario {
  id: string;
  numeroOrden: string;
  numeroOperacion: string;
  textoOperacion: string;
  ubicacionTecnica: string;
  categoria: 'civil' | 'soldador' | 'ambos';
  estadoEjecucion: string;
  comentariosEjecucion: string;
  fotos: FotoItem[];
  esNuevaTerreno: boolean;
  horasEstimadas?: number;
  aviso?: any;
}

export const PortalOperarios: React.FC = () => {
  const navigate = useNavigate();

  // Preferencias guardadas en el dispositivo móvil
  const [especialidad, setEspecialidad] = useState<'civil' | 'soldador'>(() => {
    const saved = localStorage.getItem('operario_especialidad');
    return saved === 'soldador' ? 'soldador' : 'civil';
  });

  const [operarioNombre, setOperarioNombre] = useState<string>(() => {
    return localStorage.getItem('operario_nombre') || '';
  });

  // Información de la semana en curso y lista de semanas disponibles
  const [infoSemana, setInfoSemana] = useState<{
    semana: number;
    anio: number;
    tituloSemana: string;
    rangoFechas: string;
    totalTareas: number;
  } | null>(null);

  const [semanasDisponibles, setSemanasDisponibles] = useState<SemanaItem[]>([]);
  const [semanaSeleccionada, setSemanaSeleccionada] = useState<{ semana: number; anio: number } | null>(null);
  const [showModalSemanas, setShowModalSemanas] = useState(false);

  // Lista de tareas y filtros
  const [tareas, setTareas] = useState<TareaOperario[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Lista de personal para autocompletar
  const [listaPersonal, setListaPersonal] = useState<any[]>([]);
  const [showCambiarOperario, setShowCambiarOperario] = useState(false);
  const [nuevoNombreInput, setNuevoNombreInput] = useState('');

  // Modales
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaOperario | null>(null);
  const [showFotoModal, setShowFotoModal] = useState(false);
  const [showNuevaTareaModal, setShowNuevaTareaModal] = useState(false);
  const [previewFotoZoom, setPreviewFotoZoom] = useState<string | null>(null);

  // Formulario de foto
  const [etapaFoto, setEtapaFoto] = useState<'Antes' | 'Durante' | 'Después'>('Durante');
  const [comentarioFoto, setComentarioFoto] = useState('');
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Formulario de nueva tarea
  const [nuevaEsp, setNuevaEsp] = useState<'Civil' | 'Soldador'>('Civil');
  const [nuevaTexto, setNuevaTexto] = useState('');
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [nuevaOrden, setNuevaOrden] = useState('');
  const [nuevaComentario, setNuevaComentario] = useState('');
  const [nuevaFotoInicial, setNuevaFotoInicial] = useState<string | null>(null);
  const [guardandoTarea, setGuardandoTarea] = useState(false);

  // Refs de archivos
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nuevaCameraInputRef = useRef<HTMLInputElement>(null);

  // Guardar cambios en localStorage
  useEffect(() => {
    localStorage.setItem('operario_especialidad', especialidad);
  }, [especialidad]);

  useEffect(() => {
    if (operarioNombre) {
      localStorage.setItem('operario_nombre', operarioNombre);
    }
  }, [operarioNombre]);

  // Cargar información inicial
  useEffect(() => {
    cargarInfoSemana();
    cargarPersonal();
  }, []);

  // Cargar tareas al cambiar especialidad o semana seleccionada
  useEffect(() => {
    cargarTareas();
  }, [especialidad, semanaSeleccionada]);

  const cargarInfoSemana = async () => {
    try {
      const res = await api.getOperariosInfoSemana();
      setInfoSemana(res);
      if (res?.semanasDisponibles && Array.isArray(res.semanasDisponibles)) {
        setSemanasDisponibles(res.semanasDisponibles);
      }
      if (!semanaSeleccionada && res?.semana && res?.anio) {
        setSemanaSeleccionada({ semana: res.semana, anio: res.anio });
      }
    } catch (err) {
      console.error('Error cargando info semana:', err);
    }
  };

  const cargarPersonal = async () => {
    try {
      const res = await api.getOperariosPersonal();
      if (Array.isArray(res)) setListaPersonal(res);
    } catch (err) {
      console.error('Error cargando personal:', err);
    }
  };

  const cargarTareas = async () => {
    setLoading(true);
    try {
      const res = await api.getOperariosTareas({
        especialidad,
        search,
        semana: semanaSeleccionada?.semana,
        anio: semanaSeleccionada?.anio
      });
      if (res && Array.isArray(res.tareas)) {
        setTareas(res.tareas);
      }
    } catch (err) {
      console.error('Error cargando tareas de operario:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    cargarTareas();
    cargarInfoSemana();
  };

  // Filtrado local en vivo si cambia search
  const tareasFiltradas = tareas.filter((t) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      t.numeroOrden.toLowerCase().includes(s) ||
      t.numeroOperacion.toLowerCase().includes(s) ||
      t.textoOperacion.toLowerCase().includes(s) ||
      t.ubicacionTecnica.toLowerCase().includes(s)
    );
  });

  // Procesamiento de fotos con compresión ultra-rápida (< 100 KB)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1024, 1024, 100 * 1024);
      setFotoBase64(compressed);
    } catch (err) {
      alert('No se pudo procesar la fotografía.');
    }
  };

  const handleNuevaFotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1024, 1024, 100 * 1024);
      setNuevaFotoInicial(compressed);
    } catch (err) {
      alert('No se pudo procesar la fotografía.');
    }
  };

  const handleAbrirModalFoto = (tarea: TareaOperario, etapaDefault: 'Antes' | 'Durante' | 'Después' = 'Durante') => {
    setTareaSeleccionada(tarea);
    setEtapaFoto(etapaDefault);
    setComentarioFoto('');
    setFotoBase64(null);
    setShowFotoModal(true);
  };

  const handleGuardarFoto = async () => {
    if (!tareaSeleccionada) return;
    if (!fotoBase64) {
      alert('Por favor toma una foto o selecciona una imagen.');
      return;
    }

    setSubiendoFoto(true);
    try {
      await api.guardarOperarioEvidencia(tareaSeleccionada.id, {
        etapa: etapaFoto,
        fotoUrl: fotoBase64,
        comentario: comentarioFoto,
        operarioNombre: operarioNombre || (especialidad === 'soldador' ? 'Operario Soldador' : 'Operario Civil')
      });

      // Refrescar lista de tareas
      await cargarTareas();
      setShowFotoModal(false);
      setFotoBase64(null);
      setComentarioFoto('');
    } catch (err: any) {
      alert(err.message || 'Error al guardar la fotografía');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleGuardarNuevaTarea = async () => {
    if (!nuevaTexto.trim()) {
      alert('Por favor escribe qué trabajo o tarea se debe realizar.');
      return;
    }

    setGuardandoTarea(true);
    try {
      await api.crearOperarioTareaNueva({
        especialidad: nuevaEsp,
        textoOperacion: nuevaTexto.trim(),
        ubicacionTecnica: nuevaUbicacion.trim() || undefined,
        numeroOrden: nuevaOrden.trim() || undefined,
        operarioNombre: operarioNombre || `Operario ${nuevaEsp}`,
        comentario: nuevaComentario.trim() || undefined,
        fotoInicial: nuevaFotoInicial || undefined,
        semana: semanaSeleccionada?.semana,
        anio: semanaSeleccionada?.anio
      });

      // Limpiar formulario y cerrar modal
      setNuevaTexto('');
      setNuevaUbicacion('');
      setNuevaOrden('');
      setNuevaComentario('');
      setNuevaFotoInicial(null);
      setShowNuevaTareaModal(false);

      // Si la nueva tarea coincide con la especialidad activa o es la misma, recargamos
      if (
        (nuevaEsp === 'Soldador' && especialidad === 'soldador') ||
        (nuevaEsp === 'Civil' && especialidad === 'civil')
      ) {
        await cargarTareas();
      } else {
        setEspecialidad(nuevaEsp === 'Soldador' ? 'soldador' : 'civil');
      }
    } catch (err: any) {
      alert(err.message || 'Error al crear la tarea');
    } finally {
      setGuardandoTarea(false);
    }
  };

  const isSoldador = especialidad === 'soldador';

  // Semana activa en pantalla
  const semanaSeleccionadaItem =
    semanasDisponibles.find(
      (s) => s.semana === semanaSeleccionada?.semana && s.anio === semanaSeleccionada?.anio
    ) ||
    (infoSemana
      ? {
          semana: infoSemana.semana,
          anio: infoSemana.anio,
          label: `Semana ${infoSemana.semana} (${infoSemana.anio})`,
          rangoFechas: infoSemana.rangoFechas,
          esActual: true
        }
      : null);

  const currentIndexSemana = semanasDisponibles.findIndex(
    (s) => s.semana === semanaSeleccionada?.semana && s.anio === semanaSeleccionada?.anio
  );
  const puedeIrAnterior = currentIndexSemana >= 0 && currentIndexSemana < semanasDisponibles.length - 1;
  const puedeIrSiguiente = currentIndexSemana > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      {/* Barra Superior / Header Terreno */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-2 rounded-xl shadow-lg shrink-0 ${
              isSoldador
                ? 'bg-amber-500 text-slate-950 shadow-amber-500/20'
                : 'bg-sky-500 text-slate-950 shadow-sky-500/20'
            }`}>
              {isSoldador ? <Flame className="w-5 h-5" /> : <HardHat className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  Portal Operarios
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isSoldador ? 'bg-amber-400/20 text-amber-300' : 'bg-sky-400/20 text-sky-300'
                }`}>
                  {isSoldador ? 'Soldadura' : 'Civiles'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {operarioNombre ? (
                  <span>Operario: <strong className="text-slate-200">{operarioNombre}</strong></span>
                ) : (
                  <span className="text-amber-400">Toca para identificarte</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCambiarOperario(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1 transition"
              title="Cambiar operario"
            >
              <User className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline text-xs font-semibold">
                {operarioNombre ? 'Cambiar' : 'Identificarme'}
              </span>
            </button>
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition ${
                refreshing ? 'animate-spin text-sky-400' : ''
              }`}
              title="Actualizar tareas"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-3xl mx-auto w-full px-4 pt-4 space-y-4 flex-1">
        {/* Banner de Semana con Selector Interactivo */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 rounded-2xl border border-slate-800 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2 text-xs text-sky-400 font-bold uppercase tracking-wide flex-wrap">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {semanaSeleccionadaItem?.esActual
                    ? 'Tareas de la Semana en Curso'
                    : `Tareas de la Semana ${semanaSeleccionadaItem?.semana || ''}`}
                </span>
                {semanaSeleccionadaItem?.esActual ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    🟢 Semana Actual
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    ⏳ Otra Semana
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center gap-2 flex-wrap">
                <span>{semanaSeleccionadaItem?.label || `Semana ${infoSemana?.semana || 44} (${infoSemana?.anio || 2026})`}</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-400 font-mono">
                  • {semanaSeleccionadaItem?.rangoFechas || infoSemana?.rangoFechas || 'Ciclo Miércoles a Martes'}
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <span className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300">
                {tareasFiltradas.length} {tareasFiltradas.length === 1 ? 'tarea' : 'tareas'}
              </span>

              {/* Botón selector de semana */}
              <button
                type="button"
                onClick={() => setShowModalSemanas(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer"
              >
                <CalendarDays className="w-4 h-4" />
                <span>Elegir Semana ▾</span>
              </button>
            </div>
          </div>

          {/* Selector rápido anterior / siguiente */}
          {semanasDisponibles.length > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <button
                type="button"
                disabled={!puedeIrAnterior}
                onClick={() => {
                  if (puedeIrAnterior) {
                    const target = semanasDisponibles[currentIndexSemana + 1];
                    setSemanaSeleccionada({ semana: target.semana, anio: target.anio });
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  puedeIrAnterior
                    ? 'text-slate-300 hover:bg-slate-800 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Semana Anterior</span>
              </button>

              <button
                type="button"
                onClick={() => setShowModalSemanas(true)}
                className="text-[11px] text-sky-400 font-semibold hover:underline"
              >
                Ver todas ({semanasDisponibles.length})
              </button>

              <button
                type="button"
                disabled={!puedeIrSiguiente}
                onClick={() => {
                  if (puedeIrSiguiente) {
                    const target = semanasDisponibles[currentIndexSemana - 1];
                    setSemanaSeleccionada({ semana: target.semana, anio: target.anio });
                  }
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                  puedeIrSiguiente
                    ? 'text-slate-300 hover:bg-slate-800 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed opacity-50'
                }`}
              >
                <span>Semana Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Selector de Especialidad: Civil vs Soldador */}
        <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-900 rounded-2xl border border-slate-800">
          <button
            onClick={() => setEspecialidad('civil')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-sm transition-all cursor-pointer ${
              !isSoldador
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Obras Civiles</span>
          </button>
          <button
            onClick={() => setEspecialidad('soldador')}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-sm transition-all cursor-pointer ${
              isSoldador
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'bg-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Soldadores</span>
          </button>
        </div>

        {/* Buscador Rápido y Botón Nueva Tarea */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar tarea, orden o sector en ${isSoldador ? 'Soldadura' : 'Civiles'}...`}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setNuevaEsp(isSoldador ? 'Soldador' : 'Civil');
              setShowNuevaTareaModal(true);
            }}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm shadow-md transition shrink-0 cursor-pointer ${
              isSoldador
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Reportar Nueva Tarea</span>
          </button>
        </div>

        {/* Lista de Tareas */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 mx-auto text-sky-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-400">
              Cargando tareas del programa semanal...
            </p>
          </div>
        ) : tareasFiltradas.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-8 text-center space-y-4">
            <div className="p-3 bg-slate-800 rounded-full w-fit mx-auto text-slate-400">
              {isSoldador ? <Flame className="w-8 h-8 text-amber-400" /> : <HardHat className="w-8 h-8 text-sky-400" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No se encontraron tareas</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {search
                  ? `No hay tareas en ${isSoldador ? 'Soldadura' : 'Civiles'} que coincidan con "${search}".`
                  : `No hay tareas para el equipo de ${isSoldador ? 'Soldadores' : 'Obras Civiles'} en ${semanaSeleccionadaItem?.label || 'esta semana'}.`}
              </p>
            </div>
            <button
              onClick={() => {
                setNuevaEsp(isSoldador ? 'Soldador' : 'Civil');
                setShowNuevaTareaModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-4 h-4 text-sky-400" />
              <span>Reportar tarea para esta semana</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tareasFiltradas.map((tarea) => {
              const totalFotos = tarea.fotos?.length || 0;
              const tieneCompletada = tarea.estadoEjecucion === 'Completado';

              return (
                <div
                  key={tarea.id}
                  className={`bg-slate-900 rounded-2xl border transition-all shadow-md overflow-hidden ${
                    tarea.esNuevaTerreno
                      ? 'border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-slate-900'
                      : tieneCompletada
                      ? 'border-emerald-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="p-4 space-y-3">
                    {/* Fila superior: Números de Orden y badges */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-md font-mono font-black text-xs ${
                          isSoldador ? 'bg-amber-400/20 text-amber-300' : 'bg-sky-400/20 text-sky-300'
                        }`}>
                          OT {tarea.numeroOrden}
                        </span>
                        <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[11px] bg-slate-800 text-slate-400">
                          Op. {tarea.numeroOperacion}
                        </span>
                        {tarea.esNuevaTerreno && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Nueva en Terreno
                          </span>
                        )}
                      </div>

                      {/* Badge de estado */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                        tieneCompletada
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tarea.estadoEjecucion === 'En Ejecución'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {tieneCompletada && <Check className="w-3 h-3" />}
                        {tarea.estadoEjecucion || 'Pendiente'}
                      </span>
                    </div>

                    {/* Descripción principal del trabajo */}
                    <p className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                      {tarea.textoOperacion}
                    </p>

                    {/* Ubicación técnica / Sector */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate font-mono">{tarea.ubicacionTecnica}</span>
                    </div>

                    {/* Comentarios de ejecución si existen */}
                    {tarea.comentariosEjecucion && (
                      <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-850 text-xs text-slate-300">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                          Notas de terreno:
                        </span>
                        <p className="whitespace-pre-line text-slate-300">{tarea.comentariosEjecucion}</p>
                      </div>
                    )}

                    {/* Miniaturas de fotos cargadas */}
                    {totalFotos > 0 && (
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="font-bold flex items-center gap-1 text-slate-300">
                            <Camera className="w-3.5 h-3.5 text-sky-400" />
                            {totalFotos} {totalFotos === 1 ? 'Foto cargada' : 'Fotos cargadas'}
                          </span>
                          <span className="text-[11px] text-slate-400">Toca para ampliar</span>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {tarea.fotos.map((f, idx) => (
                            <div
                              key={idx}
                              onClick={() => setPreviewFotoZoom(f.url)}
                              className="relative group aspect-square rounded-xl overflow-hidden bg-slate-950 border border-slate-800 cursor-pointer shadow"
                            >
                              <img
                                src={f.url}
                                alt={`Evidencia ${f.etapa || ''}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <span className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                f.etapa === 'Antes'
                                  ? 'bg-amber-600 text-white'
                                  : f.etapa === 'Después'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-sky-600 text-white'
                              }`}>
                                {f.etapa || 'Durante'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botón táctil grande para subir fotos */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleAbrirModalFoto(tarea, 'Durante')}
                        className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                          isSoldador
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                            : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                        }`}
                      >
                        <Camera className="w-4 h-4" />
                        <span>Subir Fotos de Evidencia</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Acceso para Supervisores hacia el Sistema General */}
        <div className="pt-6 pb-2 text-center">
          <button
            onClick={() => navigate('/programacion')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 font-semibold underline underline-offset-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Panel General del Programa Semanal</span>
          </button>
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: SUBIR FOTOS A LA TAREA                          */}
      {/* ======================================================== */}
      {showFotoModal && tareaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Cabecera del modal */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wide">
                  Carga de Evidencia en Terreno
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">
                  OT {tareaSeleccionada.numeroOrden} • Op {tareaSeleccionada.numeroOperacion}
                </h3>
              </div>
              <button
                onClick={() => setShowFotoModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-300 font-medium">
                {tareaSeleccionada.textoOperacion}
              </p>

              {/* Selector de Etapa: Antes / Durante / Después */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  ¿En qué etapa tomas esta foto?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Antes', 'Durante', 'Después'] as const).map((etapa) => (
                    <button
                      key={etapa}
                      type="button"
                      onClick={() => setEtapaFoto(etapa)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                        etapaFoto === etapa
                          ? etapa === 'Antes'
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : etapa === 'Después'
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-sky-600 border-sky-500 text-white'
                          : 'bg-slate-850 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {etapa}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botones de Cámara y Galería */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Captura o Selección de Foto
                </label>

                {/* Inputs ocultos */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 bg-slate-850 hover:bg-slate-800 border-2 border-dashed border-sky-500/50 rounded-xl text-sky-400 transition"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs font-extrabold">Abrir Cámara</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 bg-slate-850 hover:bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl text-slate-300 transition"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-xs font-extrabold">Elegir de Galería</span>
                  </button>
                </div>
              </div>

              {/* Vista previa de la foto seleccionada */}
              {fotoBase64 && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center shadow-inner">
                  <img src={fotoBase64} alt="Previa" className="max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setFotoBase64(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full"
                    title="Quitar foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur rounded text-[10px] font-mono text-emerald-400 font-bold">
                    Optimizada (&lt; 100 KB)
                  </span>
                </div>
              )}

              {/* Comentario breve */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Comentario breve (opcional)
                </label>
                <input
                  type="text"
                  value={comentarioFoto}
                  onChange={(e) => setComentarioFoto(e.target.value)}
                  placeholder="Ej: loseta nivelada, soldadura de cordón terminada..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Acciones del pie */}
            <div className="p-4 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFotoModal(false)}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!fotoBase64 || subiendoFoto}
                onClick={handleGuardarFoto}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition ${
                  !fotoBase64 || subiendoFoto
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                }`}
              >
                {subiendoFoto ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Guardar Foto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REPORTAR NUEVA TAREA DE TERRENO                */}
      {/* ======================================================== */}
      {showNuevaTareaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Nueva Tarea de Terreno
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Reportar Trabajo o Imprevisto
                </h3>
              </div>
              <button
                onClick={() => setShowNuevaTareaModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {/* Selector de Especialidad */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Especialidad de la tarea *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNuevaEsp('Civil')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition ${
                      nuevaEsp === 'Civil'
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-slate-850 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Obra Civil</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevaEsp('Soldador')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 transition ${
                      nuevaEsp === 'Soldador'
                        ? 'bg-amber-500 border-amber-400 text-slate-950'
                        : 'bg-slate-850 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Flame className="w-4 h-4" />
                    <span>Soldadura</span>
                  </button>
                </div>
              </div>

              {/* Descripción de la tarea */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ¿Qué trabajo o tarea se debe realizar? *
                </label>
                <textarea
                  rows={2}
                  value={nuevaTexto}
                  onChange={(e) => setNuevaTexto(e.target.value)}
                  placeholder="Ej: Reparación de baranda doblada en nivel 2, sector caldera..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Ubicación / Sector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Ubicación o Sector en Planta
                </label>
                <input
                  type="text"
                  value={nuevaUbicacion}
                  onChange={(e) => setNuevaUbicacion(e.target.value)}
                  placeholder="Ej: Área Evaporadores / Torre 2 / Nivel +12"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* N° Orden si lo tienen */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  N° de Orden SAP o Aviso (Opcional)
                </label>
                <input
                  type="text"
                  value={nuevaOrden}
                  onChange={(e) => setNuevaOrden(e.target.value)}
                  placeholder="Si lo sabes, colócalo aquí (sino se creará provisional)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Foto inicial */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Foto inicial del hallazgo (Opcional)
                </label>
                <input
                  ref={nuevaCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNuevaFotoSelect}
                  className="hidden"
                />

                {nuevaFotoInicial ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center">
                    <img src={nuevaFotoInicial} alt="Previa inicial" className="max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setNuevaFotoInicial(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => nuevaCameraInputRef.current?.click()}
                    className="w-full py-3 px-3 bg-slate-850 hover:bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition"
                  >
                    <Camera className="w-4 h-4 text-sky-400" />
                    <span>Sacar foto del trabajo con la cámara</span>
                  </button>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="p-4 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowNuevaTareaModal(false)}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!nuevaTexto.trim() || guardandoTarea}
                onClick={handleGuardarNuevaTarea}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition ${
                  !nuevaTexto.trim() || guardandoTarea
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30'
                }`}
              >
                {guardandoTarea ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Guardar Tarea</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: IDENTIFICARSE / CAMBIAR OPERARIO                */}
      {/* ======================================================== */}
      {showCambiarOperario && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-sky-400" />
                <h3 className="font-extrabold text-sm text-white">¿Quién está usando la app?</h3>
              </div>
              <button
                onClick={() => setShowCambiarOperario(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Escribe tu nombre o apodo:
                </label>
                <input
                  type="text"
                  value={nuevoNombreInput}
                  onChange={(e) => setNuevoNombreInput(e.target.value)}
                  placeholder="Ej: Marcelo Gómez..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {listaPersonal.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    O selecciona de la nómina de planta:
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {listaPersonal.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setOperarioNombre(p.nombre);
                          setShowCambiarOperario(false);
                          setNuevoNombreInput('');
                        }}
                        className="w-full text-left p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs transition"
                      >
                        <span className="font-bold text-slate-200">{p.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.especialidad}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowCambiarOperario(false)}
                className="flex-1 py-2.5 px-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  if (nuevoNombreInput.trim()) {
                    setOperarioNombre(nuevoNombreInput.trim());
                  }
                  setShowCambiarOperario(false);
                  setNuevoNombreInput('');
                }}
                className="flex-1 py-2.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold shadow"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ZOOM DE FOTO                                    */}
      {/* ======================================================== */}
      {previewFotoZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-2"
          onClick={() => setPreviewFotoZoom(null)}
        >
          <button
            onClick={() => setPreviewFotoZoom(null)}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewFotoZoom}
            alt="Ampliación"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: SELECCIONAR OTRA SEMANA                         */}
      {/* ======================================================== */}
      {showModalSemanas && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">Elegir Semana</h3>
                  <p className="text-[11px] text-slate-400">Ver tareas de semanas pasadas o futuras</p>
                </div>
              </div>
              <button
                onClick={() => setShowModalSemanas(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {semanasDisponibles.map((sem) => {
                const isSelected =
                  semanaSeleccionada?.semana === sem.semana &&
                  semanaSeleccionada?.anio === sem.anio;

                return (
                  <button
                    key={`${sem.anio}-${sem.semana}`}
                    type="button"
                    onClick={() => {
                      setSemanaSeleccionada({ semana: sem.semana, anio: sem.anio });
                      setShowModalSemanas(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-sky-950/80 border-sky-500 text-white ring-1 ring-sky-500'
                        : 'bg-slate-850 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-black text-sm flex items-center gap-1.5">
                        <span>{sem.label}</span>
                        {sem.esActual && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Semana Actual
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {sem.rangoFechas}
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-sky-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const actual = semanasDisponibles.find((s) => s.esActual) || semanasDisponibles[0];
                  if (actual) {
                    setSemanaSeleccionada({ semana: actual.semana, anio: actual.anio });
                  }
                  setShowModalSemanas(false);
                }}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Volver a la Semana Actual</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalOperarios;
