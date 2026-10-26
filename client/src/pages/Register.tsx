import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HardHat, Lock, Mail, User, Shield, AlertCircle, Users, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
  const { register, stats } = useAuth();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('programador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limiteAlcanzado = stats ? stats.limiteAlcanzado : false;
  const cuposOcupados = stats ? stats.registrados : 0;
  const maxCupos = stats ? stats.maximo : 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limiteAlcanzado) {
      setError('Límite alcanzado: la aplicación no admite más de 5 usuarios registrados.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await register({ nombre, email, password, rol });
      navigate('/sap');
    } catch (err: any) {
      setError(err.message || 'Error al registrar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-emerald-600/20 to-sky-600/10 blur-[100px] pointer-events-none rounded-full"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-emerald-500 to-sky-600 p-3 rounded-2xl shadow-xl shadow-sky-950/50 flex items-center justify-center">
            <HardHat className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-white tracking-tight">
          Registro de Usuario
        </h2>
        <p className="mt-1 text-center text-sm text-slate-400">
          Alta en el sistema operativo APP-Informes 340CRR
        </p>

        {/* Badge Visual de Cupos (Cupos ocupados: X / 5) */}
        <div className="mt-4 flex justify-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border shadow-lg ${
              limiteAlcanzado
                ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border-emerald-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Cupos ocupados: {cuposOcupados} / {maxCupos}</span>
            {limiteAlcanzado ? (
              <span className="text-[10px] bg-red-800 text-white px-2 py-0.5 rounded-full">LLENO</span>
            ) : (
              <span className="text-[10px] bg-emerald-800 text-white px-2 py-0.5 rounded-full">
                {maxCupos - cuposOcupados} disponibles
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          
          {limiteAlcanzado && (
            <div className="mb-6 bg-red-950/80 border border-red-700 text-red-200 text-sm p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Límite alcanzado</div>
                <div className="text-xs text-red-300 mt-0.5">
                  La aplicación no admite más de 5 usuarios registrados. Por favor comuníquese con el administrador para liberar un cupo.
                </div>
              </div>
            </div>
          )}

          {error && !limiteAlcanzado && (
            <div className="mb-6 bg-red-950/60 border border-red-800 text-red-200 text-sm p-3.5 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Nombre y Apellido
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="h-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  disabled={limiteAlcanzado}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Marcelo Salas R."
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  disabled={limiteAlcanzado}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@arauco-crr.cl"
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Contraseña
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  disabled={limiteAlcanzado}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Rol Operativo
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Shield className="h-5 h-5" />
                </div>
                <select
                  disabled={limiteAlcanzado}
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm disabled:opacity-50"
                >
                  <option value="programador">Programador de Tareas</option>
                  <option value="supervisor">Supervisor de Obra</option>
                  <option value="admin">Administrador General</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || limiteAlcanzado}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white transition shadow-lg mt-2 ${
                limiteAlcanzado
                  ? 'bg-slate-700 cursor-not-allowed text-slate-400'
                  : 'bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 focus:ring-2 focus:ring-sky-500 shadow-sky-950/50 cursor-pointer'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{limiteAlcanzado ? 'Registro Deshabilitado (Cupo Completo)' : 'Registrar Usuario'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/login"
              className="text-xs text-sky-400 hover:text-sky-300 font-medium transition"
            >
              ¿Ya tienes una cuenta registrada? Inicia sesión aquí
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
