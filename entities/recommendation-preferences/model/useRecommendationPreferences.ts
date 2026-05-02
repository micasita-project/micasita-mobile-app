/**
 * @layer entities/recommendation-preferences/model
 * @description React Query hooks para preferencias de recomendación.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createPreference,
  fetchPreferences,
  updatePreference,
} from '../api/recommendation-preferences.api';
import type {
  CreatePreferenceRequest,
  UpdatePreferenceRequest,
} from '../api/recommendation-preferences.api';

export const preferenceKeys = {
  all: ['recommendation-preferences'] as const,
  byWorkplace: (workplaceId: number) =>
    ['recommendation-preferences', workplaceId] as const,
};

/**
 * Hook para obtener las preferencias de un workplace específico.
 */
export function usePreferences(workplaceId: number | null) {
  return useQuery({
    queryKey: preferenceKeys.byWorkplace(workplaceId ?? 0),
    queryFn: () => fetchPreferences(workplaceId!),
    enabled: workplaceId !== null,
  });
}

/**
 * Hook para crear preferencias de recomendación.
 * Invalida el cache de preferencias tras éxito.
 */
export function useCreatePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePreferenceRequest) => createPreference(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: preferenceKeys.byWorkplace(variables.workplace_id) });
      qc.invalidateQueries({ queryKey: preferenceKeys.all });
    },
  });
}

/**
 * Hook para actualizar preferencias de recomendación.
 * Invalida el cache de preferencias tras éxito.
 */
export function useUpdatePreference() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePreferenceRequest }) =>
      updatePreference(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: preferenceKeys.all });
    },
  });
}
