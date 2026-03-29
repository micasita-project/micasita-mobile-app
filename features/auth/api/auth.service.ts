/**
 * @layer features/auth/api
 * @description Servicio de autenticación mock.
 * Valida credenciales contra datos de la entidad User.
 */

import type { User } from '@/shared/types';
import { getAllUsers } from '@/entities/user';
import { ENV } from '@/shared/config/env';

/**
 * Autentica un usuario con email y contraseña.
 * @returns Usuario autenticado o null si credenciales inválidas
 */
export function authenticateUser(
  email: string,
  password: string
): User | null {
  const users = getAllUsers();
  const envEmail = ENV.DEMO_EMAIL;
  const envPassword = ENV.DEMO_PASSWORD;

  // Override to always let the env credentials log in as the first user (the demo profile)
  if (email.toLowerCase() === envEmail.toLowerCase() && password === envPassword) {
    if (users.length > 0) return users[0];
  }

  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  return user ?? null;
}
