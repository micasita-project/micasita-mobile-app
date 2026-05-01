/**
 * @layer features/recommendation/api
 * @description Servicio de recomendaciones IA conectado al backend (XGBoost).
 * Soporta generate (ejecuta IA), latest (lee cache), e invitados.
 *
 * Timeout extendido a 60s: XGBoost puede tardar más de los 15s por defecto.
 */

import { apiClient } from '@/shared/api';
import type { Housing } from '@/shared/types';

const RECOMMEND_TIMEOUT = 60_000;

// ── Types ────────────────────────────────────────────────────────

export interface GuestRecommendRequest {
  work_lat: number;
  work_lon: number;
  budget: number;
  preferred_transportation: string;
  max_distance_km?: number;
  limit?: number;
  home_lat?: number;
  home_lon?: number;
}

export interface RecommendationItem {
  property: Housing;
  match_score: number;
  predicted_time_min: number;
  /** Minutos ahorrados vs viaje actual. null si el usuario no tiene casa registrada. */
  time_saved_mins: number | null;
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
  time_saved_mins: number | null;
}

function toRecommendationItem(raw: RawRecommendationItem): RecommendationItem {
  return {
    match_score: raw.match_score,
    predicted_time_min: raw.predicted_time_min,
    time_saved_mins: raw.time_saved_mins ?? null,
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

// ── API Calls ────────────────────────────────────────────────────

export async function getGuestRecommendations(
  data: GuestRecommendRequest
): Promise<RecommendationItem[]> {
  console.log('[Recommend] POST /recommend/guest →', data);
  try {
    const response = await apiClient.post<RawRecommendationItem[]>(
      '/recommend/guest',
      data,
      { timeout: RECOMMEND_TIMEOUT }
    );
    console.log('[Recommend] /recommend/guest ← OK', response.data.length, 'resultados');
    return response.data.map(toRecommendationItem);
  } catch (error: any) {
    console.error('[Recommend] /recommend/guest ← ERROR', error?.response?.status, error?.message);
    throw error;
  }
}

export interface GenerateOptions {
  max_distance_km?: number;
  limit?: number;
}

export async function generateRecommendations(
  workplaceId: number,
  options?: GenerateOptions
): Promise<RecommendationItem[]> {
  console.log(`[Recommend] POST /recommend/workplaces/${workplaceId}/generate →`, options ?? {});
  try {
    const response = await apiClient.post<RawRecommendationItem[]>(
      `/recommend/workplaces/${workplaceId}/generate`,
      undefined,
      {
        timeout: RECOMMEND_TIMEOUT,
        params: options,
      }
    );
    console.log(`[Recommend] /recommend/workplaces/${workplaceId}/generate ← OK`, response.data.length, 'resultados');
    return response.data.map(toRecommendationItem);
  } catch (error: any) {
    console.error(`[Recommend] /recommend/workplaces/${workplaceId}/generate ← ERROR`, error?.response?.status, error?.message);
    throw error;
  }
}

export async function getLatestRecommendations(
  workplaceId: number
): Promise<RecommendationItem[] | null> {
  console.log(`[Recommend] GET /recommend/workplaces/${workplaceId}/latest`);
  try {
    const response = await apiClient.get<RawRecommendationItem[]>(
      `/recommend/workplaces/${workplaceId}/latest`
    );
    console.log(`[Recommend] /recommend/workplaces/${workplaceId}/latest ← OK`, response.data.length, 'resultados');
    return response.data.map(toRecommendationItem);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.log(`[Recommend] /recommend/workplaces/${workplaceId}/latest ← 404 (sin cache)`);
      return null;
    }
    console.error(`[Recommend] /recommend/workplaces/${workplaceId}/latest ← ERROR`, error?.response?.status, error?.message);
    throw error;
  }
}

export async function getWorkplaceRecommendations(
  workplaceId: number
): Promise<RecommendationItem[]> {
  console.log(`[Recommend] GET /recommend/workplaces/${workplaceId}`);
  try {
    const response = await apiClient.get<RawRecommendationItem[]>(
      `/recommend/workplaces/${workplaceId}`
    );
    console.log(`[Recommend] /recommend/workplaces/${workplaceId} ← OK`, response.data.length, 'resultados');
    return response.data.map(toRecommendationItem);
  } catch (error: any) {
    console.error(`[Recommend] /recommend/workplaces/${workplaceId} ← ERROR`, error?.response?.status, error?.message);
    throw error;
  }
}
