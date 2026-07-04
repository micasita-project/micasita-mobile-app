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

export interface RecommendationPageResponse {
  results: RecommendationItem[];
  total: number;
  /** Mensaje explicativo cuando no hay resultados (ej. presupuesto insuficiente). */
  message: string | null;
  /** Precio mínimo disponible en el radio elegido cuando el presupuesto no alcanza. */
  min_price_in_area: number | null;
}

/** Respuesta cruda de página del backend (property.id es numérico) */
interface RawRecommendationPageResponse {
  results: RawRecommendationItem[];
  total: number;
  message: string | null;
  min_price_in_area: number | null;
}

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

function toRecommendationPage(raw: RawRecommendationPageResponse): RecommendationPageResponse {
  return {
    results: raw.results.map(toRecommendationItem),
    total: raw.total,
    message: raw.message,
    min_price_in_area: raw.min_price_in_area,
  };
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
): Promise<RecommendationPageResponse> {
  console.log('[Recommend] POST /recommend/guest →', data);
  try {
    const response = await apiClient.post<RawRecommendationPageResponse>(
      '/recommend/guest',
      data,
      { timeout: RECOMMEND_TIMEOUT }
    );
    console.log('[Recommend] /recommend/guest ← OK', response.data.total, 'resultados');
    return toRecommendationPage(response.data);
  } catch (error: any) {
    console.error('[Recommend] /recommend/guest ← ERROR', error?.response?.status, error?.message);
    throw error;
  }
}

export interface GenerateOptions {
  max_distance_km?: number;
}

export async function generateRecommendations(
  workplaceId: number,
  options?: GenerateOptions
): Promise<RecommendationPageResponse> {
  console.log(`[Recommend] POST /recommend/workplaces/${workplaceId}/generate →`, options ?? {});
  try {
    const response = await apiClient.post<RawRecommendationPageResponse>(
      `/recommend/workplaces/${workplaceId}/generate`,
      undefined,
      {
        timeout: RECOMMEND_TIMEOUT,
        params: options,
      }
    );
    console.log(`[Recommend] /recommend/workplaces/${workplaceId}/generate ← OK`, response.data.total, 'resultados');
    return toRecommendationPage(response.data);
  } catch (error: any) {
    console.error(`[Recommend] /recommend/workplaces/${workplaceId}/generate ← ERROR`, error?.response?.status, error?.message);
    throw error;
  }
}

export async function getLatestRecommendations(
  workplaceId: number
): Promise<RecommendationPageResponse | null> {
  console.log(`[Recommend] GET /recommend/workplaces/${workplaceId}/latest`);
  try {
    const response = await apiClient.get<RawRecommendationPageResponse>(
      `/recommend/workplaces/${workplaceId}/latest`
    );
    console.log(`[Recommend] /recommend/workplaces/${workplaceId}/latest ← OK`, response.data.total, 'resultados');
    return toRecommendationPage(response.data);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.log(`[Recommend] /recommend/workplaces/${workplaceId}/latest ← 404 (sin cache)`);
      return null;
    }
    console.error(`[Recommend] /recommend/workplaces/${workplaceId}/latest ← ERROR`, error?.response?.status, error?.message);
    throw error;
  }
}

export async function importGuestRecommendations(
  workplaceId: number,
  data: RecommendationPageResponse
): Promise<void> {
  console.log(`[Recommend] POST /recommend/workplaces/${workplaceId}/import-results →`, data.total, 'resultados');
  try {
    await apiClient.post(
      `/recommend/workplaces/${workplaceId}/import-results`,
      data,
      { timeout: RECOMMEND_TIMEOUT }
    );
    console.log(`[Recommend] /recommend/workplaces/${workplaceId}/import-results ← OK`);
  } catch (error: any) {
    console.error(`[Recommend] /recommend/workplaces/${workplaceId}/import-results ← ERROR`, error?.response?.status);
    throw error;
  }
}

export async function getWorkplaceRecommendations(
  workplaceId: number
): Promise<RecommendationPageResponse> {
  console.log(`[Recommend] GET /recommend/workplaces/${workplaceId}`);
  try {
    const response = await apiClient.get<RawRecommendationPageResponse>(
      `/recommend/workplaces/${workplaceId}`
    );
    console.log(`[Recommend] /recommend/workplaces/${workplaceId} ← OK`, response.data.total, 'resultados');
    return toRecommendationPage(response.data);
  } catch (error: any) {
    console.error(`[Recommend] /recommend/workplaces/${workplaceId} ← ERROR`, error?.response?.status, error?.message);
    throw error;
  }
}
