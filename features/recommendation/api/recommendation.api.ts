/**
 * @layer features/recommendation/api
 * @description Servicio de recomendaciones IA conectado al backend (XGBoost).
 * Soporta generate (ejecuta IA), latest (lee cache), e invitados.
 */

import { apiClient } from '@/shared/api';
import type { Housing } from '@/shared/types';

// ── Types ───────────────────────────────────────────────────────

export interface GuestRecommendRequest {
  work_lat: number;
  work_lon: number;
  budget: number;
  preferred_transportation: string;
}

export interface RecommendationItem {
  property: Housing;
  match_score: number;
  predicted_time_min: number;
}

/** Respuesta cruda del backend (property tiene id numérico) */
interface RawRecommendationItem {
  property: {
    id: number;
    publisher_id: number;
    title: string;
    property_type: string;
    district: string;
    address: string;
    latitude: number;
    longitude: number;
    currency: string | null;
    price: number | null;
    total_area_sqm: number;
    covered_area_sqm: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    parking: number | null;
    antiquity: number | null;
    description: string | null;
    images: string[];
    source_url: string | null;
  };
  match_score: number;
  predicted_time_min: number;
}

function toRecommendationItem(raw: RawRecommendationItem): RecommendationItem {
  return {
    match_score: raw.match_score,
    predicted_time_min: raw.predicted_time_min,
    property: {
      id: String(raw.property.id),
      title: raw.property.title,
      property_type: raw.property.property_type,
      address: raw.property.address,
      district: raw.property.district,
      latitude: raw.property.latitude,
      longitude: raw.property.longitude,
      currency: raw.property.currency ?? 'PEN',
      price: raw.property.price ?? 0,
      total_area_sqm: raw.property.total_area_sqm,
      covered_area_sqm: raw.property.covered_area_sqm ?? undefined,
      bedrooms: raw.property.bedrooms ?? 0,
      bathrooms: raw.property.bathrooms ?? 0,
      parking: raw.property.parking ?? undefined,
      antiquity: raw.property.antiquity ?? undefined,
      description: raw.property.description ?? '',
      images: raw.property.images ?? [],
      features: [],
      source_url: raw.property.source_url ?? undefined,
    },
  };
}

// ── API Calls ───────────────────────────────────────────────────

/**
 * Obtiene recomendaciones para un usuario invitado (sin cuenta).
 */
export async function getGuestRecommendations(
  data: GuestRecommendRequest
): Promise<RecommendationItem[]> {
  const response = await apiClient.post<RawRecommendationItem[]>('/recommend/guest', data);
  return response.data.map(toRecommendationItem);
}

/**
 * Ejecuta XGBoost y GUARDA el resultado en el historial de la DB.
 * Usar con moderación: cada llamada corre el modelo de IA.
 */
export async function generateRecommendations(
  workplaceId: number
): Promise<RecommendationItem[]> {
  const response = await apiClient.post<RawRecommendationItem[]>(
    `/recommend/workplaces/${workplaceId}/generate`
  );
  return response.data.map(toRecommendationItem);
}

/**
 * Lee la ÚLTIMA recomendación cacheada SIN ejecutar IA.
 * Instantáneo — lee de PostgreSQL.
 * Retorna null si no hay recomendaciones guardadas.
 */
export async function getLatestRecommendations(
  workplaceId: number
): Promise<RecommendationItem[] | null> {
  try {
    const response = await apiClient.get<RawRecommendationItem[]>(
      `/recommend/workplaces/${workplaceId}/latest`
    );
    return response.data.map(toRecommendationItem);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null; // No hay recomendaciones guardadas aún
    }
    throw error;
  }
}

/**
 * LEGACY: Obtiene recomendaciones directas sin cachear.
 * @deprecated Usar generateRecommendations en su lugar.
 */
export async function getWorkplaceRecommendations(
  workplaceId: number
): Promise<RecommendationItem[]> {
  const response = await apiClient.get<RawRecommendationItem[]>(
    `/recommend/workplaces/${workplaceId}`
  );
  return response.data.map(toRecommendationItem);
}
