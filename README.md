# APP-Informes | Plataforma Integral de Mantenimiento & Informes Técnicos CRR

[![Arauco 340CRR](https://img.shields.io/badge/Puesto_de_Trabajo-340CRR-0284c7.svg)](https://github.com/diegoiq/APP-Informes.git)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.2-646cff.svg)](https://vitejs.dev/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2d3748.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Licencia](https://img.shields.io/badge/Acceso-Restringido_5_Usuarios-red.svg)]()

Plataforma de ingeniería y gestión operativa diseñada para el servicio de **Mantenimiento Estructural, Tratamiento Anticorrosivo y Mitigación de Condiciones Subestándares** en la Planta Industrial Arauco (Puesto de Trabajo **340CRR**).

---

## 🏗️ 1. Arquitectura del Monorepo

El repositorio está estructurado bajo una arquitectura monorepo limpia, modular y totalmente tipada con TypeScript:

```
c:\App-Informes\
├── /client/                  # Frontend SPA React 18 + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/       # Navbar, ProtectedRoute, Canvas de Firma
│   │   ├── context/          # AuthContext (Estado de sesión y badge de cupos 5 usuarios)
│   │   ├── pages/            # Login, Register, SapIngesta, Triaje, Programacion, Obras, InformesCRR
│   │   └── services/         # Cliente API Fetch tipado con JWT
│   ├── index.html
│   └── vite.config.ts
│
├── /server/                  # Backend Node.js + Express + Prisma ORM
│   ├── prisma/
│   │   └── schema.prisma     # Esquema relacional con tablas mapeadas (usuarios, avisos, etc.)
│   ├── src/
│   │   ├── controllers/      # Auth (regla 5 usuarios), Avisos (SAP), Triaje, Personal, Obras, Informes
│   │   ├── middlewares/      # authMiddleware (JWT 8 horas)
│   │   ├── routes/           # Rutas API modulares (/api/*)
│   │   ├── services/         # SapParserService (cruce Avisos-OM-Analisis y Upsert protegido)
│   │   ├── database/         # Prisma Client y Seeder inicial
│   │   └── scripts/          # Generador de Excel de muestra y tests de límites
│   └── uploads/              # Almacenamiento local de archivos Excel generados
│
├── /shared/                  # Modelos y contratos compartidos TypeScript
│   └── src/
│       ├── constants/        # Taxonomía operativa: Rubros, Riesgos, Condiciones, 340CRR
│       └── types/            # DTOs, Entidades y Resúmenes de Ingesta
│
├── /templates/               # Plantillas formales de ingeniería
│   └── informe-crr-modelo.html # Estructura corporativa Arauco (Cómputos, Sa 2½, Criterio 40%, Pintura, Firmas)
│
├── .gitignore                # Reglas de exclusión para monorepo
├── .env.example              # Variables de entorno documentadas
└── package.json              # Scripts unificados de ejecución concurrente
```

---

## 🔒 2. Autenticación y Control Estricto de 5 Usuarios Máximo

La aplicación impone una regla de negocio inquebrantable a nivel de backend y base de datos:

1. **Tabla `usuarios`**:
   - `id` (UUID), `nombre`, `email` (único, normalizado en minúsculas), `password_hash` (bcrypt), `rol` (`admin`, `supervisor`, `programador`), `activo` (boolean), `creado_en` (timestamp).
2. **Validación en `POST /api/auth/register`**:
   - Antes de cualquier inserción, se ejecuta un conteo estricto `SELECT COUNT(*) FROM usuarios`.
   - Si `count >= 5`, la solicitud es rechazada con **HTTP 403 Forbidden** y el mensaje exacto:
     > `"Límite alcanzado: la aplicación no admite más de 5 usuarios registrados."`
3. **Endpoint `POST /api/auth/login`**:
   - Validación de hash con `bcryptjs`.
   - Emisión de token JWT con expiración estricta de **8 horas**.
4. **Experiencia de Usuario en Frontend**:
   - Badge visual en tiempo real: `Cupos ocupados: X / 5`.
   - Al llegar a 5 usuarios, el formulario de registro se bloquea automáticamente deshabilitando el botón de envío y mostrando una alerta preventiva.
   - Vinculación automática del usuario autenticado a las firmas de Libro Diario y emisión de Informes CRR.

---

## 📊 3. Módulo de Ingesta Inteligente SAP (Excel / CSV)

El parser `SapParserService` procesa de forma nativa el archivo estándar `Panel-Avisos-OM.xlsx` detectando y cruzando sus tres hojas:

- **Hoja 'Avisos'**: Extracción de `Aviso`, `Fecha notificación`, `Descripción`, `Orden`, `Estado del sistema` (ej. MEAB), `Autor`, `Efecto`, `Prioridad`.
- **Hoja 'OM'**: Cruce relacional por N° Aviso/Orden extrayendo:
  - `Pto.tbjo.responsable` (filtro principal preferente: **340CRR**).
  - `Revisión` (ej. PS502026), `Ubicación técnica`, `Denominación`, `Clase de orden` (ZAM, ZME), `Costes tot.reales`, `Área de empresa`, Ventanas de fechas extremas y reales.
- **Hoja 'Analisis' (Taxonomía Operativa Arauco)**:
  - **Rubro**: Mantenimiento General, Pintura/Aislación, Civil, Soldador, Cañerías/Mecánica, Eléctrico.
  - **Tipo de Riesgo Civil / Físico**: Interacción vial / Guardas / Cerramientos, Daño estructural civil / Edilicio, Caída de escombro, Caída en altura / Accesos, Caída al mismo nivel, Integridad de Proceso / Fuga / Piping, etc.
  - **Tipo Condición Final**: CS-Protecciones, CS-Pintura/Tratamiento Anticorrosivo, CS-Loseta, CS-Soportería/Fijación, CS-Hormigon, CS-Rejilla, CS-Acceso/Portones, etc.
  - **Efecto**: Seguridad, Inter. Hombre Máquina, Limitación de producción, Parada de la producción, Medio Ambiente.
  - **Fase de Avance**: 1. Planificación, 2. En Ejecución, 3. Finalizada.
- **Lógica de Sincronización No Destructiva (*Upsert*)**:
  - Al sincronizar con SAP, si el aviso ya existe en la base de datos se actualizan los estados de SAP **sin sobreescribir jamás** las fotos de terreno, horas reales incurridas, asignaciones de operarios, notas de campo ni la prioridad real acordada.

---

## 🎯 4. Triaje Operativo & Prioridad Real

- **Resolución de Inflación de Prioridades**: Diferenciación entre `prioridad_sap` (original cargada por el solicitante) y `prioridad_real_acordada` acordada técnicamente:
  - `1 - Emergencia HSE / Planta` (Respuesta máx: 24h)
  - `2 - Urgente` (Respuesta máx: 72h)
  - `3 - Programable Próx. Semana` (Nivelación de carga)
  - `4 - Rutina / Backlog`
- **Gestión de Contacto e Insistencias**:
  - Registro cronológico de acuerdos con solicitantes (canal: Correo, Llamada, Terreno).
  - Contador automático de reiteraciones/insistencias por correo.
  - Generador con 1-clic de plantilla de respuesta formal estandarizada por correo electrónico.

---

## 👷 5. Dotación & Programación Semanal de HH

- **Gestión de Dotación**: Operarios especializados con legajo, especialidad/rubro y régimen de 8h/9h diarias.
- **Nivelación Semanal de Carga**: Tablero de programación semanal con asignación directa de avisos/OTs por día (Lunes a Viernes).
- **Semáforo Automático de Capacidad**:
  - 🟢 **Verde (75% - 100%)**: Carga óptima balanceada.
  - 🟡 **Amarillo (< 75%)**: Capacidad ociosa disponible.
  - 🔴 **Rojo (> 100%)**: Sobreasignación de personal.

---

## 📖 6. Obras Planificadas & Libro Diario de Obra

- **Cronograma Gantt Interactivo**: Seguimiento de curvas de avance programado vs. avance real.
- **Libro Diario Digital**:
  - Asientos diarios inmutables.
  - Registro de condiciones climáticas e interferencias tipificadas (lluvia/viento, falta de frente, demoras de permisos HSE).
  - Carga fotográfica clasificada en etapas: **"Antes"**, **"Durante"** y **"Después"**.
  - Lienzo de firma digital táctil del supervisor.
  - Generación de token único para validación y firma remota del cliente/inspección técnica.

---

## 📄 7. Generador de Informes Técnicos (Modelo CRR)

Motor de exportación siguiendo la especificación corporativa Arauco:
1. **Portada y Metadatos**: Código `CRR – 00XXX – 2026`, Empresa Contratista, Distribución, Responsable.
2. **Objetivo y Normativa**: Tratamiento anticorrosivo, mitigación de riesgos HSE.
3. **Tareas a Realizar Estandarizadas**:
   - `2.1` Cómputos métricos (m² / m lineales).
   - `2.2` Montaje de andamios multidireccionales homologados con tarjeta verde.
   - `2.3` Preparación Sa 2 / Sa 2½ bajo cerramiento envolvente.
   - `2.4` Criterio de reemplazo de perfiles estructurales (pérdida de sección ≥ 40%).
   - `2.5` Esquema de pintura (Epoxi zinc 75µm + Epoxi MIO 150µm + Poliuretano 50µm).
   - `2.6` Orden, aseo y dossier de calidad.
4. **Grilla Fotográfica a 2 Columnas**: Diagnósticos técnicos y pies de foto.
5. **Bloque de Firmas**: Elaboró (Responsable técnico de la App) / Aprobó (Inspección Técnica de Planta).
6. **Exportación Formal**: Vista HTML imprimible lista para guardar como PDF o archivar en dossier.

---

## 🚀 8. Puesta en Marcha Rápida

### Requisitos Previos
- Node.js v18+ o v20+
- Git

### Instalación y Ejecución
```bash
# 1. Clonar el repositorio
git clone https://github.com/diegoiq/APP-Informes.git
cd APP-Informes

# 2. Instalar dependencias
npm install

# 3. Inicializar base de datos y migraciones
npm run prisma:generate
npm run prisma:migrate

# 4. Sembrar datos iniciales (2 usuarios precargados de los 5 cupos)
npm run prisma:seed

# 5. Generar archivo Excel de prueba Panel-Avisos-OM.xlsx
npm run generate:sample-excel

# 6. Iniciar la plataforma completa en desarrollo (Servidor + Cliente)
npm run dev
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000/api`
- **Credenciales Precargadas**:
  - Admin: `admin@arauco-crr.cl` | Contraseña: `admin123`
  - Supervisor: `supervisor@arauco-crr.cl` | Contraseña: `sup123`
