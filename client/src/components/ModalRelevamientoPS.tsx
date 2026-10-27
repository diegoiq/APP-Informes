import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  X,
  Camera,
  Upload,
  Calendar,
  Clock,
  Users,
  HardHat,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Maximize2
} from 'lucide-react';

interface ModalRelevamientoPSProps {
  isOpen: boolean;
  onClose: () => void;
  aviso: any;
  onSaved?: (result: any) => void;
}

const PARADAS_SEMANALES = [
  { id: 'PS43', label: 'PS43 - Semana 43 (2026)', semana: 43 },
  { id: 'PS44', label: 'PS44 - Semana 44 (2026)', semana: 44 },
  { id: 'PS45', label: 'PS45 - Semana 45 (2026)', semana: 45 },
  { id: 'PS46', label: 'PS46 - Semana 46 (2026)', semana: 46 },
  { id: 'PS47', label: 'PS47 - Semana 47 (2026)', semana: 47 },
  { id: 'PS48', label: 'PS48 - Semana 48 (2026)', semana: 48 },
  { id: 'PS49', label: 'PS49 - Semana 49 (2026)', semana: 49 },
  { id: 'PS50', label: 'PS50 - Semana 50 (2026)', semana: 50 },
  { id: 'PS51', label: 'PS51 - Semana 51 (2026)', semana: 51 },
  { id: 'PS52', label: 'PS52 - Semana 52 (2026)', semana: 52 },
];

const DIAS_ARAUCO = [
  { key: 'mi', label: 'Miércoles (Día 1)' },
  { key: 'ju', label: 'Jueves (Día 2)' },
  { key: 'vi', label: 'Viernes (Día 3)' },
  { key: 'sa', label: 'Sábado (Día 4)' },
  { key: 'dom', label: 'Domingo (Día 5)' },
  { key: 'lu', label: 'Lunes (Día 6)' },
  { key: 'ma', label: 'Martes (Día 7)' },
];

export const ModalRelevamientoPS: React.FC<ModalRelevamientoPSProps> = ({
  isOpen,
  onClose,
  aviso,
  onSaved
}) => {
  const [comentarios, setComentarios] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [horasEstimadas, setHorasEstimadas] = useState<number>(4);
  const [operarios, setOperarios] = useState<number>(2);
  const [revisionPs, setRevisionPs] = useState('PS43');
  const [customRevision, setCustomRevision] = useState('');
  const [diaSemana, setDiaSemana] = useState('mi');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Inicializar con datos del aviso al abrir
  useEffect(() => {
    if (isOpen && aviso) {
      setComentarios(aviso.comentariosTerreno || aviso.notasCampo || '');
      setHorasEstimadas(
        aviso.hhEstimadasTerreno && aviso.personasEstimadas
          ? Number((aviso.hhEstimadasTerreno / aviso.personasEstimadas).toFixed(1))
          : 4
      );
      setOperarios(aviso.personasEstimadas || 2);
      
      const rev = aviso.revisionPs || aviso.revision || 'PS43';
      const existsInList = PARADAS_SEMANALES.some((p) => p.id === rev);
      if (existsInList) {
        setRevisionPs(rev);
        setCustomRevision('');
      } else {
        setRevisionPs('OTRA');
        setCustomRevision(rev);
      }

      // Parsear fotos existentes si están en formato JSON o string
      if (aviso.fotosInspeccion) {
        try {
          const parsed = JSON.parse(aviso.fotosInspeccion);
          if (Array.isArray(parsed)) setFotos(parsed);
          else if (typeof parsed === 'string') setFotos([parsed]);
        } catch {
          setFotos([aviso.fotosInspeccion]);
        }
      } else {
        setFotos([]);
      }

      setError(null);
      setSuccess(null);
    }
  }, [isOpen, aviso]);

  if (!isOpen || !aviso) return null;

  // Cálculo en tiempo real de Horas Hombre
  const totalHH = Number((horasEstimadas * operarios).toFixed(1));

  // Manejo de carga de archivos de imagen a Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert('Solo se admiten archivos de imagen (.jpg, .png, .webp).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setFotos((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const selectedRevision = revisionPs === 'OTRA' ? (customRevision.trim() || 'PS43') : revisionPs;

      const res = await api.guardarRelevamiento(aviso.id, {
        comentariosTerreno: comentarios,
        fotosInspeccion: fotos,
        horasEstimadas,
        personasEstimadas: operarios,
        revisionPs: selectedRevision,
        diaSemana
      });

      setSuccess(`Relevamiento guardado. Demanda de ${totalHH} HH impactada en ${selectedRevision}.`);
      if (onSaved) onSaved(res);

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error al guardar relevamiento:', err);
      setError(err.message || 'Error al guardar relevamiento en el servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs text-sky-400 font-bold uppercase tracking-wider mb-1">
              <HardHat className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Relevamiento de Campo & Movilización a PS</span>
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px]">
                340CRR
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight break-words">
              Aviso SAP #{aviso.numeroAviso}
              {aviso.numeroOrden && (
                <span className="text-slate-400 font-semibold text-sm ml-2">
                  (Orden: <strong className="text-sky-300">{aviso.numeroOrden}</strong>)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              {aviso.descripcion}
            </p>
            {aviso.ubicacionTecnica && (
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                📍 Ubicación: <span className="text-slate-200 font-medium">{aviso.ubicacionTecnica}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones de Éxito o Error */}
        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}

        {success && (
          <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="break-words">{success}</span>
          </div>
        )}

        {/* Formulario con Scroll */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* SECCIÓN A: Notas de Campo e Inspección Inicial */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                📝 Notas de Campo & Hallazgos Técnicos (Protegido)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                No sobreescribible por SAP
              </span>
            </div>
            <textarea
              rows={3}
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Describa el relevamiento en terreno: interferencias detectadas, requerimientos de andamios, pérdida de espesor, condiciones de seguridad, accesibilidad..."
              className="w-full p-3 border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50"
            />

            {/* Carga de Fotos de Inspección Inicial */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-sky-600" />
                  <span>Fotos de Inspección Inicial ({fotos.length})</span>
                </span>
                <span className="text-[11px] text-slate-400">JPG, PNG o WEBP</span>
              </div>

              {/* Botón Drag & Drop / Selección de Fotos */}
              <label className="border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50/70 p-4 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="p-2 bg-sky-600 text-white rounded-lg shadow-sm">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-sky-700 hover:underline">
                    Subir fotos de inspección
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Haga clic o arrastre las imágenes del relevamiento
                  </p>
                </div>
              </label>

              {/* Galería de Thumbnails */}
              {fotos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                  {fotos.map((src, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-sm"
                    >
                      <img
                        src={src}
                        alt={`Inspección ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto(src)}
                          className="p-1 bg-white/90 text-slate-800 rounded-md hover:bg-white transition"
                          title="Ampliar foto"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-slate-900/80 text-[9px] font-bold text-white rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN B: Estimación de Recursos y Cálculo Dinámico de HH */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Estimación de Recursos Técnicos</span>
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                Cálculo Automático
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Horas Estimadas */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Horas estimadas de ejecución (por persona)
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0.5"
                    max="100"
                    step="0.5"
                    value={horasEstimadas}
                    onChange={(e) => setHorasEstimadas(Math.max(0.5, Number(e.target.value)))}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>
              </div>

              {/* Cantidad de Operarios */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Cantidad de operarios (dotación)
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={operarios}
                    onChange={(e) => setOperarios(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Display de Cálculo Dinámico de HH */}
            <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-xl p-3.5 flex items-center justify-between shadow-md">
              <div>
                <div className="text-[10px] text-sky-300 uppercase tracking-wider font-bold">
                  Total Horas Hombre (HH) Estimadas
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {horasEstimadas} hs × {operarios} operario{operarios > 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-400 tracking-tight">
                  {totalHH}
                </span>
                <span className="text-xs font-bold text-slate-300 ml-1">HH</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN C: Selector de Parada Semanal (revision_ps) y Asignación de Día */}
          <div className="bg-sky-50/50 rounded-xl p-4 border border-sky-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>Movilización a Parada Semanal (PS)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Selector de Parada */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Parada Semanal (Revisión PS)
                </label>
                <select
                  value={revisionPs}
                  onChange={(e) => setRevisionPs(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  {PARADAS_SEMANALES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                  <option value="OTRA">Otra revisión personalizada...</option>
                </select>
              </div>

              {/* Selector de Día Arauco */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Día de Carga (Ciclo Oficial Arauco)
                </label>
                <select
                  value={diaSemana}
                  onChange={(e) => setDiaSemana(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                >
                  {DIAS_ARAUCO.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input para revisión personalizada si seleccionó 'OTRA' */}
            {revisionPs === 'OTRA' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Escriba el código de revisión (ej. PS432026, PS53, etc.)
                </label>
                <input
                  type="text"
                  value={customRevision}
                  onChange={(e) => setCustomRevision(e.target.value.toUpperCase())}
                  placeholder="Ej: PS432026"
                  className="w-full px-3 py-2 border border-sky-400 rounded-lg text-xs font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>
            )}

            {/* Alert Informativo sobre Impacto en el Tablero */}
            <div className="bg-sky-100/70 border border-sky-200 rounded-lg p-2.5 text-[11px] text-sky-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <span>
                Al confirmar, se actualizará el aviso y se impactará de inmediato la demanda de{' '}
                <strong className="text-sky-950 font-bold">{totalHH} HH</strong> en el Tablero de Programación
                Semanal, actualizando el semáforo de capacidad de la dotación.
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Impactando en Programa Semanal...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar y Movilizar a {revisionPs === 'OTRA' ? (customRevision || 'PS') : revisionPs} ({totalHH} HH)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal para ampliar foto */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewPhoto}
              alt="Inspección ampliada"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white text-slate-800 rounded-full shadow-lg hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalRelevamientoPS;
