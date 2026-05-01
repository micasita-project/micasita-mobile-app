/**
 * @layer features/auth/api
 * @description Servicio de autenticación conectado al backend real (FastAPI).
 * Maneja registro, login y persistencia del token JWT.
 */

import { apiClient, saveAuthToken, removeAuthToken } from '@/shared/api';

// ── Types ───────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserHomeUpdate {
  home_lat: number;
  home_lon: number;
  home_address: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  home_lat: number | null;
  home_lon: number | null;
  home_address: string | null;
}

// ── API Calls ───────────────────────────────────────────────────

/**
 * Registra un nuevo usuario en el backend.
 */
export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', data);
  return response.data;
}

/**
 * Inicia sesión y persiste el JWT en AsyncStorage.
 * IMPORTANTE: El backend usa OAuth2 form-data, no JSON.
 */
export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await apiClient.post<LoginResponse>('/auth/login', formData.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  // Guardamos el token automáticamente para que el interceptor lo inyecte
  await saveAuthToken(response.data.access_token);

  return response.data;
}

/**
 * Cierra sesión eliminando el token persistido.
 */
export async function logoutUser(): Promise<void> {
  await removeAuthToken();
}

/**
 * Obtiene el perfil del usuario logueado.
 */
export async function getMe(): Promise<AuthUser> {
  const response = await apiClient.get<AuthUser>('/auth/me');
  return response.data;
}

/**
 * Actualiza la ubicación de la casa del usuario.
 */
export async function updateHome(data: UserHomeUpdate): Promise<AuthUser> {
  const response = await apiClient.put<AuthUser>('/auth/me/home', data);
  return response.data;
}
