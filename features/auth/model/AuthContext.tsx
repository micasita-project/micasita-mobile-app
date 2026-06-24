/**
 * @layer features/auth/model
 * @description Contexto de Autenticación con React Context API.
 * Conectado al backend real (FastAPI + JWT).
 */

import { createPreference } from "@/entities/recommendation-preferences";
import { createWorkplace } from "@/entities/workplace/api/workplace.api";
import { getAuthToken, queryClient } from "@/shared/api";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, UserHomeUpdate } from "../api/auth.service";
import {
  getMe,
  loginUser,
  logoutUser,
  registerUser,
  resendVerification as resendVerificationApi,
  updateHome,
  verifyEmail,
} from "../api/auth.service";

export interface GuestDataForTransfer {
  home?: { lat: number; lon: number; address: string };
  workplace?: {
    lat: number;
    lon: number;
    budget: number;
    transport: string;
    address: string;
    maxDistanceKm?: number;
  };
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthContextValue extends AuthState {
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  register: (
    email: string,
    password: string,
    guestData?: GuestDataForTransfer,
    name?: string,
    lastName?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setHome: (data: UserHomeUpdate) => Promise<boolean>;
  refreshUser: () => Promise<void>;
  /** Email pendiente de verificación (tras registro o login bloqueado). */
  pendingEmail: string | null;
  /** Verifica el OTP, inicia sesión y transfiere los datos de invitado. */
  completePendingVerification: (
    otp: string,
  ) => Promise<{ success: boolean; error?: string }>;
  /** Reenvía el OTP de verificación de correo. */
  resendVerification: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Provider que envuelve la aplicación y proporciona
 * el estado de autenticación a todos los componentes hijos.
 */
interface PendingVerification {
  email: string;
  password: string;
  guestData?: GuestDataForTransfer;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pendingVerification, setPendingVerification] =
    useState<PendingVerification | null>(null);

  // Transfiere casa y workplace del invitado a la cuenta recién verificada.
  const applyGuestData = useCallback(
    async (guestData?: GuestDataForTransfer): Promise<AuthUser> => {
      let userProfile = await getMe();
      if (guestData?.home) {
        try {
          userProfile = await updateHome({
            home_lat: guestData.home.lat,
            home_lon: guestData.home.lon,
            home_address: guestData.home.address,
          });
        } catch {}
      }
      if (guestData?.workplace) {
        try {
          const wp = await createWorkplace({
            work_address:
              guestData.workplace.address.split(",")[0].trim() || "Mi Trabajo",
            work_lat: guestData.workplace.lat,
            work_lon: guestData.workplace.lon,
          });
          await createPreference({
            workplace_id: wp.id,
            budget: guestData.workplace.budget,
            preferred_transportation: guestData.workplace.transport,
            max_distance_km: guestData.workplace.maxDistanceKm,
          });
        } catch {}
      }
      return userProfile;
    },
    [],
  );

  const clearSession = useCallback(async () => {
    setUser(null);
    await logoutUser();
    queryClient.clear();
  }, []);

  // Al montar, verificar si hay un token guardado (sesión persistida)
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getAuthToken();
        if (token) {
          const userProfile = await getMe();
          setUser({ ...userProfile });
        }
      } catch (error: any) {
        if (error?.response?.status === 401) {
          await clearSession();
        } else {
          console.error("Failed to restore session", error);
        }
      } finally {
        setIsInitialized(true);
      }
    };
    restoreSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    try {
      const userProfile = await getMe();
      setUser({ ...userProfile });
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await clearSession();
      } else {
        console.error("Failed to refresh user", error);
      }
    }
  }, [clearSession]);

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
      setIsLoading(true);
      try {
        await loginUser(email, password);
        const userProfile = await getMe();
        setUser({ ...userProfile });
        setIsLoading(false);
        return { success: true };
      } catch (error: any) {
        console.error("Login failed:", error);
        setIsLoading(false);

        if (error?.response?.status === 403) {
          const detail: string = error?.response?.data?.detail ?? "";
          // El backend bloquea el login si el correo no está verificado
          if (detail.toLowerCase().includes("verifica")) {
            setPendingVerification({ email, password });
            return { success: false, error: detail, needsVerification: true };
          }
          return {
            success: false,
            error:
              detail ||
              "Tu cuenta ha sido bloqueada. Comunícate con un administrador.",
          };
        }
        return { success: false, error: "Email o contraseña incorrectos." };
      }
    },
    [],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      guestData?: GuestDataForTransfer,
      name?: string,
      lastName?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      try {
        await registerUser({ email, password, name, last_name: lastName });
        // El backend crea la cuenta sin verificar y envía un OTP por correo.
        // Guardamos los datos para completar login + transferencia tras verificar.
        setPendingVerification({ email, password, guestData });
        setIsLoading(false);
        return { success: true };
      } catch (error: any) {
        console.error("Register failed:", error);
        setIsLoading(false);
        const message = error?.response?.data?.detail ?? "Error al registrar";
        return { success: false, error: message };
      }
    },
    [],
  );

  const completePendingVerification = useCallback(
    async (otp: string): Promise<{ success: boolean; error?: string }> => {
      if (!pendingVerification) {
        return {
          success: false,
          error: "La sesión expiró. Inicia sesión nuevamente.",
        };
      }
      const { email, password, guestData } = pendingVerification;
      setIsLoading(true);
      try {
        await verifyEmail(email, otp);
        await loginUser(email, password);
        const userProfile = await applyGuestData(guestData);
        setUser({ ...userProfile });
        setPendingVerification(null);
        setIsLoading(false);
        return { success: true };
      } catch (error: any) {
        console.error("Verification failed:", error);
        setIsLoading(false);
        const message =
          error?.response?.data?.detail ?? "Código incorrecto o expirado.";
        return { success: false, error: message };
      }
    },
    [pendingVerification, applyGuestData],
  );

  const resendVerification = useCallback(
    async (email: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await resendVerificationApi(email);
        return { success: true };
      } catch (error: any) {
        const message =
          error?.response?.data?.detail ?? "No se pudo reenviar el código.";
        return { success: false, error: message };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const setHome = useCallback(
    async (data: UserHomeUpdate): Promise<boolean> => {
      setIsLoading(true);
      try {
        const updatedUser = await updateHome(data);
        setUser({ ...updatedUser });
        setIsLoading(false);
        return true;
      } catch (error) {
        console.error("Failed to update home:", error);
        setIsLoading(false);
        return false;
      }
    },
    [],
  );

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
    pendingEmail: pendingVerification?.email ?? null,
    completePendingVerification,
    resendVerification,
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
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}
