/**
 * @layer entities/user
 * @description Barrel export para la entidad User.
 * Exporta datos y tipos relacionados con el usuario.
 */

import type { User } from '@/shared/types';
import usersData from './api/users.data.json';

/** Obtiene todos los usuarios del sistema */
export function getAllUsers(): User[] {
  return usersData as User[];
}

/** Obtiene un usuario por su ID */
export function getUserById(userId: string): User | null {
  const users = usersData as User[];
  return users.find((u) => u.id === userId) ?? null;
}
