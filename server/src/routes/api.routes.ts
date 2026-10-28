import { Router } from 'express';
import multer from 'multer';
import { AuthController } from '../controllers/auth.controller';
import { AvisosController } from '../controllers/avisos.controller';
import { TriajeController } from '../controllers/triaje.controller';
import { PersonalController } from '../controllers/personal.controller';
import { ObrasController } from '../controllers/obras.controller';
import { InformesController } from '../controllers/informes.controller';
import { AdminController } from '../controllers/admin.controller';
import { ProgramacionAraucoController } from '../controllers/programacionArauco.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. AUTENTICACIÓN Y CONTROL DE 5 USUARIOS MÁXIMO
router.get('/auth/stats', AuthController.getStats);
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/reset-password', AuthController.resetPassword);
router.get('/auth/me', authMiddleware as any, AuthController.me as any);
router.get('/auth/users', authMiddleware as any, AuthController.listUsers as any);

// 2. INGESTA INTELIGENTE SAP
router.post('/sap/upload', upload.single('file'), AvisosController.uploadExcel);
router.get('/sap/sample-file', AvisosController.downloadSample);
router.post('/sap/clear', authMiddleware as any, AvisosController.clearExcelData as any);

// 3. AVISOS Y GESTIÓN DE CAMPO
router.get('/avisos/stats', AvisosController.getStats);
router.get('/avisos/revisiones', AvisosController.getRevisiones);
router.get('/avisos', AvisosController.list);
router.get('/avisos/:id', AvisosController.getById);
router.patch('/avisos/:id', authMiddleware as any, AvisosController.updateFieldData as any);
router.post('/avisos/:id/relevamiento', authMiddleware as any, AvisosController.guardarRelevamiento as any);
router.delete('/avisos/:id', authMiddleware as any, AvisosController.deleteAviso as any);

// 4. TRIAJE OPERATIVO
router.post('/triaje/:avisoId/contacto', authMiddleware as any, TriajeController.registrarContacto as any);
router.get('/triaje/:avisoId/plantilla-respuesta', TriajeController.generarPlantillaRespuesta);

// 5. DOTACIÓN, PERSONAL Y PROGRAMACIÓN SEMANAL DE HH
router.get('/personal', PersonalController.list);
router.post('/personal', authMiddleware as any, PersonalController.create as any);
router.post('/personal/bulk', authMiddleware as any, PersonalController.bulkCreate as any);
router.put('/personal/:id', authMiddleware as any, PersonalController.update as any);
router.delete('/personal/:id', authMiddleware as any, PersonalController.delete as any);
router.post('/personal/:personalId/ausencias', authMiddleware as any, PersonalController.registrarAusencia as any);
router.delete('/personal/ausencias/:id', authMiddleware as any, PersonalController.eliminarAusencia as any);

router.get('/programacion', PersonalController.getProgramacionSemanal);
router.post('/programacion/asignacion', authMiddleware as any, PersonalController.guardarAsignacion as any);
router.delete('/programacion/asignacion/:id', authMiddleware as any, PersonalController.eliminarAsignacion as any);

// 5.1 PROGRAMA DIARIO SEMANAL OFICIAL ARAUCO (PS432026 / PS442026 / IW37N)
router.get('/programacion/arauco', ProgramacionAraucoController.getProgramacion);
router.post('/programacion/arauco/upload', upload.single('file'), ProgramacionAraucoController.uploadPSFile);
router.post('/programacion/arauco/dotacion', authMiddleware as any, ProgramacionAraucoController.updateDotacion as any);
router.post('/programacion/arauco/operacion', authMiddleware as any, ProgramacionAraucoController.saveOperacion as any);
router.post('/programacion/arauco/operacion/:id/evidencia', authMiddleware as any, ProgramacionAraucoController.guardarEvidenciaOperacion as any);
router.post('/programacion/arauco/sync-informe', authMiddleware as any, ProgramacionAraucoController.syncInformeSemanalEndpoint as any);
router.delete('/programacion/arauco/operacion/:id', authMiddleware as any, ProgramacionAraucoController.removeOperacion as any);
router.get('/operaciones/backlog', ProgramacionAraucoController.getBacklogOperaciones);

// 6. OBRAS Y LIBRO DIARIO
router.get('/obras', ObrasController.listObras);
router.post('/obras', authMiddleware as any, ObrasController.createObra as any);
router.get('/obras/:obraId/libro-diario', ObrasController.getLibroDiarioEntries);
router.post('/obras/:obraId/libro-diario', authMiddleware as any, ObrasController.createLibroDiarioEntry as any);
router.post('/libro-diario/validar/:token', ObrasController.validarFirmaCliente);

// 7. INFORMES TÉCNICOS CRR
router.get('/informes', InformesController.list);
router.get('/informes/:id', InformesController.getById);
router.get('/informes/:id/export-html', InformesController.exportHTML);
router.post('/informes', authMiddleware as any, InformesController.create as any);

// 8. ADMINISTRACIÓN, LIMPIEZA Y ESTADO DE RENDER / SISTEMA
router.get('/system/status', AdminController.getSystemStatus);
router.post('/admin/clean-demo', authMiddleware as any, AdminController.cleanDemoData as any);

export default router;
