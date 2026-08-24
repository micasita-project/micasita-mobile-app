/**
 * @layer entities/route/model
 * @description Location service with real road routing via the backend.
 *
 * The app never calls OSRM directly — GET /route on our own API resolves
 * the route (time corrected by the traffic model, plus geometry for the
 * map). Keeps the routing engine and its credentials server-side, and
 * lets the backend apply the same time correction used in recommendations.
 */

import type { Coordinate, RouteSegment, TransportMode } from '@/shared/types';
import { TRANSPORT_MODE_SPEEDS } from '@/shared/types';
import { apiClient } from '@/shared/api';

const routeCache = new Map<string, RouteSegment>();

function makeCacheKey(origin: Coordinate, destination: Coordinate, mode: TransportMode): string {
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return `${mode}:${r(origin.latitude)},${r(origin.longitude)}->${r(destination.latitude)},${r(destination.longitude)}`;
}


/**
 * Haversine formula: straight-line distance between two coordinates (km).
 */
export function calculateHaversineDistance(
  coord1: Coordinate,
  coord2: Coordinate
): number {
  const R = 6371;
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Fetches a real road-based route for a specific transport mode via the backend.
 */
export async function fetchModeRoute(
  origin: Coordinate,
  destination: Coordinate,
  mode: TransportMode
): Promise<RouteSegment> {
  const key = makeCacheKey(origin, destination, mode);
  const cached = routeCache.get(key);
  if (cached) return cached;

  try {
    const { data } = await apiClient.get('/route', {
      params: {
        origin_lat: origin.latitude,
        origin_lon: origin.longitude,
        dest_lat: destination.latitude,
        dest_lon: destination.longitude,
        mode,
      },
    });

    const result: RouteSegment = {
      origin,
      destination,
      waypoints: data.waypoints,
      distanceKm: data.distance_km,
      timeMinutes: Math.round(data.duration_min),
    };

    routeCache.set(key, result);
    return result;
  } catch (error) {
    console.warn(`/route fetch failed for ${mode}, falling back to straight line:`, error);
    return generateFallbackRoute(origin, destination, mode);
  }
}

/**
 * Fallback route generation when external routing is unavailable.
 */
function generateFallbackRoute(
  origin: Coordinate,
  destination: Coordinate,
  mode: TransportMode = 'driving'
): RouteSegment {
  const distanceKm = calculateHaversineDistance(origin, destination);
  
  // Use speed constants for fallback since we have no real data
  const speed = mode === 'driving' ? 20 : TRANSPORT_MODE_SPEEDS[mode];
  const timeMinutes = Math.round((distanceKm / speed) * 60);

  return {
    origin,
    destination,
    waypoints: [origin, destination],
    distanceKm: Math.round(distanceKm * 100) / 100,
    timeMinutes,
  };
}

/** Estimates driving travel time with Lima traffic (~20 km/h average) */
export function estimateTravelTime(distanceKm: number): number {
  return Math.round((distanceKm / 20) * 60);
}

/** Formats distance to a readable string */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Formats time to a readable string */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
}
