import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde la raíz o local
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import router from './routes/api.routes';

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
import fs from 'fs';
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 APP-INFORMES SERVER RUNNING ON PORT ${PORT}`);
  console.log(`📡 URL Base: http://localhost:${PORT}/api`);
  console.log(`🔒 Regla estricta: Máximo 5 usuarios registrados`);
  console.log(`📂 Ingesta SAP 340CRR: Operativa`);
  console.log(`====================================================`);
});

export default app;
