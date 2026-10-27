import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import SignatureCanvas from 'react-signature-canvas';
import {
  BookOpen,
  Calendar,
  CloudRain,
  ShieldAlert,
  Camera,
  PenTool,
  CheckCircle2,
  Plus,
  Send,
  Eye,
  ExternalLink,
  Layers,
  X
} from 'lucide-react';
import { CLIMA_CONDICIONES, INTERFERENCIAS_TIPOS } from '@app-informes/shared';

export const LibroDiarioObra: React.FC = () => {
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState<any | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal nueva entrada de libro diario
  const [showModal, setShowModal] = useState(false);
  const [clima, setClima] = useState<string>(CLIMA_CONDICIONES[0]);
  const [interferenciasSeleccionadas, setInterferenciasSeleccionadas] = useState<string[]>([]);
  const [descripcionJornada, setDescripcionJornada] = useState('');
  const [observacionesSeguridad, setObservacionesSeguridad] = useState('');
  const [emailCliente, setEmailCliente] = useState('');

  // Fotos Antes, Durante, Después
  const [fotoAntes, setFotoAntes] = useState<string>('');
  const [fotoDurante, setFotoDurante] = useState<string>('');
  const [fotoDespues, setFotoDespues] = useState<string>('');

  // Signature Canvas Ref
  const sigCanvas = useRef<SignatureCanvas | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const dataObras = await api.getObras();
      setObras(dataObras);
      if (dataObras.length > 0 && !selectedObra) {
        setSelectedObra(dataObras[0]);
        const dataEntries = await api.getLibroDiario(dataObras[0].id);
        setEntries(dataEntries);
      } else if (selectedObra) {
        const dataEntries = await api.getLibroDiario(selectedObra.id);
        setEntries(dataEntries);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectObra = async (obra: any) => {
    setSelectedObra(obra);
    try {
      const dataEntries = await api.getLibroDiario(obra.id);
      setEntries(dataEntries);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleInterferencia = (item: string) => {
    setInterferenciasSeleccionadas((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, etapa: 'Antes' | 'Durante' | 'Después') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (etapa === 'Antes') setFotoAntes(result);
      if (etapa === 'Durante') setFotoDurante(result);
      if (etapa === 'Después') setFotoDespues(result);
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarLibroDiario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObra) return;

    // Obtener firma digital en formato Data URL PNG
    let firmaSupervisorUrl = '';
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      firmaSupervisorUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    }

    const fotos = [];
    if (fotoAntes) fotos.push({ etapa: 'Antes', url: fotoAntes, diagnosticoPie: 'Condición inicial observada' });
    if (fotoDurante) fotos.push({ etapa: 'Durante', url: fotoDurante, diagnosticoPie: 'Proceso de arenado y aplicación' });
    if (fotoDespues) fotos.push({ etapa: 'Después', url: fotoDespues, diagnosticoPie: 'Condición final conforme' });

    try {
      await api.createLibroDiario(selectedObra.id, {
        fecha: new Date().toISOString(),
        condicionClimatica: clima,
        interferencias: interferenciasSeleccionadas,
        descripcionJornada,
        observacionesSeguridad,
        firmaSupervisorUrl,
        emailClienteNotificado: emailCliente,
        fotos
      });

      setShowModal(false);
      setDescripcionJornada('');
      setObservacionesSeguridad('');
      setFotoAntes('');
      setFotoDurante('');
      setFotoDespues('');
      sigCanvas.current?.clear();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al guardar libro diario');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider flex-wrap">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="break-words">Obras Planificadas & Libro Diario Digital</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5 break-words">
            Bitácora Inmutable de Obra & Evidencias
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cronograma interactivo, condiciones climáticas, interferencias tipificadas y firmas digitales.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-950/20 transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Entrada de Libro Diario</span>
        </button>
      </div>

      {/* Selector de Obras y Cronograma Gantt */}
      <div className="space-y-4">
        <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
          Obras y Paradas en Ejecución (Seguimiento Programado vs Real)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map((obra) => {
            const isSelected = selectedObra?.id === obra.id;
            return (
              <div
                key={obra.id}
                onClick={() => handleSelectObra(obra)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-sky-50/70 border-sky-400 ring-2 ring-sky-300 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                    {obra.codigo}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {obra.estado}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{obra.nombre}</h3>
                <p className="text-xs text-slate-500 mt-1">{obra.ubicacion}</p>

                {/* Barra de Progreso Gantt Programado vs Real */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-slate-500">Avance Programado</span>
                      <span className="text-slate-700">{obra.avanceProgramado}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full" style={{ width: `${obra.avanceProgramado}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-emerald-700 font-bold">Avance Real</span>
                      <span className="text-emerald-700 font-bold">{obra.avanceReal}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${obra.avanceReal}%` }}></div>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Historial de Bitácoras del Libro Diario */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Libro Diario Digital: {selectedObra?.nombre}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Registros inmutables con firma digital del supervisor y validación del cliente
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
            {entries.length} jornadas registradas
          </span>
        </div>

        <div className="space-y-6">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No hay entradas de libro diario registradas para esta obra. Utiliza el botón "Nueva Entrada" para iniciar la bitácora.
            </div>
          ) : (
            entries.map((entry) => {
              const interferencias = Array.isArray(entry.interferencias)
                ? entry.interferencias
                : entry.interferencias
                ? JSON.parse(entry.interferencias)
                : [];

              return (
                <div
                  key={entry.id}
                  className="bg-slate-50/80 rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-slate-900 text-white font-extrabold text-xs rounded-lg">
                        {new Date(entry.fecha).toLocaleDateString('es-CL', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                        Clima: {entry.condicionClimatica}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {entry.validadoCliente ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Validado por Inspección de Planta</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold border border-amber-300">
                          Pendiente Firma Cliente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Descripción de la Jornada */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">
                      Descripción de Trabajos Ejecutados
                    </h4>
                    <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                      {entry.descripcionJornada}
                    </p>
                  </div>

                  {/* Interferencias Tipificadas */}
                  {interferencias.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">
                        Interferencias Operacionales Reportadas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {interferencias.map((item: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-md bg-red-100 text-red-800 border border-red-200 text-xs font-bold flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>{item}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grilla Fotográfica Antes / Durante / Después */}
                  {entry.fotos && entry.fotos.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                        Registro Fotográfico de Campo
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {entry.fotos.map((f: any) => (
                          <div key={f.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                            <img src={f.url} alt={f.etapa} className="w-full h-36 object-cover" />
                            <div className="p-2 text-xs">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                f.etapa === 'Antes' ? 'bg-red-100 text-red-700' :
                                f.etapa === 'Durante' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {f.etapa}
                              </span>
                              <p className="text-[11px] text-slate-600 mt-1">{f.diagnosticoPie}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Firma Digital del Supervisor */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Supervisor Responsable: </span>
                      <strong className="text-slate-800">{entry.supervisor?.nombre}</strong>
                    </div>
                    {entry.firmaSupervisorUrl && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px]">Firma Digital:</span>
                        <img src={entry.firmaSupervisorUrl} alt="Firma" className="h-8 border border-slate-300 rounded bg-white px-2" />
                      </div>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Nueva Entrada */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera Fija */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Libro Diario Digital de Obra</span>
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Registrar Jornada en Libro Diario
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Obra: <strong className="text-slate-200">{selectedObra?.nombre}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0 cursor-pointer"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario con Scroll Interno */}
            <form onSubmit={handleGuardarLibroDiario} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Condición Climática</label>
                  <select
                    value={clima}
                    onChange={(e) => setClima(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold bg-white"
                  >
                    {CLIMA_CONDICIONES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Interferencias Tipificadas en el Frente
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {INTERFERENCIAS_TIPOS.map((item) => (
                      <label key={item} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={interferenciasSeleccionadas.includes(item)}
                          onChange={() => handleToggleInterferencia(item)}
                          className="rounded text-sky-600 h-4 w-4"
                        />
                        <span className="text-[11px] font-medium text-slate-700">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Descripción Detallada de la Jornada
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={descripcionJornada}
                    onChange={(e) => setDescripcionJornada(e.target.value)}
                    placeholder="Se culminó preparación Sa 2½ en 32 m² y se aplicó primera capa epóxica..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Observaciones de Seguridad & Medio Ambiente (HSE)
                  </label>
                  <textarea
                    rows={2}
                    value={observacionesSeguridad}
                    onChange={(e) => setObservacionesSeguridad(e.target.value)}
                    placeholder="Inspección de andamios con tarjeta verde y revisión de línea de vida..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Carga Fotográfica Antes / Durante / Después */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Registro Fotográfico (Antes, Durante y Después)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="border border-slate-300 rounded-xl p-2 text-center bg-slate-50">
                      <span className="text-[10px] font-extrabold text-red-700 block mb-1">ANTES</span>
                      {fotoAntes ? (
                        <img src={fotoAntes} alt="Antes" className="w-full h-20 object-cover rounded mb-1" />
                      ) : (
                        <div className="w-full h-20 bg-slate-200 rounded flex items-center justify-center text-slate-400 mb-1">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'Antes')}
                        className="text-[10px] w-full"
                      />
                    </div>

                    <div className="border border-slate-300 rounded-xl p-2 text-center bg-slate-50">
                      <span className="text-[10px] font-extrabold text-amber-700 block mb-1">DURANTE</span>
                      {fotoDurante ? (
                        <img src={fotoDurante} alt="Durante" className="w-full h-20 object-cover rounded mb-1" />
                      ) : (
                        <div className="w-full h-20 bg-slate-200 rounded flex items-center justify-center text-slate-400 mb-1">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'Durante')}
                        className="text-[10px] w-full"
                      />
                    </div>

                    <div className="border border-slate-300 rounded-xl p-2 text-center bg-slate-50">
                      <span className="text-[10px] font-extrabold text-emerald-700 block mb-1">DESPUÉS</span>
                      {fotoDespues ? (
                        <img src={fotoDespues} alt="Después" className="w-full h-20 object-cover rounded mb-1" />
                      ) : (
                        <div className="w-full h-20 bg-slate-200 rounded flex items-center justify-center text-slate-400 mb-1">
                          <Camera className="w-5 h-5" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'Después')}
                        className="text-[10px] w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Firma Táctil del Supervisor */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Lienzo de Firma Digital (Supervisor)</label>
                    <button
                      type="button"
                      onClick={() => sigCanvas.current?.clear()}
                      className="text-xs text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
                    >
                      Limpiar Trazo
                    </button>
                  </div>
                  <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white">
                    <SignatureCanvas
                      ref={sigCanvas}
                      canvasProps={{
                        className: 'w-full h-28 bg-white cursor-crosshair'
                      }}
                    />
                  </div>
                </div>

              </div>

              {/* Pie Fijo con Botones de Acción */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar y Asentar en Libro Diario</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default LibroDiarioObra;
