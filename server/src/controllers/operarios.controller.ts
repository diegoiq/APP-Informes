import { Request, Response } from 'express';
import prisma from '../database/db';
import { ProgramacionAraucoController } from './programacionArauco.controller';

// Palabras clave para clasificar tareas si no tienen rubro explícito en Aviso
const SOLDADOR_KEYWORDS = /soldad|soldar|calder|plancha|tuber|piping|valvul|corte|plasma|mig|tig|viga|metal|chapa|oxigen|estructura\s*met/i;
const CIVIL_KEYWORDS = /civil|hormig|cemento|loseta|baldosa|rejilla|pintur|esmalte|epoxi|albanil|albañil|vereda|canaleta|desague|desagüe|mamposter|piso|techo|drenaje|proteccion|protección/i;

function clasificarOperacion(op: any): 'soldador' | 'civil' | 'ambos' {
  const rubro = (op.aviso?.rubro || '').toLowerCase();
  const status = (op.statusSistema || '').toLowerCase();
  const texto = (op.textoOperacion || '').toLowerCase();

  // 1. Si fue creada en terreno con un rubro marcado
  if (status.includes('soldad') || rubro.includes('soldad') || rubro.includes('cañer') || rubro.includes('piping') || rubro.includes('mecanic')) {
    return 'soldador';
  }
  if (status.includes('civil') || rubro.includes('civil') || rubro.includes('pintur') || rubro.includes('aislac') || rubro.includes('albanil') || rubro.includes('hormig')) {
    return 'civil';
  }

  // 2. Por texto descriptivo de la operación
  const matchesSoldador = SOLDADOR_KEYWORDS.test(texto);
  const matchesCivil = CIVIL_KEYWORDS.test(texto);

  if (matchesSoldador && !matchesCivil) return 'soldador';
  if (matchesCivil && !matchesSoldador) return 'civil';

  // Si no coincide o coincide con ambos, se clasifica según el rubro o queda accesible
  return 'ambos';
}

function formatearRangoFechas(fechaInicio?: Date | null, fechaFin?: Date | null): string {
  if (!fechaInicio || !fechaFin) return 'Ciclo Miércoles a Martes';
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const d1 = new Date(fechaInicio);
  const d2 = new Date(fechaFin);
  return `${d1.getUTCDate()} ${meses[d1.getUTCMonth()]} al ${d2.getUTCDate()} ${meses[d2.getUTCMonth()]}`;
}

export class OperariosController {
  /**
   * Obtiene metadatos de la semana en curso y lista de semanas disponibles para selección
   */
  public static async getInfoSemana(req: Request, res: Response) {
    try {
      const ptoTbjo = String(req.query.ptoTbjo || '340CRR').trim();

      // 1. Semanas registradas en dotaciones
      const dotaciones = await prisma.dotacionSemanalArauco.findMany({
        where: { ptoTbjo },
        orderBy: [{ anio: 'desc' }, { semana: 'desc' }],
        select: {
          semana: true,
          anio: true,
          fechaInicio: true,
          fechaFin: true
        }
      });

      // 2. Semanas distintas presentes en operaciones
      const opsSemanas = await prisma.operacionOM.findMany({
        where: { activo: true, semanaProg: { not: null } },
        distinct: ['semanaProg', 'anioProg'],
        select: { semanaProg: true, anioProg: true }
      });

      // Unificar semanas
      const mapaSemanas = new Map<string, { semana: number; anio: number; fechaInicio?: Date; fechaFin?: Date }>();

      for (const d of dotaciones) {
        mapaSemanas.set(`${d.anio}-${d.semana}`, {
          semana: d.semana,
          anio: d.anio,
          fechaInicio: d.fechaInicio,
          fechaFin: d.fechaFin
        });
      }

      for (const op of opsSemanas) {
        if (op.semanaProg && op.anioProg) {
          const key = `${op.anioProg}-${op.semanaProg}`;
          if (!mapaSemanas.has(key)) {
            const base = new Date(Date.UTC(op.anioProg, 0, 1));
            const offsetDays = (op.semanaProg - 1) * 7;
            const fIni = new Date(base.getTime() + (offsetDays + 2) * 86400000);
            const fFin = new Date(fIni.getTime() + 6 * 86400000);
            mapaSemanas.set(key, {
              semana: op.semanaProg,
              anio: op.anioProg,
              fechaInicio: fIni,
              fechaFin: fFin
            });
          }
        }
      }

      // Si no hubiera semanas cargadas, asegurar un rango razonable
      if (mapaSemanas.size === 0) {
        const anioDef = 2026;
        for (let s = 43; s <= 46; s++) {
          const base = new Date(Date.UTC(anioDef, 0, 1));
          const offsetDays = (s - 1) * 7;
          const fIni = new Date(base.getTime() + (offsetDays + 2) * 86400000);
          const fFin = new Date(fIni.getTime() + 6 * 86400000);
          mapaSemanas.set(`${anioDef}-${s}`, {
            semana: s,
            anio: anioDef,
            fechaInicio: fIni,
            fechaFin: fFin
          });
        }
      }

      // Ordenar descendente (más recientes primero)
      const listaSemanas = Array.from(mapaSemanas.values()).sort((a, b) => {
        if (a.anio !== b.anio) return b.anio - a.anio;
        return b.semana - a.semana;
      });

      const semanaActual = listaSemanas[0]?.semana || 44;
      const anioActual = listaSemanas[0]?.anio || 2026;
      const fechaInicioActual = listaSemanas[0]?.fechaInicio || new Date(anioActual, 10, 4);
      const fechaFinActual = listaSemanas[0]?.fechaFin || new Date(anioActual, 10, 10);

      const semanasFormateadas = listaSemanas.map((s) => {
        const esActual = s.semana === semanaActual && s.anio === anioActual;
        const rango = formatearRangoFechas(s.fechaInicio, s.fechaFin);
        return {
          semana: s.semana,
          anio: s.anio,
          label: `Semana ${s.semana} (${s.anio})`,
          rangoFechas: rango,
          esActual
        };
      });

      // Contar tareas de la semana actual
      const totalTareas = await prisma.operacionOM.count({
        where: {
          semanaProg: semanaActual,
          anioProg: anioActual,
          activo: true,
          NOT: [
            { numeroOrden: { contains: 'Opci' } },
            { numeroOrden: { contains: 'Duraci' } },
            { numeroOperacion: { contains: 'Opci' } }
          ]
        }
      });

      return res.json({
        semana: semanaActual,
        anio: anioActual,
        fechaInicio: fechaInicioActual,
        fechaFin: fechaFinActual,
        tituloSemana: `Tareas de la Semana en Curso`,
        rangoFechas: formatearRangoFechas(fechaInicioActual, fechaFinActual),
        totalTareas,
        semanasDisponibles: semanasFormateadas,
        ptoTbjo
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener información de la semana', error: error.message });
    }
  }

  /**
   * Lista las tareas de la semana en curso filtradas por especialidad (Civil o Soldador)
   * y búsqueda por texto/orden.
   */
  public static async getTareas(req: Request, res: Response) {
    try {
      const ptoTbjo = String(req.query.ptoTbjo || '340CRR').trim();
      const especialidad = String(req.query.especialidad || 'todos').toLowerCase(); // 'civil', 'soldador', 'todos'
      const search = String(req.query.search || '').trim().toLowerCase();

      // Determinar semana y año
      let semana = req.query.semana ? parseInt(String(req.query.semana), 10) : undefined;
      let anio = req.query.anio ? parseInt(String(req.query.anio), 10) : undefined;

      if (!semana || !anio) {
        const ultimaDotacion = await prisma.dotacionSemanalArauco.findFirst({
          where: { ptoTbjo },
          orderBy: [{ anio: 'desc' }, { semana: 'desc' }]
        });
        semana = ultimaDotacion?.semana || 44;
        anio = ultimaDotacion?.anio || 2026;
      }

      // Obtener operaciones de la semana
      const operacionesRaw = await prisma.operacionOM.findMany({
        where: {
          semanaProg: semana,
          anioProg: anio,
          activo: true,
          NOT: [
            { numeroOrden: { contains: 'Opci' } },
            { numeroOrden: { contains: 'Duraci' } },
            { numeroOperacion: { contains: 'Opci' } }
          ]
        },
        orderBy: [
          { creadoEn: 'desc' },
          { numeroOrden: 'asc' },
          { numeroOperacion: 'asc' }
        ],
        include: {
          aviso: {
            select: {
              id: true,
              numeroAviso: true,
              descripcion: true,
              rubro: true,
              ubicacionTecnica: true
            }
          }
        }
      });

      // Mapear, clasificar y procesar fotos
      const procesadas = operacionesRaw.map((op) => {
        let fotos: any[] = [];
        if (op.fotosEjecucion) {
          try {
            const parsed = JSON.parse(op.fotosEjecucion);
            if (Array.isArray(parsed)) {
              fotos = parsed.map((item) =>
                typeof item === 'string'
                  ? { url: item, etapa: 'Durante', comentario: '', fecha: op.fechaEjecucion || op.actualizadoEn }
                  : {
                      url: item.url,
                      etapa: item.etapa || 'Durante',
                      comentario: item.comentario || '',
                      fecha: item.fecha || op.fechaEjecucion || op.actualizadoEn,
                      operario: item.operario || ''
                    }
              );
            }
          } catch {
            fotos = [];
          }
        }

        const categoria = clasificarOperacion(op);
        const esNuevaTerreno =
          op.statusSistema === 'CREADA_TERRENO' ||
          op.numeroOrden.startsWith('TERR-') ||
          (op.comentariosEjecucion || '').includes('Reportada por');

        return {
          id: op.id,
          numeroOrden: op.numeroOrden,
          numeroOperacion: op.numeroOperacion,
          textoOperacion: op.textoOperacion,
          ubicacionTecnica: op.ubicacionTecnica || op.aviso?.ubicacionTecnica || 'AR-PLANTA-CRR',
          categoria, // 'civil', 'soldador', 'ambos'
          estadoEjecucion: op.estadoEjecucion || 'Pendiente',
          comentariosEjecucion: op.comentariosEjecucion || '',
          fotos,
          esNuevaTerreno,
          horasEstimadas: op.horasEstimadas,
          hhTotalProgramado: op.hhTotalProgramado,
          aviso: op.aviso
        };
      });

      // Filtrar por especialidad estricta
      let filtradas = procesadas;
      if (especialidad === 'civil') {
        filtradas = procesadas.filter((t) => t.categoria === 'civil' || t.categoria === 'ambos');
      } else if (especialidad === 'soldador') {
        filtradas = procesadas.filter((t) => t.categoria === 'soldador' || t.categoria === 'ambos');
      }

      // Filtrar por búsqueda de texto
      if (search) {
        filtradas = filtradas.filter((t) => {
          const matchOrden = t.numeroOrden.toLowerCase().includes(search);
          const matchOp = t.numeroOperacion.toLowerCase().includes(search);
          const matchTexto = t.textoOperacion.toLowerCase().includes(search);
          const matchUbicacion = t.ubicacionTecnica.toLowerCase().includes(search);
          const matchAviso = t.aviso?.descripcion?.toLowerCase().includes(search) || false;
          return matchOrden || matchOp || matchTexto || matchUbicacion || matchAviso;
        });
      }

      return res.json({
        semana,
        anio,
        especialidad,
        total: filtradas.length,
        tareas: filtradas
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al listar tareas de operarios', error: error.message });
    }
  }

  /**
   * Guarda una foto / evidencia tomada por el operario en una tarea
   */
  public static async guardarEvidencia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        etapa = 'Durante', // 'Antes', 'Durante', 'Después'
        fotoUrl,
        comentario = '',
        operarioNombre = 'Operario',
        estadoEjecucion
      } = req.body;

      if (!fotoUrl) {
        return res.status(400).json({ message: 'La fotografía (fotoUrl) es obligatoria.' });
      }

      const op = await prisma.operacionOM.findUnique({
        where: { id },
        include: { aviso: true }
      });

      if (!op) {
        return res.status(404).json({ message: 'Tarea no encontrada.' });
      }

      // Parsear fotos previas
      let fotosActuales: any[] = [];
      if (op.fotosEjecucion) {
        try {
          const parsed = JSON.parse(op.fotosEjecucion);
          if (Array.isArray(parsed)) fotosActuales = parsed;
        } catch {
          fotosActuales = [];
        }
      }

      // Evitar duplicados
      const fotoTrim = String(fotoUrl).trim();
      const yaExiste = fotosActuales.some((f) => {
        const u = typeof f === 'string' ? f : f?.url;
        return u === fotoTrim;
      });

      if (!yaExiste) {
        fotosActuales.push({
          url: fotoTrim,
          etapa: String(etapa),
          comentario: String(comentario || '').trim(),
          operario: String(operarioNombre || 'Operario').trim(),
          fecha: new Date().toISOString()
        });
      }

      // Determinar nuevo estado de ejecución
      let nuevoEstado = estadoEjecucion || op.estadoEjecucion;
      if (!nuevoEstado || nuevoEstado === 'Pendiente') {
        nuevoEstado = etapa === 'Después' ? 'Completado' : 'En Ejecución';
      }

      // Actualizar comentario general si se aportó uno nuevo
      let nuevoComentarioEjecucion = op.comentariosEjecucion || '';
      if (comentario && comentario.trim() !== '') {
        const fechaCorta = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
        const entrada = `[${fechaCorta} ${operarioNombre} (${etapa})]: ${comentario.trim()}`;
        nuevoComentarioEjecucion = nuevoComentarioEjecucion
          ? `${nuevoComentarioEjecucion} \n${entrada}`
          : entrada;
      }

      const opActualizada = await prisma.operacionOM.update({
        where: { id },
        data: {
          fotosEjecucion: JSON.stringify(fotosActuales),
          estadoEjecucion: nuevoEstado,
          comentariosEjecucion: nuevoComentarioEjecucion,
          fechaEjecucion: new Date()
        }
      });

      // Sincronizar automáticamente con el Informe Semanal oficial de Arauco
      const semana = opActualizada.semanaProg || 44;
      const anio = opActualizada.anioProg || 2026;
      const ptoTbjo = opActualizada.ptoTbjo || '340CRR';

      ProgramacionAraucoController.syncInformeSemanal(semana, anio, ptoTbjo).catch((err) => {
        console.warn('Aviso: syncInformeSemanal falló silenciosamente tras guardar foto operario:', err.message);
      });

      return res.json({
        success: true,
        message: 'Foto guardada y sincronizada correctamente.',
        tarea: opActualizada
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al guardar foto de operario', error: error.message });
    }
  }

  /**
   * Crea una nueva tarea básica desde terreno por parte del operario
   */
  public static async crearTareaNueva(req: Request, res: Response) {
    try {
      const {
        especialidad = 'Civil', // 'Civil' o 'Soldador'
        textoOperacion,
        ubicacionTecnica,
        numeroOrden,
        operarioNombre = 'Operario',
        comentario,
        fotoInicial,
        semana,
        anio
      } = req.body;

      if (!textoOperacion || String(textoOperacion).trim() === '') {
        return res.status(400).json({ message: 'La descripción del trabajo es requerida.' });
      }

      const ptoTbjo = '340CRR';

      // Obtener semana elegida o activa por defecto
      let semanaProg = semana ? parseInt(String(semana), 10) : undefined;
      let anioProg = anio ? parseInt(String(anio), 10) : undefined;

      if (!semanaProg || !anioProg) {
        const ultimaDotacion = await prisma.dotacionSemanalArauco.findFirst({
          where: { ptoTbjo },
          orderBy: [{ anio: 'desc' }, { semana: 'desc' }]
        });
        semanaProg = ultimaDotacion?.semana || 44;
        anioProg = ultimaDotacion?.anio || 2026;
      }

      // Generar número de orden provisional o usar el ingresado
      const orderNumber = numeroOrden && String(numeroOrden).trim() !== ''
        ? String(numeroOrden).trim()
        : `TERR-${Math.floor(1000 + Math.random() * 9000)}`;

      const opNumber = '0010';
      const espNormalizada = String(especialidad).toLowerCase().includes('sold') ? 'Soldador' : 'Civil';

      // 1. Crear Aviso de soporte para clasificar rubro
      const aviso = await prisma.aviso.create({
        data: {
          numeroAviso: `AV-TERR-${Date.now().toString().slice(-6)}`,
          descripcion: String(textoOperacion).trim(),
          rubro: espNormalizada,
          ubicacionTecnica: ubicacionTecnica ? String(ubicacionTecnica).trim() : 'AR-PLANTA-CRR',
          ptoTbjoResponsable: ptoTbjo,
          estadoSistema: 'MEAB',
          comentariosTerreno: `Creado desde Portal Terreno por: ${operarioNombre}`,
          revisionPs: `PS${semanaProg}`
        }
      });

      // 2. Si vino foto inicial
      const fotosArray: any[] = [];
      if (fotoInicial) {
        fotosArray.push({
          url: fotoInicial,
          etapa: 'Antes',
          comentario: `Foto inicial al reportar tarea (${operarioNombre})`,
          operario: operarioNombre,
          fecha: new Date().toISOString()
        });
      }

      // 3. Crear OperacionOM
      const descripLimpia = String(textoOperacion).trim();
      const op = await prisma.operacionOM.create({
        data: {
          numeroOrden: orderNumber,
          numeroOperacion: opNumber,
          textoOperacion: descripLimpia,
          ubicacionTecnica: ubicacionTecnica ? String(ubicacionTecnica).trim() : 'AR-PLANTA-CRR',
          ptoTbjo,
          revision: `PS${semanaProg}${anioProg}`,
          horasEstimadas: 4,
          semanaProg,
          anioProg,
          statusSistema: `CREADA_TERRENO_${espNormalizada.toUpperCase()}`,
          estadoEjecucion: 'En Ejecución',
          comentariosEjecucion: `Reportada en terreno por: ${operarioNombre}${comentario ? ` - ${comentario}` : ''}`,
          fotosEjecucion: JSON.stringify(fotosArray),
          avisoId: aviso.id,
          hhMiercoles: 4,
          hhTotalProgramado: 4,
          activo: true
        },
        include: {
          aviso: true
        }
      });

      // Sincronizar informe
      ProgramacionAraucoController.syncInformeSemanal(semanaProg, anioProg, ptoTbjo).catch((err) => {
        console.warn('Aviso: syncInformeSemanal tras nueva tarea falló silenciosamente:', err.message);
      });

      return res.status(201).json({
        success: true,
        message: 'Tarea registrada con éxito en el programa semanal.',
        tarea: op
      });
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al crear nueva tarea de terreno', error: error.message });
    }
  }

  /**
   * Lista personal activo para facilitar la selección de nombre del operario
   */
  public static async getPersonal(req: Request, res: Response) {
    try {
      const especialidad = String(req.query.especialidad || '').toLowerCase();

      const personal = await prisma.personal.findMany({
        where: { activo: true },
        orderBy: { nombre: 'asc' },
        select: {
          id: true,
          nombre: true,
          especialidad: true,
          legajo: true
        }
      });

      let filtrados = personal;
      if (especialidad === 'civil') {
        filtrados = personal.filter((p) => {
          const esp = (p.especialidad || '').toLowerCase();
          return esp.includes('civil') || esp.includes('pint') || esp.includes('albañ') || esp.includes('mantenimiento');
        });
      } else if (especialidad === 'soldador') {
        filtrados = personal.filter((p) => {
          const esp = (p.especialidad || '').toLowerCase();
          return esp.includes('sold') || esp.includes('cañ') || esp.includes('mec');
        });
      }

      return res.json(filtrados);
    } catch (error: any) {
      return res.status(500).json({ message: 'Error al obtener personal', error: error.message });
    }
  }
}

