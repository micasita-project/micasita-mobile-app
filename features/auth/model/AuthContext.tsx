/**
 * @layer features/auth/model
 * @description Contexto de Autenticación con React Context API.
 * Conectado al backend real (FastAPI + JWT).
 */

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { loginUser, logoutUser, registerUser, getMe, updateHome } from '../api/auth.service';
import type { AuthUser, UserHomeUpdate } from '../api/auth.service';
import { getAuthToken } from '@/shared/api';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setHome: (data: UserHomeUpdate) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider que envuelve la aplicación y proporciona
 * el estado de autenticación a todos los componentes hijos.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Al montar, verificar si hay un token guardado (sesión persistida)
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getAuthToken();
        if (token) {
          const userProfile = await getMe();
          setUser({ ...userProfile });
        }
      } catch (error) {
        console.error('Failed to restore session', error);
      } finally {
        setIsInitialized(true);
      }
    };
    restoreSession();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userProfile = await getMe();
      setUser({ ...userProfile });
    } catch (error) {
      console.error('Failed to refresh user', error);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await loginUser(email, password);
      const userProfile = await getMe();
      setUser({ ...userProfile });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      await registerUser({ email, password });
      // Registro exitoso → login automático
      const response = await loginUser(email, password);
      const userProfile = await getMe();
      setUser({ ...userProfile });
      setIsLoading(false);
      return { success: true };
    } catch (error: any) {
      console.error('Register failed:', error);
      setIsLoading(false);
      const message = error?.response?.data?.detail ?? 'Error al registrar';
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await logoutUser();
  }, []);

  const setHome = useCallback(async (data: UserHomeUpdate): Promise<boolean> => {
    setIsLoading(true);
    try {
      const updatedUser = await updateHome(data);
      setUser({ ...updatedUser });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Failed to update home:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    isInitialized,
    login,
    register,
    logout,
    setHome,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para acceder al contexto de autenticación.
 * @throws Error si se usa fuera del AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

