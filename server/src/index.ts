import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Cargar variables de entorno desde la raíz o local
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import prisma from './database/db';
import router from './routes/api.routes';
import { AraucoProgramParserService } from './services/araucoProgramParser.service';
import { ProgramacionAraucoController } from './controllers/programacionArauco.controller';

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'APP-Informes Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Rutas API Principales
app.use('/api', router);

// Servir frontend compilado en producción
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Iniciar Servidor
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 APP-INFORMES SERVER RUNNING ON PORT ${PORT}`);
  console.log(`📡 URL Base: http://localhost:${PORT}/api`);
  console.log(`🔒 Regla estricta: Máximo 5 usuarios registrados`);
  console.log(`📂 Ingesta SAP 340CRR: Operativa`);
  console.log(`====================================================`);

  // Asegurar contraseña solicitada para Diego Cristaldo
  try {
    const email = 'diego.a.cristaldo@arauco.com';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Arauco2026', salt);

    const user = await prisma.usuario.findUnique({ where: { email } });
    if (user) {
      await prisma.usuario.update({
        where: { id: user.id },
        data: { passwordHash }
      });
      console.log(`✅ Contraseña de ${email} sincronizada a Arauco2026`);
    } else {
      await prisma.usuario.create({
        data: {
          nombre: 'Diego A. Cristaldo',
          email,
          passwordHash,
          rol: 'admin',
          activo: true
        }
      });
      console.log(`✅ Usuario ${email} creado con rol admin y clave Arauco2026`);
    }

    // Sincronizar automáticamente el archivo PS442026 340CRR.xlsm de la raíz solo si aún no está cargado o tenía el desfase previo
    const ps44Path = path.resolve(__dirname, '../../PS442026 340CRR.xlsm');
    if (fs.existsSync(ps44Path)) {
      const existingDot44 = await prisma.dotacionSemanalArauco.findUnique({
        where: { semana_anio_ptoTbjo: { semana: 44, anio: 2026, ptoTbjo: '340CRR' } }
      });
      const ops44Count = await prisma.operacionOM.count({
        where: { semanaProg: 44, anioProg: 2026 }
      });

      // Solo importar desde disco si la semana 44 está vacía o si quedó con el desfase antiguo (opDomingo === 9 o opMartes === 0)
      if (!existingDot44 || ops44Count === 0 || existingDot44.opDomingo === 9 || existingDot44.opMartes === 0) {
        const buffer = fs.readFileSync(ps44Path);
        const summary = await AraucoProgramParserService.processProgramFile(buffer, 'PS442026 340CRR.xlsm');
        await ProgramacionAraucoController.syncInformeSemanal(summary.semana, summary.anio, summary.ptoTbjo);
        console.log(
          `✅ PS442026 340CRR inicializado en BD (${summary.totalOperaciones} operaciones | ${summary.hhDisponibles} HH disp | ${summary.hhProgramadas} HH prog)`
        );
      } else {
        console.log(`✅ PS442026 340CRR ya persistido en BD (${ops44Count} operaciones activas).`);
      }
    }
  } catch (err: any) {
    console.error('Info inicialización usuario:', err.message);
  }
});

export default app;
