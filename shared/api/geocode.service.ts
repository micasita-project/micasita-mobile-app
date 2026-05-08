/**
 * @layer shared/api
 * @description Servicio de geocodificación (proxy Nominatim en el backend).
 * Autocompletado de direcciones limitado a Lima, Perú.
 */

import { apiClient } from './apiClient';

export interface GeocodeSuggestion {
  display_name: string;
  latitude: number;
  longitude: number;
  place_type: string;
  district?: string | null;
}

/**
 * Busca direcciones usando el proxy de Nominatim del backend.
 * @param query - Texto de búsqueda (min 3 caracteres)
 * @param limit - Máximo de resultados (default 5)
 */
export async function searchAddress(
  query: string,
  limit: number = 5
): Promise<GeocodeSuggestion[]> {
  if (query.trim().length < 3) return [];

  const response = await apiClient.get<GeocodeSuggestion[]>('/geocode/search', {
    params: { q: query, limit },
  });
  return response.data;
}

/**
 * Obtiene la dirección a partir de coordenadas (reverse geocoding).
 */
export async function reverseAddress(
  lat: number,
  lon: number
): Promise<GeocodeSuggestion> {
  const response = await apiClient.get<GeocodeSuggestion>('/geocode/reverse', {
    params: { lat, lon },
  });
  return response.data;
}
