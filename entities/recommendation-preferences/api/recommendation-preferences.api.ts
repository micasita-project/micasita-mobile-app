/**
 * @layer entities/recommendation-preferences/api
 * @description Servicio CRUD para preferencias de recomendación IA.
 * Separadas del Workplace para permitir configuración flexible por lugar de trabajo.
 */

import { apiClient } from "@/shared/api";

// ── Types ───────────────────────────────────────────────────────

export interface RecommendationPreference {
  id: number;
  user_id: number;
  workplace_id: number;
  budget: number;
  preferred_transportation: string;
  max_distance_km: number | null;
}

export interface CreatePreferenceRequest {
  workplace_id: number;
  budget: number;
  preferred_transportation: string;
  max_distance_km?: number;
}

export interface UpdatePreferenceRequest {
  budget?: number;
  preferred_transportation?: string;
  max_distance_km?: number;
}

// ── API Calls ───────────────────────────────────────────────────

/**
 * Crea preferencias de recomendación para un workplace.
 * Debe llamarse inmediatamente después de crear un Workplace.
 */
export async function createPreference(
  data: CreatePreferenceRequest,
): Promise<RecommendationPreference> {
  const response = await apiClient.post<RecommendationPreference>(
    "/recommendation_preferences/",
    data,
  );
  return response.data;
}

/**
 * Obtiene las preferencias de recomendación, opcionalmente filtradas por workplace.
 */
export async function fetchPreferences(
  workplaceId?: number,
): Promise<RecommendationPreference[]> {
  const response = await apiClient.get<RecommendationPreference[]>(
    "/recommendation_preferences/",
    { params: workplaceId ? { workplace_id: workplaceId } : undefined },
  );
  return response.data;
}

/**
 * Actualiza las preferencias de recomendación (budget, transporte, distancia).
 * PATCH /recommendation_preferences/{id}
 */
export async function updatePreference(
  id: number,
  data: UpdatePreferenceRequest,
): Promise<RecommendationPreference> {
  const response = await apiClient.patch<RecommendationPreference>(
    `/recommendation_preferences/${id}`,
    data,
  );
  return response.data;
}
