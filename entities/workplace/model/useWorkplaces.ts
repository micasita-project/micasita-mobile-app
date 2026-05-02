/**
 * @layer entities/workplace/model
 * @description React Query hooks para la entidad Workplace.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchWorkplaces,
  createWorkplace,
  deleteWorkplace,
  updateWorkplace,
} from '../api/workplace.api';
import type { CreateWorkplaceRequest, UpdateWorkplaceRequest } from '../api/workplace.api';

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

/**
 * Hook para actualizar un lugar de trabajo.
 */
export function useUpdateWorkplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateWorkplaceRequest }) => updateWorkplace(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workplaceKeys.all });
    },
  });
}
