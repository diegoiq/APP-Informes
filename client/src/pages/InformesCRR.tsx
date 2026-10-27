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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const InformesCRR: React.FC = () => {
  const { user } = useAuth();
  const [informes, setInformes] = useState<any[]>([]);
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nuevo Informe
  const [showModal, setShowModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [avisoSeleccionado, setAvisoSeleccionado] = useState<any | null>(null);
  const [empresaContratista, setEmpresaContratista] = useState('CONTRATISTA INDUSTRIAL CRR');
  const [distribucion, setDistribucion] = useState('Inspección Técnica Arauco / Operaciones 340CRR');
  const [objetivo, setObjetivo] = useState('Tratamiento anticorrosivo integral y mitigación de condiciones subestándares en estructuras y soportería.');
  const [normativaArauco, setNormativaArauco] = useState('Especificación Técnica Arauco ET-PINT-01 / Criterios HSE Mitigación de Riesgos Físicos.');
  
  // Tareas estandarizadas Arauco
  const [computos, setComputos] = useState('Área estimada de intervención: 48.5 m² en perfiles metálicos y soportes.');
  const [andamios, setAndamios] = useState('Montaje de andamios multidireccionales homologados con tarjeta verde y cálculo estructural.');
  const [preparacion, setPreparacion] = useState('Limpieza con chorro abrasivo Sa 2 / Sa 2½ bajo cerramiento envolvente con contención de polvo.');
  const [reemplazo, setReemplazo] = useState('Pérdida de espesor por corrosión mayor o igual al 40% requiere sustitución estructural.');
  const [esquemaPintura, setEsquemaPintura] = useState('Capa 1: Imprimación Epoxi rica en Zinc (75µm) + Capa 2: Epoxi MIO alto espesor (150µm) + Capa 3: Esmalte Poliuretano alifático (50µm).');
  const [ordenAseo, setOrdenAseo] = useState('Limpieza final del área, retiro de residuos clasificados y entrega de dossier de calidad con medición de espesores.');

  // Galería de Fotos (2 columnas con diagnósticos)
  const [fotosList, setFotosList] = useState<any[]>([]);
  const [tempEtapa, setTempEtapa] = useState<'Antes' | 'Durante' | 'Después'>('Antes');
  const [tempUrl, setTempUrl] = useState('');
  const [tempDiagnostico, setTempDiagnostico] = useState('');
  const [tempPie, setTempPie] = useState('');

  // Firma Elaboró
  const sigCanvasElaboro = useRef<SignatureCanvas | null>(null);

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

  const handleAvisoChange = (avisoId: string) => {
    const found = avisos.find((a) => a.id === avisoId);
    if (found) {
      setAvisoSeleccionado(found);
      setTitulo(`Informe Técnico Estructural - Aviso ${found.numeroAviso}`);
    }
  };

  const handleAddFoto = () => {
    if (!tempUrl) {
      alert('Por favor carga o indica una imagen para la galería');
      return;
    }
    setFotosList((prev) => [
      ...prev,
      {
        etapa: tempEtapa,
        url: tempUrl,
        diagnosticoTecnico: tempDiagnostico || 'Evidencia técnica de campo',
        pieDeFoto: tempPie || 'Frente de trabajo 340CRR'
      }
    ]);
    setTempUrl('');
    setTempDiagnostico('');
    setTempPie('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCrearInforme = async (e: React.FormEvent) => {
    e.preventDefault();

    let firmaElaboroUrl = '';
    if (sigCanvasElaboro.current && !sigCanvasElaboro.current.isEmpty()) {
      firmaElaboroUrl = sigCanvasElaboro.current.getTrimmedCanvas().toDataURL('image/png');
    }

    try {
      await api.createInforme({
        titulo: titulo || `Informe Técnico CRR - ${avisoSeleccionado?.numeroAviso || 'General'}`,
        empresaContratista,
        distribucion,
        avisoNumero: avisoSeleccionado?.numeroAviso,
        ordenNumero: avisoSeleccionado?.numeroOrden,
        ubicacionTecnica: avisoSeleccionado?.ubicacionTecnica,
        objetivo,
        normativaArauco,
        computosMetricos: computos,
        montajeAndamios: andamios,
        preparacionSuperficie: preparacion,
        criterioReemplazoPerfiles: reemplazo,
        esquemaPintura,
        ordenAseoDossier: ordenAseo,
        firmaElaboroUrl,
        fotos: fotosList
      });

      setShowModal(false);
      setFotosList([]);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error al generar informe técnico');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Encabezado Responsivo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase tracking-wider flex-wrap">
            <FileText className="w-4 h-4 shrink-0" />
            <span className="break-words">Generador de Informes Técnicos (Modelo CRR)</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5 break-words">
            Dossier & Informes de Condiciones Subestándares
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Estructura corporativa Arauco: tareas tipificadas, grilla a 2 columnas y bloque de firmas.
          </p>
        </div>

        <button
          onClick={() => {
            if (avisos.length > 0 && !avisoSeleccionado) {
              setAvisoSeleccionado(avisos[0]);
              setTitulo(`Informe Técnico Estructural - Aviso ${avisos[0].numeroAviso}`);
            }
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-950/20 transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Generar Informe CRR</span>
        </button>
      </div>

      {/* Lista de Informes Generados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {informes.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No se han emitido informes técnicos CRR aún. Genera el primer informe con el botón superior.
          </div>
        ) : (
          informes.map((inf) => (
            <div
              key={inf.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-extrabold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-md border border-sky-200">
                    {inf.codigoInforme}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {inf.estado}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                  {inf.titulo}
                </h3>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div>Aviso SAP: <strong className="text-slate-800">{inf.avisoNumero || 'N/A'}</strong></div>
                  <div>Ubicación: <strong className="text-slate-800">{inf.ubicacionTecnica || 'Planta Industrial'}</strong></div>
                  <div>Elaboró: <strong className="text-slate-800">{inf.responsable?.nombre}</strong></div>
                  <div>Fecha: <strong className="text-slate-800">{new Date(inf.fechaElaboracion).toLocaleDateString('es-CL')}</strong></div>
                </div>

                {inf.fotos && inf.fotos.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <Camera className="w-3.5 h-3.5 text-sky-600" />
                    <span>{inf.fotos.length} evidencias fotográficas vinculadas</span>
                  </div>
                )}
              </div>

              {/* Botón Imprimir / Ver Informe Formal HTML */}
              <div className="pt-4 border-t border-slate-100">
                <a
                  href={`/api/informes/${inf.id}/export-html`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span>Ver / Imprimir Informe Modelo Arauco</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 ml-1" />
                </a>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Modal Nuevo Informe CRR */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="border-b pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Generar Informe Técnico Modelo CRR
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estructura formal según Especificación Técnica Arauco
                </p>
              </div>
              <span className="text-xs font-mono font-extrabold text-sky-700 bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
                CRR – 00XXX – 2026
              </span>
            </div>

            <form onSubmit={handleCrearInforme} className="space-y-4 text-xs">
              
              {/* Selección de Aviso SAP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vincular con Aviso SAP</label>
                  <select
                    value={avisoSeleccionado?.id || ''}
                    onChange={(e) => handleAvisoChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                  >
                    {avisos.map((a) => (
                      <option key={a.id} value={a.id}>
                        Aviso #{a.numeroAviso} {a.numeroOrden ? `[OT: ${a.numeroOrden}]` : ''} - {a.descripcion.substring(0, 35)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Título del Informe</label>
                  <input
                    type="text"
                    required
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Informe Técnico de Condición Subestándar"
                    className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* Tareas a Realizar Estandarizadas Arauco */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider block">
                  Alcance Operativo Estandarizado (Sección 2 Arauco)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">2.1 Cómputos métricos</label>
                    <input
                      type="text"
                      value={computos}
                      onChange={(e) => setComputos(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">2.2 Montaje de andamios</label>
                    <input
                      type="text"
                      value={andamios}
                      onChange={(e) => setAndamios(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">2.3 Preparación Sa 2 / Sa 2½</label>
                    <input
                      type="text"
                      value={preparacion}
                      onChange={(e) => setPreparacion(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">2.4 Criterio reemplazo (≥ 40%)</label>
                    <input
                      type="text"
                      value={reemplazo}
                      onChange={(e) => setReemplazo(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">2.5 Esquema de pintura (Epoxi + Poliuretano)</label>
                  <input
                    type="text"
                    value={esquemaPintura}
                    onChange={(e) => setEsquemaPintura(e.target.value)}
                    className="w-full p-1.5 bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Registro Fotográfico a 2 Columnas con Diagnósticos */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider block">
                  Registro Fotográfico (Grilla a 2 Columnas)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Etapa</label>
                    <select
                      value={tempEtapa}
                      onChange={(e: any) => setTempEtapa(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded-md"
                    >
                      <option value="Antes">Antes</option>
                      <option value="Durante">Durante</option>
                      <option value="Después">Después</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Diagnóstico / Observación</label>
                    <input
                      type="text"
                      value={tempDiagnostico}
                      onChange={(e) => setTempDiagnostico(e.target.value)}
                      placeholder="Corrosión en viga de soporte..."
                      className="w-full p-1.5 bg-white border border-slate-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cargar Imagen</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="w-full text-[10px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddFoto}
                    className="px-3 py-1 bg-sky-600 text-white rounded font-bold hover:bg-sky-500"
                  >
                    + Agregar Foto a la Grilla
                  </button>
                </div>

                {/* Previsualización de Fotos en Grilla */}
                {fotosList.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {fotosList.map((f, i) => (
                      <div key={i} className="flex gap-2 p-2 bg-white rounded-lg border border-slate-200">
                        <img src={f.url} alt="Evidencia" className="w-16 h-16 object-cover rounded" />
                        <div className="text-[11px] overflow-hidden">
                          <span className="font-bold text-sky-800">{f.etapa}</span>
                          <p className="font-semibold text-slate-800 truncate">{f.diagnosticoTecnico}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bloque de Firmas: Elaboró (Usuario Activo) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Firma Digital: Elaboró ({user?.nombre || 'Responsable Técnico'})
                  </label>
                  <button
                    type="button"
                    onClick={() => sigCanvasElaboro.current?.clear()}
                    className="text-xs text-sky-600 hover:text-sky-700 font-bold"
                  >
                    Limpiar
                  </button>
                </div>
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white">
                  <SignatureCanvas
                    ref={sigCanvasElaboro}
                    canvasProps={{
                      className: 'w-full h-24 bg-white cursor-crosshair'
                    }}
                  />
                </div>
              </div>

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
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow-md"
                >
                  Emitir Informe Formal CRR
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default InformesCRR;
