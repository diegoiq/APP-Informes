import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Filter,
  AlertTriangle,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle,
  Copy,
  ChevronRight,
  Send,
  Plus
} from 'lucide-react';
import { PRIORIDADES_REALES } from '@app-informes/shared';

export const TriajeOperativo: React.FC = () => {
  const [avisos, setAvisos] = useState<any[]>([]);
  const [selectedAviso, setSelectedAviso] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal registrar contacto
  const [showContactModal, setShowContactModal] = useState(false);
  const [canal, setCanal] = useState<'Correo' | 'Llamada' | 'Presencial'>('Correo');
  const [solicitante, setSolicitante] = useState('');
  const [resumen, setResumen] = useState('');
  const [acuerdosTomados, setAcuerdosTomados] = useState('');

  // Modal plantilla respuesta correo
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [plantillaTexto, setPlantillaTexto] = useState('');
  const [copied, setCopied] = useState(false);

  const loadAvisos = async () => {
    setLoading(true);
    try {
      const data = await api.getAvisos();
      setAvisos(data);
      if (data.length > 0 && !selectedAviso) {
        setSelectedAviso(data[0]);
      } else if (selectedAviso) {
        const updated = data.find((a: any) => a.id === selectedAviso.id);
        if (updated) setSelectedAviso(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvisos();
  }, []);

  const handleUpdatePrioridad = async (prioridadId: number) => {
    if (!selectedAviso) return;
    try {
      await api.updateAvisoField(selectedAviso.id, {
        prioridadRealAcordada: prioridadId
      });
      await loadAvisos();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar prioridad');
    }
  };

  const handleRegistrarContacto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAviso) return;
    try {
      await api.registrarContactoTriaje(selectedAviso.id, {
        canal,
        solicitante: solicitante || selectedAviso.autor || 'Solicitante Planta',
        resumen,
        acuerdosTomados
      });
      setShowContactModal(false);
      setResumen('');
      setAcuerdosTomados('');
      await loadAvisos();
    } catch (err: any) {
      alert(err.message || 'Error al registrar contacto');
    }
  };

  const handleGenerarPlantilla = async () => {
    if (!selectedAviso) return;
    try {
      const res = await api.getPlantillaRespuesta(selectedAviso.id);
      setPlantillaTexto(res.plantilla);
      setShowTemplateModal(true);
      setCopied(false);
    } catch (err: any) {
      alert(err.message || 'Error al generar plantilla');
    }
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(plantillaTexto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider">
          <Filter className="w-4 h-4" />
          <span>Triaje Operativo & Gestión de Prioridad Real</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
          Nivelación de Requerimientos vs. Inflación SAP
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Acuerdos formales con el solicitante, gestión de insistencias por correo y priorización real técnica.
        </p>
      </div>

      {/* Grid Principal: Lista a la izquierda, Detalle y Triaje a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Lista de Avisos */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs uppercase">Avisos Pendientes de Triaje</span>
            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-xs">
              {avisos.length} avisos
            </span>
          </div>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {avisos.map((aviso) => {
              const isSelected = selectedAviso?.id === aviso.id;
              return (
                <div
                  key={aviso.id}
                  onClick={() => setSelectedAviso(aviso)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-50/80 border-sky-400 shadow-md ring-1 ring-sky-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-sm text-slate-900">
                      Aviso {aviso.numeroAviso}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      SAP: {aviso.prioridadSap || 'Media'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                    {aviso.descripcion}
                  </p>
                  
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-500">{aviso.rubro || 'General'}</span>
                    
                    {/* Badge de Insistencias */}
                    <div className="flex items-center gap-1.5">
                      {aviso.contadorInsistencias > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-extrabold text-[10px] flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{aviso.contadorInsistencias} reiteraciones</span>
                        </span>
                      )}

                      {aviso.prioridadRealAcordada ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          aviso.prioridadRealAcordada === 1 ? 'bg-red-500 text-white' :
                          aviso.prioridadRealAcordada === 2 ? 'bg-amber-500 text-white' :
                          aviso.prioridadRealAcordada === 3 ? 'bg-sky-500 text-white' : 'bg-slate-400 text-white'
                        }`}>
                          Real: P{aviso.prioridadRealAcordada}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold text-[10px]">Sin acordar</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Detalle de Triaje y Acuerdos */}
        {selectedAviso ? (
          <div className="lg:col-span-7 space-y-5">
            
            {/* Tarjeta de Matriz de Prioridad Real */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-sky-600">Gestión de Aviso #{selectedAviso.numeroAviso}</div>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">{selectedAviso.descripcion}</h2>
                  <div className="text-xs text-slate-400 mt-1">
                    Solicitante: <strong className="text-slate-700">{selectedAviso.autor || 'N/A'}</strong> | Ubicación: <strong className="text-slate-700">{selectedAviso.ubicacionTecnica}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerarPlantilla}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-sm transition"
                  >
                    <Mail className="w-4 h-4 text-sky-400" />
                    <span>Plantilla Respuesta Email</span>
                  </button>
                </div>
              </div>

              {/* Selector de Prioridad Real Acordada */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  Prioridad Real Acordada Técnicamente
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRIORIDADES_REALES.map((p) => {
                    const isSelected = selectedAviso.prioridadRealAcordada === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleUpdatePrioridad(p.id)}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-300 font-bold text-sky-950'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-extrabold">{p.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Ventana máx: {p.maxDiasRespuesta} días
                          </div>
                        </div>
                        {isSelected && <CheckCircle className="w-4 h-4 text-sky-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contador de Insistencias */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Contador de Reiteraciones / Correos</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Insistencias registradas para este aviso desde el área solicitante
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {selectedAviso.contadorInsistencias}
                  </span>
                  <button
                    onClick={() => {
                      setCanal('Correo');
                      setShowContactModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition"
                    title="Añadir insistencia o contacto"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

            {/* Historial de Contacto con Solicitante */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-700" />
                  <h3 className="font-extrabold text-sm text-slate-900">Historial de Contacto y Acuerdos</h3>
                </div>
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-300 text-sky-700 hover:bg-sky-100 text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Contacto</span>
                </button>
              </div>

              <div className="space-y-3">
                {(!selectedAviso.contactosTriaje || selectedAviso.contactosTriaje.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                    No se han registrado llamadas o correos con el solicitante para este aviso.
                  </div>
                ) : (
                  selectedAviso.contactosTriaje.map((c: any) => (
                    <div key={c.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                          {c.canal}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {new Date(c.fecha).toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className="text-slate-800 font-medium">{c.resumen}</div>
                      <div className="p-2 rounded bg-white border border-slate-100 text-slate-600 text-[11px]">
                        <strong>Acuerdo:</strong> {c.acuerdosTomados}
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">
                        Registrado por: {c.registradoPor}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            Selecciona un aviso para gestionar su prioridad real y acuerdos.
          </div>
        )}

      </div>

      {/* Modal Registrar Contacto */}
      {showContactModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">
              Registrar Gestión de Contacto con Solicitante
            </h3>
            <form onSubmit={handleRegistrarContacto} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Canal de Contacto</label>
                <select
                  value={canal}
                  onChange={(e: any) => setCanal(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-semibold"
                >
                  <option value="Correo">Correo Electrónico (Incrementa Insistencias)</option>
                  <option value="Llamada">Llamada Telefónica</option>
                  <option value="Presencial">Reunión Presencial en Terreno</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Solicitante / Contraparte</label>
                <input
                  type="text"
                  required
                  value={solicitante}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSolicitante(e.target.value)}
                  placeholder={selectedAviso?.autor || 'Ej: Juan Pérez (Jefe Área)'}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Resumen de la Conversación</label>
                <textarea
                  required
                  rows={2}
                  value={resumen}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResumen(e.target.value)}
                  placeholder="Se aclara que la corrosión no presenta fuga inminente y se programa..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Acuerdos Tomados / Compromiso de Fecha</label>
                <textarea
                  required
                  rows={2}
                  value={acuerdosTomados}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAcuerdosTomados(e.target.value)}
                  placeholder="Solicitante acepta intervención durante la parada de la próxima semana..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow"
                >
                  Guardar Contacto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Plantilla Respuesta Correo */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-base text-slate-900">
                Plantilla Estandarizada de Respuesta al Solicitante
              </h3>
              <button
                onClick={handleCopyClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <textarea
              readOnly
              rows={12}
              value={plantillaTexto}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 leading-relaxed focus:outline-none"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
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

export default TriajeOperativo;
