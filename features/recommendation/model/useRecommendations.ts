/**
 * @layer features/recommendation/model
 * @description React Query hooks para el motor de recomendaciones IA (XGBoost).
 * Soporta generate (primera vez / refresh), latest (cache rápido), e invitados.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getGuestRecommendations,
  generateRecommendations,
  getLatestRecommendations,
} from '../api/recommendation.api';
import type { GuestRecommendRequest } from '../api/recommendation.api';

export const recommendKeys = {
  guest: ['recommendations', 'guest'] as const,
  latest: (id: number) => ['recommendations', 'latest', id] as const,
};

/**
 * Hook para obtener recomendaciones como invitado.
 * Se usa como Mutation porque el usuario envía datos manualmente.
 */
export function useGuestRecommendations() {
  return useMutation({
    mutationFn: (data: GuestRecommendRequest) => getGuestRecommendations(data),
  });
}

/**
 * Hook para leer la ÚLTIMA recomendación cacheada (sin ejecutar IA).
 * Se dispara automáticamente cuando se pasa un workplaceId válido.
 */
export function useLatestRecommendations(workplaceId: number | null) {
  return useQuery({
    queryKey: recommendKeys.latest(workplaceId ?? 0),
    queryFn: () => getLatestRecommendations(workplaceId!),
    enabled: workplaceId !== null,
  });
}

/**
 * Hook para GENERAR nuevas recomendaciones (ejecuta XGBoost + guarda en historial).
 * Usar con moderación. Invalida el cache de latest después de éxito.
 */
export function useGenerateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workplaceId: number) => generateRecommendations(workplaceId),
    onSuccess: (_data, workplaceId) => {
      // Invalidar el cache de latest para que se refresque
      qc.invalidateQueries({ queryKey: recommendKeys.latest(workplaceId) });
    },
  });
}
