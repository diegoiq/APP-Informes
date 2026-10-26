import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import SapIngesta from './pages/SapIngesta';
import TriajeOperativo from './pages/TriajeOperativo';
import ProgramacionSemanal from './pages/ProgramacionSemanal';
import LibroDiarioObra from './pages/LibroDiarioObra';
import InformesCRR from './pages/InformesCRR';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-4 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>APP-Informes &copy; 2026 | Servicio de Mantenimiento y Estructuras Puesto 340CRR</span>
          <span>Arauco Planta Industrial | Límite Máximo: 5 Usuarios</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas de Autenticación */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Rutas Protegidas Operativas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/sap" replace />} />
              <Route path="/sap" element={<SapIngesta />} />
              <Route path="/triaje" element={<TriajeOperativo />} />
              <Route path="/programacion" element={<ProgramacionSemanal />} />
              <Route path="/obras" element={<LibroDiarioObra />} />
              <Route path="/informes" element={<InformesCRR />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
