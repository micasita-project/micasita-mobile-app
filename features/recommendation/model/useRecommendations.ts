/**
 * @layer features/recommendation/model
 * @description React Query hooks para el motor de recomendaciones IA (XGBoost).
 * Soporta generate (primera vez / refresh), latest (cache rápido), e invitados.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getGuestRecommendations,
  generateRecommendations,
  getLatestRecommendations,
} from '../api/recommendation.api';
import type { GuestRecommendRequest, GenerateOptions } from '../api/recommendation.api';

export const recommendKeys = {
  guest: (data: GuestRecommendRequest | null) =>
    ['recommendations', 'guest', data?.work_lat, data?.work_lon, data?.budget, data?.preferred_transportation] as const,
  latest: (id: number) => ['recommendations', 'latest', id] as const,
};

/**
 * Hook para obtener recomendaciones como invitado (manual/mutation).
 */
export function useGuestRecommendations() {
  return useMutation({
    mutationFn: (data: GuestRecommendRequest) => getGuestRecommendations(data),
  });
}

/**
 * Hook para obtener recomendaciones de invitado automáticamente (query).
 * Se dispara solo cuando se pasan datos válidos.
 */
export function useGuestRecommendationsQuery(data: GuestRecommendRequest | null) {
  return useQuery({
    queryKey: recommendKeys.guest(data),
    queryFn: () => getGuestRecommendations(data!),
    enabled: data !== null,
    staleTime: 5 * 60 * 1000,
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
    mutationFn: ({ workplaceId, options }: { workplaceId: number; options?: GenerateOptions }) =>
      generateRecommendations(workplaceId, options),
    onSuccess: (_data, { workplaceId }) => {
      qc.invalidateQueries({ queryKey: recommendKeys.latest(workplaceId) });
    },
  });
}

/**
 * Regenera las recomendaciones de un workplace SOLO si ya tenía recomendaciones
 * previas (no autogenera para uno que nunca se ha recomendado).
 *
 * Pensado para correr en segundo plano tras cambiar las preferencias de un
 * workplace: usa las preferencias recién guardadas e invalida el cache `latest`.
 * Devuelve true si regeneró. Nunca lanza (no debe romper el guardado).
 */
export function useRegenerateIfExists() {
  const qc = useQueryClient();
  return useCallback(
    async (workplaceId: number): Promise<boolean> => {
      try {
        const existing = await getLatestRecommendations(workplaceId);
        if (!existing) return false; // nunca tuvo recomendaciones → no autogenerar
        await generateRecommendations(workplaceId); // usa las preferencias actualizadas
        qc.invalidateQueries({ queryKey: recommendKeys.latest(workplaceId) });
        return true;
      } catch {
        return false;
      }
    },
    [qc],
  );
}
