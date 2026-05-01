/**
 * @layer entities/workplace/model
 * @description React Query hooks para la entidad Workplace.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkplaces,
  createWorkplace,
  deleteWorkplace,
} from '../api/workplace.api';
import type { CreateWorkplaceRequest } from '../api/workplace.api';

export const workplaceKeys = {
  all: ['workplaces'] as const,
};

/**
 * Hook para listar los lugares de trabajo del usuario logueado.
 * Protegido: solo funciona si hay token.
 */
export function useWorkplaces(enabled = true) {
  return useQuery({
    queryKey: workplaceKeys.all,
    queryFn: fetchWorkplaces,
    enabled,
  });
}

/**
 * Hook para crear un nuevo lugar de trabajo.
 */
export function useCreateWorkplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkplaceRequest) => createWorkplace(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workplaceKeys.all });
    },
  });
}

/**
 * Hook para eliminar un lugar de trabajo.
 */
export function useDeleteWorkplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workplaceId: number) => deleteWorkplace(workplaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workplaceKeys.all });
    },
  });
}
