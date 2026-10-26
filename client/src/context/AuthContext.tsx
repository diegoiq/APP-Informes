import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { AuthUserSummary, UserQuotaStats } from '@app-informes/shared';

interface AuthContextType {
  user: AuthUserSummary | null;
  token: string | null;
  stats: UserQuotaStats | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { nombre: string; email: string; password: string; rol?: string }) => Promise<void>;
  logout: () => void;
  refreshStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserSummary | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [stats, setStats] = useState<UserQuotaStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshStats = async () => {
    try {
      const data = await api.getAuthStats();
      setStats(data);
    } catch (err) {
      console.error('Error al cargar cupos de usuarios:', err);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await refreshStats();
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch (err) {
          console.warn('Sesión caducada o inválida, cerrando sesión.');
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const data = await api.login(credentials);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.usuario);
    await refreshStats();
  };

  const register = async (payload: { nombre: string; email: string; password: string; rol?: string }) => {
    const data = await api.register(payload);
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.usuario);
    await refreshStats();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    refreshStats();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        stats,
        loading,
        login,
        register,
        logout,
        refreshStats
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
