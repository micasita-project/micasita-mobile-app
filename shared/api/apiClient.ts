/**
 * @layer shared/api
 * @description Cliente HTTP centralizado (Axios) para comunicarse con el backend de Micasita.
 * Inyecta automáticamente el JWT Token en cada request protegido.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '@/shared/config/env';

const AUTH_TOKEN_KEY = 'micasita_auth_token';

export const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Antes de cada request, inyecta el token JWT si existe
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Token helpers ───────────────────────────────────────────────
export async function saveAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function removeAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}
