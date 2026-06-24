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
  name?: string;
  last_name?: string;
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
  name?: string | null;
  last_name?: string | null;
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

export interface UpdateProfileRequest {
  name?: string;
  last_name?: string;
}

/**
 * Actualiza nombre y apellido del usuario.
 * Requiere PATCH /auth/me en el backend.
 */
export async function updateProfile(data: UpdateProfileRequest): Promise<AuthUser> {
  const response = await apiClient.patch<AuthUser>('/auth/me', data);
  return response.data;
}

// ── Verificación de correo y recuperación de contraseña ──────────

export interface MessageResponse {
  message: string;
}

/**
 * Verifica el correo del usuario con el OTP enviado al registrarse.
 * POST /auth/verify-email
 */
export async function verifyEmail(email: string, otp: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>('/auth/verify-email', { email, otp });
  return response.data;
}

/**
 * Reenvía el OTP de verificación de correo.
 * POST /auth/resend-verification
 */
export async function resendVerification(email: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>('/auth/resend-verification', { email });
  return response.data;
}

/**
 * Solicita un OTP para restablecer la contraseña.
 * El backend responde siempre genérico (no revela si el email existe).
 * POST /auth/forgot-password
 */
export async function forgotPassword(email: string): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>('/auth/forgot-password', { email });
  return response.data;
}

/**
 * Restablece la contraseña usando el OTP recibido.
 * POST /auth/reset-password
 */
export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>('/auth/reset-password', {
    email,
    otp,
    new_password: newPassword,
  });
  return response.data;
}

/**
 * Cambia la contraseña con la sesión activa (verifica la contraseña actual).
 * POST /auth/me/change-password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<MessageResponse> {
  const response = await apiClient.post<MessageResponse>('/auth/me/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
}
