import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import SignatureCanvas from 'react-signature-canvas';
import {
  FileText,
  Plus,
  Printer,
  ExternalLink,
  Shield,
  Layers,
  CheckCircle,
  Camera,
  PenTool,
  Clock,
  Sparkles,
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  Eye,
  MapPin,
  Target,
  Paperclip,
  ChevronRight,
  ChevronLeft,
  Building,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Pencil,
  Save
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const InformesCRR: React.FC = () => {
  const { user } = useAuth();
  const [informes, setInformes] = useState<any[]>([]);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selección y borrado selectivo de informes
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Nuevo / Editar Informe & Pestaña Activa
  const [showModal, setShowModal] = useState(false);
  const [editingInformeId, setEditingInformeId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [vistaPreviaDoc, setVistaPreviaDoc] = useState(false);

  // Campos del Modelo Oficial (IM- CRR Modelo.docx)
  const [tipoInforme, setTipoInforme] = useState('INFORME PRELIMINAR');
  const [codigoInforme, setCodigoInforme] = useState('');
  const [titulo, setTitulo] = useState('REPARACIÓN Y TRATAMIENTO ANTICORROSIVO ESTRUCTURAL');
  const [empresaContratista, setEmpresaContratista] = useState('A DEFINIR');
  const [observaciones, setObservaciones] = useState('Relevamiento técnico inicial para tratamiento anticorrosivo.');
  const [fechaElaboracion, setFechaElaboracion] = useState(new Date().toISOString().split('T')[0]);
  const [distribucion, setDistribucion] = useState('Inspección Técnica Arauco / Operaciones 340CRR');
  const [copiaAsignada, setCopiaAsignada] = useState('Inspección Técnica Arauco');
  const [avisoSeleccionado, setAvisoSeleccionado] = useState<any | null>(null);
  const [avisoNumeroManual, setAvisoNumeroManual] = useState('');
  const [ordenNumeroManual, setOrdenNumeroManual] = useState('');
  const [ubicacionTecnicaManual, setUbicacionTecnicaManual] = useState('');

  // Sección 1: OBJETIVO
  const [objetivo, setObjetivo] = useState(
    'Describir el objetivo de la obra o relevamiento: Tratamiento anticorrosivo integral y mitigación de condiciones subestándares en soportes y estructuras metálicas.'
  );

  // Sección 2: LUGAR DE LA OBRA
  const [lugarObraTexto, setLugarObraTexto] = useState(
    'Captura de imagen de la zona de la obra o descripción: Planta Industrial Celulosa Puerto Esperanza, sector de estructuras y pasarelas 340CRR.'
  );
  const [lugarObraFotoUrl, setLugarObraFotoUrl] = useState('');

  // Sección 3: FOTOS Y COMENTARIOS
  const [fotosList, setFotosList] = useState<any[]>([]);
  const [tempFotoUrl, setTempFotoUrl] = useState('');
  const [tempDiagnostico, setTempDiagnostico] = useState('');
  const [tempPie, setTempPie] = useState('');

  // Sección 4: ANEXOS
  const [anexosTexto, setAnexosTexto] = useState('Agregar planos o elementos que complementen al informe.');
  const [anexosFotosList, setAnexosFotosList] = useState<string[]>([]);

  // Sección 5: FIRMAS
  const sigCanvasElaboro = useRef<SignatureCanvas | null>(null);
  const [existingFirmaUrl, setExistingFirmaUrl] = useState<string>('');
  const [nombrePreparador, setNombrePreparador] = useState(user?.nombre || 'DAC.');
  const [submitting, setSubmitting] = useState(false);

  // Cargar datos iniciales
  const loadData = async () => {
    setLoading(true);
    try {
      const [infData, avData] = await Promise.all([
        api.getInformes(),
        api.getAvisos({ solo340CRR: 'true' })
      ]);
      setInformes(infData);
      setAvisos(avData);
      if (avData.length > 0 && !avisoSeleccionado) {
        setAvisoSeleccionado(avData[0]);
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

  const toggleSelectInforme = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === informes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(informes.map((inf) => inf.id));
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteIds || confirmDeleteIds.length === 0) return;
    setDeleting(true);
    try {
      if (confirmDeleteIds.length === 1) {
        await api.deleteInforme(confirmDeleteIds[0]);
      } else {
        await api.deleteInformesBatch(confirmDeleteIds);
      }
      setSelectedIds((prev) => prev.filter((id) => !confirmDeleteIds.includes(id)));
      setConfirmDeleteIds(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar informes');
    } finally {
      setDeleting(false);
    }
  };

  const handleAvisoChange = (avisoId: string) => {
    const found = avisos.find((a) => a.id === avisoId);
    if (found) {
      setAvisoSeleccionado(found);
      setTitulo(`Informe Técnico - Aviso ${found.numeroAviso}: ${found.descripcion.substring(0, 40)}`);
      if (found.ubicacionTecnica) {
        setLugarObraTexto(`Ubicación técnica: ${found.ubicacionTecnica} - ${found.descripcion}`);
      }
    }
  };

  // Manejo de carga de foto del Lugar de la Obra (Cámara o Galería)
  const handleLugarObraUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setLugarObraFotoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Manejo de carga de foto para Fotos y Comentarios (Cámara o Galería)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempFotoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Agregar foto a la lista (sin duplicados por URL)
  const handleAddFoto = () => {
    if (!tempFotoUrl) {
      alert('Por favor captura o sube una imagen');
      return;
    }
    setFotosList((prev) => {
      if (prev.some((f) => f.url === tempFotoUrl)) {
        return prev;
      }
      return [
        ...prev,
        {
          etapa: 'Comentario',
          url: tempFotoUrl,
          diagnosticoTecnico: tempDiagnostico || 'Comentario / Registro en terreno',
          pieDeFoto: tempPie || 'Frente de trabajo 340CRR'
        }
      ];
    });
    setTempFotoUrl('');
    setTempDiagnostico('');
    setTempPie('');
  };

  const handleRemoveFoto = (index: number) => {
    setFotosList((prev) => prev.filter((_, i) => i !== index));
  };

  // Manejo de fotos de Anexos
  const handleAnexoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setAnexosFotosList((prev) => (prev.includes(base64) ? prev : [...prev, base64]));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAnexo = (index: number) => {
    setAnexosFotosList((prev) => prev.filter((_, i) => i !== index));
  };

  // Abrir instancia de edición de un informe existente sin perder datos en Render
  const handleOpenEditInforme = (inf: any) => {
    setEditingInformeId(inf.id);
    setTipoInforme(inf.tipoInforme || 'INFORME PRELIMINAR');
    setCodigoInforme(inf.codigoInforme || '');
    setTitulo(inf.titulo || 'INFORME TÉCNICO CRR');
    setEmpresaContratista(inf.empresaContratista || 'A DEFINIR');
    setObservaciones(inf.observaciones || '');
    setFechaElaboracion(
      inf.fechaElaboracion
        ? new Date(inf.fechaElaboracion).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
    setDistribucion(inf.distribucion || 'Inspección Técnica Arauco / Operaciones 340CRR');
    setCopiaAsignada(inf.copiaAsignada || 'Inspección Técnica Arauco');
    setAvisoNumeroManual(inf.avisoNumero || '');
    setOrdenNumeroManual(inf.ordenNumero || '');
    setUbicacionTecnicaManual(inf.ubicacionTecnica || '');

    const matchingAviso = avisos.find((a) => a.numeroAviso === inf.avisoNumero);
    setAvisoSeleccionado(matchingAviso || null);

    setObjetivo(inf.objetivo || '');
    setLugarObraTexto(inf.lugarObraTexto || '');
    setLugarObraFotoUrl(inf.lugarObraFotoUrl || '');

    // Deduplicar fotos por URL al cargar en el editor
    const seenUrls = new Set<string>();
    const uniqueFotos: any[] = [];
    for (const f of inf.fotos || []) {
      const url = String(f.url || '').trim();
      if (!url || seenUrls.has(url)) continue;
      seenUrls.add(url);
      uniqueFotos.push({
        etapa: 'Comentario',
        url,
        diagnosticoTecnico: f.diagnosticoTecnico || '',
        pieDeFoto: f.pieDeFoto || ''
      });
    }
    setFotosList(uniqueFotos);

    setAnexosTexto(inf.anexosTexto || '');
    let parsedAnexos: string[] = [];
    if (inf.anexosFotos) {
      try {
        const parsed = JSON.parse(inf.anexosFotos);
        if (Array.isArray(parsed)) parsedAnexos = parsed;
      } catch {
        parsedAnexos = [];
      }
    }
    setAnexosFotosList(parsedAnexos);
    setExistingFirmaUrl(inf.firmaElaboroUrl || '');
    setActiveStep(1);
    setVistaPreviaDoc(false);
    setShowModal(true);
  };

  // Guardar informe formal (Crear nuevo o Actualizar existente en edición)
  const handleCrearInforme = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let firmaElaboroUrl = existingFirmaUrl;
    if (sigCanvasElaboro.current && !sigCanvasElaboro.current.isEmpty()) {
      firmaElaboroUrl = sigCanvasElaboro.current.getTrimmedCanvas().toDataURL('image/png');
    }

    // Deduplicar fotos antes de enviar
    const seenUrls = new Set<string>();
    const uniqueFotos = fotosList.filter((f) => {
      const u = String(f.url || '').trim();
      if (!u || seenUrls.has(u)) return false;
      seenUrls.add(u);
      return true;
    });

    const payload = {
      codigoInforme: codigoInforme.trim() || undefined,
      tipoInforme,
      titulo: titulo || 'INFORME TÉCNICO CRR',
      empresaContratista: empresaContratista || 'A DEFINIR',
      observaciones,
      distribucion,
      copiaAsignada,
      avisoNumero: avisoSeleccionado?.numeroAviso || avisoNumeroManual || undefined,
      ordenNumero: avisoSeleccionado?.numeroOrden || ordenNumeroManual || undefined,
      ubicacionTecnica: avisoSeleccionado?.ubicacionTecnica || ubicacionTecnicaManual || undefined,
      objetivo,
      lugarObraTexto,
      lugarObraFotoUrl: lugarObraFotoUrl || '',
      anexosTexto,
      anexosFotos: anexosFotosList.length > 0 ? JSON.stringify(anexosFotosList) : '',
      firmaElaboroUrl: firmaElaboroUrl || undefined,
      fotos: uniqueFotos
    };

    try {
      if (editingInformeId) {
        await api.updateInforme(editingInformeId, payload);
      } else {
        await api.createInforme(payload);
      }

      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al guardar el informe técnico');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingInformeId(null);
    setCodigoInforme('');
    setTipoInforme('INFORME PRELIMINAR');
    setTitulo('REPARACIÓN Y TRATAMIENTO ANTICORROSIVO ESTRUCTURAL');
    setEmpresaContratista('A DEFINIR');
    setObservaciones('Relevamiento técnico inicial para tratamiento anticorrosivo.');
    setLugarObraFotoUrl('');
    setFotosList([]);
    setAnexosFotosList([]);
    setExistingFirmaUrl('');
    setAvisoNumeroManual('');
    setOrdenNumeroManual('');
    setUbicacionTecnicaManual('');
    setActiveStep(1);
    setVistaPreviaDoc(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
      
      {/* BANNER INSTITUCIONAL OFICIAL (CELULOSA PUERTO ESPERANZA) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white rounded-2xl p-5 sm:p-7 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <Shield className="w-64 h-64 text-sky-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/20 border border-sky-400/30 rounded-full text-[11px] font-bold text-sky-300 tracking-wide">
              <span>Departamento de Corrosión - Sub Gerencia de Mantenimiento</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Informes Técnicos CRR</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Modelo Oficial
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Celulosa Puerto Esperanza • ISO 14001 • OHSAS 18001 • Servicios Auxiliares Dpto. 340CRR.
              Permite la emisión y edición completa en terreno desde PC o celular con fotos y comentarios.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => {
                resetForm();
                if (avisos.length > 0) {
                  setAvisoSeleccionado(avisos[0]);
                  setTitulo(`Informe Técnico - Aviso ${avisos[0].numeroAviso}`);
                }
                setShowModal(true);
              }}
              className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-sky-950/40 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-5 h-5 shrink-0" />
              <span>Nuevo Informe Oficial (Móvil)</span>
            </button>
          </div>
        </div>
      </div>

      {/* LISTA DE INFORMES EMITIDOS CON BORRADO SELECTIVO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <FileText className="w-4 h-4 text-sky-600" />
              <span>Documentos Oficiales Emitidos ({informes.length})</span>
            </div>

            {informes.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                {selectedIds.length === informes.length && informes.length > 0
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {selectedIds.length > 0 ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteIds(selectedIds)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer animate-in fade-in duration-150"
              >
                <Trash2 className="w-4 h-4" />
                <span>Borrar Seleccionados ({selectedIds.length})</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500">
                Marca las casillas de los informes para borrarlos selectivamente
              </span>
            )}
          </div>
        </div>

        {informes.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-400 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">No hay informes emitidos todavía</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Presiona "Nuevo Informe Oficial (Móvil)" para crear el primer informe con el modelo corporativo Arauco.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {informes.map((inf) => {
              const isSelected = selectedIds.includes(inf.id);
              return (
                <div
                  key={inf.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 group ${
                    isSelected
                      ? 'border-red-400 ring-2 ring-red-200 bg-red-50/10'
                      : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectInforme(inf.id)}
                          className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <span className="font-mono text-xs font-black text-sky-900 bg-sky-100 px-2.5 py-1 rounded-md border border-sky-200">
                          {inf.codigoInforme}
                        </span>
                      </label>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 truncate max-w-[150px]">
                        {inf.tipoInforme || 'INFORME PRELIMINAR'}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-sky-600 transition">
                      {inf.titulo}
                    </h3>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400">EMPRESA:</span>
                        <strong className="text-slate-800">{inf.empresaContratista || 'A DEFINIR'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Aviso / PS:</span>
                        <strong className="text-slate-800">{inf.avisoNumero || 'N/A'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ubicación:</span>
                        <span className="text-slate-800 truncate max-w-[170px]">{inf.ubicacionTecnica || 'Puerto Esperanza'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Fecha:</span>
                        <span className="text-slate-800">{new Date(inf.fechaElaboracion).toLocaleDateString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Preparó:</span>
                        <span className="text-slate-800 font-semibold">{inf.responsable?.nombre || 'DAC.'}</span>
                      </div>
                    </div>

                    {inf.fotos && inf.fotos.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
                        <Camera className="w-3.5 h-3.5 text-sky-600" />
                        <span>{inf.fotos.length} fotos y comentarios</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <a
                      href={`/api/informes/${inf.id}/export-html`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      <Printer className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>Ver / Imprimir</span>
                      <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenEditInforme(inf)}
                      className="px-3 py-2.5 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 hover:border-sky-600 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title={`Editar informe ${inf.codigoInforme}`}
                    >
                      <Pencil className="w-3.5 h-3.5 shrink-0" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteIds([inf.id])}
                      className="p-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 rounded-xl transition cursor-pointer"
                      title={`Borrar informe ${inf.codigoInforme}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN DE BORRADO SELECTIVO */}
      {confirmDeleteIds && confirmDeleteIds.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !deleting && setConfirmDeleteIds(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-600 text-white rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  ¿Eliminar {confirmDeleteIds.length === 1 ? 'este informe' : `${confirmDeleteIds.length} informes seleccionados`}?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Se eliminarán de la base de datos los documentos seleccionados junto con sus fotografías asociadas, liberando espacio en Render.
                </p>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
              {informes
                .filter((inf) => confirmDeleteIds.includes(inf.id))
                .map((inf) => (
                  <div key={inf.id} className="flex items-center justify-between gap-2 text-slate-700">
                    <span className="font-mono font-bold text-sky-900">{inf.codigoInforme}</span>
                    <span className="truncate text-slate-500">{inf.titulo}</span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDeleteIds(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'Eliminando...' : 'Sí, borrar definitivamente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL CREAR INFORME - 100% OPTIMIZADO PARA CELULAR
      ===================================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh] border border-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABECERA CORPORATIVA FIJA */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0 border-b border-slate-800">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    {editingInformeId ? 'Instancia de Edición de Informe' : 'IM- CRR Modelo'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {codigoInforme || 'INF_ CRR – 00XXX - 2026'}
                  </span>
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-white truncate">
                  {editingInformeId
                    ? `Editando Informe: ${codigoInforme || titulo}`
                    : 'Generación de Informe Técnico en Terreno'}
                </h3>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Departamento de Corrosión - Celulosa Puerto Esperanza Arauco (ISO 14001 / OHSAS 18001)
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setVistaPreviaDoc(!vistaPreviaDoc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    vistaPreviaDoc
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{vistaPreviaDoc ? 'Volver al Formulario' : 'Vista Previa'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingInformeId(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* BARRA DE PASOS EN MÓVIL (TABS DESLIZABLES CON TOUCH) */}
            {!vistaPreviaDoc && (
              <div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none text-xs">
                {[
                  { step: 1, label: 'Datos & Meta', icon: FileText },
                  { step: 2, label: '1. Objetivo', icon: Target },
                  { step: 3, label: '2. Lugar Obra', icon: MapPin },
                  { step: 4, label: `3. Fotos y Comentarios (${fotosList.length})`, icon: Camera },
                  { step: 5, label: '4. Anexos', icon: Paperclip },
                  { step: 6, label: '5. Firmas', icon: PenTool }
                ].map((item) => {
                  const Icon = item.icon;
                  const isCurrent = activeStep === item.step;
                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => setActiveStep(item.step)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold shrink-0 transition cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* CUERPO CON SCROLL INTERNO */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 text-xs text-slate-800">
              
              {/* MODO VISTA PREVIA DEL DOCUMENTO MODELO */}
              {vistaPreviaDoc ? (
                <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-300 shadow-inner space-y-5 max-w-2xl mx-auto font-sans">
                  {/* Cabecera idéntica al DOCX */}
                  <div className="border border-slate-800 p-3 flex justify-between items-center text-[10px] sm:text-xs">
                    <div>
                      <strong className="text-slate-900 block text-xs">Departamento de Corrosión - Sub Gerencia de Mantenimiento</strong>
                      <span className="text-slate-700 block">Celulosa Puerto Esperanza.</span>
                      <span className="text-slate-500 font-mono">ISO 14001   OHSAS 18001</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-semibold">Servicios Auxiliares. Dpto.</span>
                      <span className="block font-bold text-sky-800">Revisión: 01</span>
                    </div>
                  </div>

                  {/* Títulos centrales */}
                  <div className="text-center py-2 border-b border-slate-200 space-y-1">
                    <h2 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">{tipoInforme}</h2>
                    <div className="text-sm font-bold text-sky-700 italic">
                      {codigoInforme || 'INF_ CRR – 00XXX - 2026'}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 italic uppercase">
                      {titulo}
                    </div>
                  </div>

                  {/* Metadatos */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                    <div><strong>EMPRESA:</strong> {empresaContratista}</div>
                    <div><strong>Fecha:</strong> {fechaElaboracion}</div>
                    <div className="col-span-2"><strong>Observaciones:</strong> {observaciones}</div>
                    <div><strong>Distribución:</strong> {distribucion}</div>
                    <div><strong>Copia asignada a:</strong> {copiaAsignada}</div>
                  </div>

                  {/* 1. OBJETIVO */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs uppercase text-slate-900 border-b pb-0.5">1. OBJETIVO.</h3>
                    <p className="text-slate-500 italic text-[10px]">Nota: Describir el objetivo de la obra o relevamiento.</p>
                    <p className="text-slate-700">{objetivo}</p>
                  </div>

                  {/* 2. LUGAR DE LA OBRA */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs uppercase text-slate-900 border-b pb-0.5">2. LUGAR DE LA OBRA & PROGRAMA DE TRABAJOS.</h3>
                    <p className="text-slate-500 italic text-[10px]">Nota1: Captura de imagen de la zona de la obra o detalle del programa semanal con estados.</p>
                    {lugarObraFotoUrl && (
                      <img src={lugarObraFotoUrl} alt="Lugar de Obra" className="w-full max-h-48 object-cover rounded-md border my-1" />
                    )}
                    {lugarObraTexto && (lugarObraTexto.includes('<table') || lugarObraTexto.includes('<div')) ? (
                      <div
                        className="overflow-x-auto text-xs my-1"
                        dangerouslySetInnerHTML={{ __html: lugarObraTexto }}
                      />
                    ) : (
                      <p className="text-slate-700 text-xs whitespace-pre-line">{lugarObraTexto}</p>
                    )}
                  </div>

                  {/* 3. FOTOS Y COMENTARIOS */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs uppercase text-slate-900 border-b pb-0.5">3. FOTOS Y COMENTARIOS.</h3>
                    <p className="text-slate-500 italic text-[10px]">Nota2: Cargar fotos con comentarios del registro.</p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {fotosList.map((f, i) => (
                        <div key={i} className="border rounded-md p-1.5 bg-slate-50">
                          <img src={f.url} alt="Foto" className="w-full h-24 object-cover rounded" />
                          <p className="text-[10px] text-slate-800 font-semibold mt-1">{f.diagnosticoTecnico}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. ANEXOS */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs uppercase text-slate-900 border-b pb-0.5">4. ANEXOS.</h3>
                    <p className="text-slate-500 italic text-[10px]">Nota3: Agregar planos o elementos que complementen al informe.</p>
                    <p className="text-slate-700">{anexosTexto}</p>
                  </div>

                  {/* Firmas */}
                  <div className="pt-4 border-t flex justify-between text-center text-[10px]">
                    <div>
                      <div className="font-bold text-slate-900">PREPARÓ: DAC.</div>
                      <div className="text-slate-500">{nombrePreparador}</div>
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">APROBÓ: INSPECCIÓN TÉCNICA</div>
                      <div className="text-slate-500">Arauco Puerto Esperanza</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* FORMULARIO POR PASOS */
                <form onSubmit={handleCrearInforme} className="space-y-5">

                  {/* PASO 1: ENCABEZADO Y METADATOS */}
                  {activeStep === 1 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-200">
                        <strong className="text-sky-900 text-xs block mb-1">Encabezado Oficial del Documento</strong>
                        <p className="text-[11px] text-sky-700">
                          Define el tipo de informe, empresa contratista y vinculación con el aviso SAP correspondiente.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Tipo de Documento</label>
                          <select
                            value={tipoInforme}
                            onChange={(e) => setTipoInforme(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="INFORME PRELIMINAR">INFORME PRELIMINAR</option>
                            <option value="INFORME TÉCNICO CRR">INFORME TÉCNICO CRR</option>
                            <option value="INFORME FINAL DE ENTREGA">INFORME FINAL DE ENTREGA</option>
                            <option value="INFORME TRABAJOS DE LA SEMANA">INFORME TRABAJOS DE LA SEMANA</option>
                            <option value="INFORME MENSUAL DE TRABAJOS PS">INFORME MENSUAL DE TRABAJOS PS</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            Código Oficial <span className="font-normal text-slate-400">(Auto o Personalizado)</span>
                          </label>
                          <input
                            type="text"
                            value={codigoInforme}
                            onChange={(e) => setCodigoInforme(e.target.value)}
                            placeholder="INF_ CRR – 00XXX - 2026 (Auto)"
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-sky-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-bold text-slate-700 mb-1">TITULO INFORME</label>
                          <input
                            type="text"
                            required
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            placeholder="TITULO DEL INFORME (ej: REPARACIÓN Y TRATAMIENTO...)"
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-sky-500 uppercase"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">EMPRESA:</label>
                          <input
                            type="text"
                            value={empresaContratista}
                            onChange={(e) => setEmpresaContratista(e.target.value)}
                            placeholder="A DEFINIR / NOMBRE DE CONTRATISTA"
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Fecha del Relevamiento</label>
                          <input
                            type="date"
                            value={fechaElaboracion}
                            onChange={(e) => setFechaElaboracion(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-bold text-slate-700 mb-1">Vincular con Aviso SAP (Opcional)</label>
                          <select
                            value={avisoSeleccionado?.id || ''}
                            onChange={(e) => handleAvisoChange(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500"
                          >
                            <option value="">-- Sin aviso vinculado (Relevamiento Libre) --</option>
                            {avisos.map((a) => (
                              <option key={a.id} value={a.id}>
                                Aviso #{a.numeroAviso} {a.numeroOrden ? `[OT: ${a.numeroOrden}]` : ''} - {a.descripcion.substring(0, 45)}...
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Distribución</label>
                          <input
                            type="text"
                            value={distribucion}
                            onChange={(e) => setDistribucion(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Copia asignada a:</label>
                          <input
                            type="text"
                            value={copiaAsignada}
                            onChange={(e) => setCopiaAsignada(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-bold text-slate-700 mb-1">Observaciones Iniciales</label>
                          <textarea
                            rows={2}
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Observaciones generales del servicio..."
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 2: SECCIÓN 1 - OBJETIVO */}
                  {activeStep === 2 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="font-extrabold text-xs text-slate-900 uppercase block">1. OBJETIVO.</span>
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          Nota: Describir el objetivo de la obra o relevamiento.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1.5">
                          Descripción Detallada del Objetivo
                        </label>
                        <textarea
                          rows={6}
                          value={objetivo}
                          onChange={(e) => setObjetivo(e.target.value)}
                          placeholder="Describe claramente los alcances, estructuras a intervenir y mitigación de condiciones subestándares..."
                          className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* Botones de texto rápido para celular */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500">Plantillas rápidas para celular:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            'Tratamiento anticorrosivo integral en soportería',
                            'Relevamiento por pérdida de sección en vigas',
                            'Reparación y pintura epoxi bajo esquema Arauco',
                            'Montaje de andamios y cerramiento Sa 2½'
                          ].map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setObjetivo((prev) => `${prev} ${preset}.`)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold transition cursor-pointer"
                            >
                              + {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 3: SECCIÓN 2 - LUGAR DE LA OBRA */}
                  {activeStep === 3 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="font-extrabold text-xs text-slate-900 uppercase block">2. LUGAR DE LA OBRA.</span>
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          Nota1: Captura de imagen de la zona de la obra o descripción.
                        </p>
                      </div>

                      {/* Botones para capturar con cámara del celular */}
                      <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-xs">Captura Panorámica de la Zona</span>
                          {lugarObraFotoUrl && (
                            <button
                              type="button"
                              onClick={() => setLugarObraFotoUrl('')}
                              className="text-[11px] text-red-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Quitar foto
                            </button>
                          )}
                        </div>

                        {lugarObraFotoUrl ? (
                          <div className="relative rounded-xl overflow-hidden border border-slate-300">
                            <img src={lugarObraFotoUrl} alt="Lugar de Obra" className="w-full h-52 object-cover" />
                            <div className="absolute bottom-2 left-2 bg-slate-900/80 text-white px-2.5 py-1 rounded-md text-[10px] font-semibold">
                              ✓ Foto de la zona cargada
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Botón Tomar Foto con Cámara Celular */}
                            <label className="flex flex-col items-center justify-center gap-2 p-5 bg-white border-2 border-dashed border-sky-400 hover:border-sky-600 rounded-xl cursor-pointer text-center transition active:scale-98">
                              <Camera className="w-7 h-7 text-sky-600" />
                              <div>
                                <span className="font-bold text-sky-900 block text-xs">Tomar Foto con Celular</span>
                                <span className="text-[10px] text-slate-500">Abre la cámara trasera en terreno</span>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleLugarObraUpload}
                                className="hidden"
                              />
                            </label>

                            {/* Botón Seleccionar de Galería */}
                            <label className="flex flex-col items-center justify-center gap-2 p-5 bg-white border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl cursor-pointer text-center transition active:scale-98">
                              <ImageIcon className="w-7 h-7 text-slate-500" />
                              <div>
                                <span className="font-bold text-slate-800 block text-xs">Subir de Galería / Archivo</span>
                                <span className="text-[10px] text-slate-500">Seleccionar foto ya guardada</span>
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleLugarObraUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block font-bold text-slate-700">
                            {lugarObraTexto?.includes('<table')
                              ? 'Programa Semanal / Tabla de Operaciones y Estados'
                              : 'Descripción de la Ubicación / Sector'}
                          </label>
                          {lugarObraTexto?.includes('<table') && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                              Mini Tabla con Estados Activa
                            </span>
                          )}
                        </div>
                        {lugarObraTexto?.includes('<table') ? (
                          <div className="space-y-2">
                            <div
                              className="border border-slate-200 rounded-xl p-2 bg-slate-50/50 max-h-72 overflow-y-auto text-xs"
                              dangerouslySetInnerHTML={{ __html: lugarObraTexto }}
                            />
                            <details className="text-[11px] text-slate-500 cursor-pointer">
                              <summary className="font-semibold text-sky-600 hover:underline">
                                Editar código / contenido HTML manualmente
                              </summary>
                              <textarea
                                rows={5}
                                value={lugarObraTexto}
                                onChange={(e) => setLugarObraTexto(e.target.value)}
                                className="w-full mt-1.5 p-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-sky-500"
                              />
                            </details>
                          </div>
                        ) : (
                          <textarea
                            rows={3}
                            value={lugarObraTexto}
                            onChange={(e) => setLugarObraTexto(e.target.value)}
                            placeholder="Sector, cota de altura, equipo industrial o área intervenida..."
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* PASO 4: SECCIÓN 3 - FOTOS Y COMENTARIOS */}
                  {activeStep === 4 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="font-extrabold text-xs text-slate-900 uppercase block">3. FOTOS Y COMENTARIOS.</span>
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          Nota2: Cargar fotos y comentarios del informe. Puedes editar los comentarios o quitar fotos duplicadas/innecesarias.
                        </p>
                      </div>

                      {/* Tarjeta para agregar nueva foto */}
                      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3">
                        <span className="font-bold text-slate-800 text-xs block">
                          Agregar Foto y Comentario
                        </span>

                        <div className="grid grid-cols-1 gap-2.5">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Comentario / Diagnóstico de la Foto
                            </label>
                            <input
                              type="text"
                              value={tempDiagnostico}
                              onChange={(e) => setTempDiagnostico(e.target.value)}
                              placeholder="Escribe el comentario técnico o descripción del trabajo en la foto..."
                              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
                            />
                            <input
                              type="text"
                              value={tempPie}
                              onChange={(e) => setTempPie(e.target.value)}
                              placeholder="Ubicación / Pie de foto opcional (ej: Sector 340CRR - Vista lateral)"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] mt-1.5"
                            />
                          </div>
                        </div>

                        {/* Botones de Captura para Registro */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <label className="flex items-center justify-center gap-2 p-3 bg-sky-50 hover:bg-sky-100 border border-sky-300 rounded-xl font-bold text-sky-800 text-xs cursor-pointer transition active:scale-98">
                            <Camera className="w-4 h-4 text-sky-600" />
                            <span>Abrir Cámara de Celular</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>

                          <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-700 text-xs cursor-pointer transition active:scale-98">
                            <Upload className="w-4 h-4 text-slate-500" />
                            <span>Seleccionar de Galería</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {tempFotoUrl && (
                          <div className="flex items-center justify-between gap-3 p-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={tempFotoUrl} alt="Vista previa" className="w-12 h-12 rounded object-cover border" />
                              <span className="text-[11px] font-bold text-emerald-800 truncate">
                                Foto lista para agregar al informe
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleAddFoto}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow transition cursor-pointer shrink-0"
                            >
                              + Agregar Foto y Comentario
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Lista de Fotos y Comentarios Registrados (Editables) */}
                      <div className="space-y-2">
                        <span className="font-bold text-slate-700 text-xs">
                          Fotos y Comentarios en este Informe ({fotosList.length})
                        </span>

                        {fotosList.length === 0 ? (
                          <div className="p-6 text-center bg-slate-50 border border-dashed rounded-xl text-slate-400 text-xs">
                            No se han cargado fotos aún. Sube o captura fotos con el botón superior.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {fotosList.map((f, i) => (
                              <div
                                key={i}
                                className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 relative group"
                              >
                                <div className="flex gap-3 items-start">
                                  <img
                                    src={f.url}
                                    alt={`Foto ${i + 1}`}
                                    className="w-24 h-24 object-cover rounded-lg border shrink-0"
                                  />
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-100 text-sky-900">
                                        Foto #{i + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFoto(i)}
                                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                                        title="Quitar esta foto del informe"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <input
                                      type="text"
                                      value={f.diagnosticoTecnico || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFotosList((prev) =>
                                          prev.map((item, idx) =>
                                            idx === i ? { ...item, diagnosticoTecnico: val } : item
                                          )
                                        );
                                      }}
                                      placeholder="Comentario de la foto..."
                                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    />
                                    <input
                                      type="text"
                                      value={f.pieDeFoto || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFotosList((prev) =>
                                          prev.map((item, idx) =>
                                            idx === i ? { ...item, pieDeFoto: val } : item
                                          )
                                        );
                                      }}
                                      placeholder="Pie de foto / Ubicación..."
                                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PASO 5: SECCIÓN 4 - ANEXOS */}
                  {activeStep === 5 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="font-extrabold text-xs text-slate-900 uppercase block">4. ANEXOS.</span>
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          Nota3: Agregar planos o elementos que complementen al informe.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Observaciones o Detalles de Anexos
                        </label>
                        <textarea
                          rows={4}
                          value={anexosTexto}
                          onChange={(e) => setAnexosTexto(e.target.value)}
                          placeholder="Planos adjuntos, certificados de calidad de pintura, memorias de andamio o croquis..."
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      {/* Carga de Planos o Esquemas */}
                      <div className="space-y-2">
                        <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl font-bold text-slate-700 text-xs cursor-pointer transition">
                          <Paperclip className="w-4 h-4 text-slate-500" />
                          <span>Adjuntar Foto de Plano o Croquis Complementario</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAnexoUpload}
                            className="hidden"
                          />
                        </label>

                        {anexosFotosList.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                            {anexosFotosList.map((url, i) => (
                              <div key={i} className="relative rounded-lg overflow-hidden border">
                                <img src={url} alt="Anexo" className="w-full h-20 object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAnexo(i)}
                                  className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PASO 6: FIRMAS Y EMISIÓN */}
                  {activeStep === 6 && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="font-extrabold text-xs text-slate-900 uppercase block">
                          5. CIERRE Y FIRMA DIGITAL
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Firma del responsable emisor (DAC.) para validar el informe según normativa Arauco.
                        </p>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Nombre del Preparador / Emisor</label>
                        <input
                          type="text"
                          value={nombrePreparador}
                          onChange={(e) => setNombrePreparador(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-700 text-xs">
                            Firma Táctil en Celular
                          </label>
                          <button
                            type="button"
                            onClick={() => sigCanvasElaboro.current?.clear()}
                            className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Limpiar firma
                          </button>
                        </div>
                        <div
                          className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner"
                          style={{ touchAction: 'none' }}
                        >
                          <SignatureCanvas
                            ref={sigCanvasElaboro}
                            canvasProps={{
                              className: 'w-full h-28 bg-white cursor-crosshair'
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">
                          Dibuja tu firma con el dedo directamente en la pantalla de tu celular.
                        </span>
                      </div>
                    </div>
                  )}

                </form>
              )}

            </div>

            {/* PIE DE ACCIONES FIJO */}
            <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div>
                {!vistaPreviaDoc && activeStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => Math.max(prev - 1, 1))}
                    className="px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingInformeId(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>

                {editingInformeId && !vistaPreviaDoc && activeStep < 6 && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCrearInforme}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                )}

                {!vistaPreviaDoc && activeStep < 6 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep((prev) => Math.min(prev + 1, 6))}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCrearInforme}
                    className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg transition active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {submitting
                        ? 'Guardando...'
                        : editingInformeId
                        ? 'Guardar Cambios del Informe'
                        : 'Emitir Informe Oficial CRR'}
                    </span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default InformesCRR;
