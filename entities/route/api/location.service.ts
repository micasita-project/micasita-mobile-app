/**
 * @layer entities/route/model
 * @description Location service with real road routing via OSRM.
 *
 * Uses routing.openstreetmap.de which supports individual profiles
 * for car, bike, and foot, returning authentic geometries.
 */

import type { Coordinate, RouteSegment, MultiModeRoutes, TransportMode } from '@/shared/types';
import { TRANSPORT_MODE_SPEEDS } from '@/shared/types';
import { ENV } from '@/shared/config/env';


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
 * Fetches a real road-based route for a specific transport mode.
 */
export async function fetchModeRoute(
  origin: Coordinate,
  destination: Coordinate,
  mode: TransportMode
): Promise<RouteSegment> {
  try {
    let baseUrl = ENV.OSRM_DRIVING_URL;
    if (mode === 'cycling') baseUrl = ENV.OSRM_CYCLING_URL;
    if (mode === 'walking') baseUrl = ENV.OSRM_WALKING_URL;

    const url = `${baseUrl}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?geometries=geojson&overview=full`;

    const response = await Promise.race([
      fetch(url),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);
    
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn(`OSRM ${mode} returned no routes, falling back to straight line`);
      return generateFallbackRoute(origin, destination, mode);
    }

    const route = data.routes[0];
    const geometry = route.geometry;

    const waypoints: Coordinate[] = geometry.coordinates.map(
      ([lon, lat]: number[]) => ({
        latitude: lat,
        longitude: lon,
      })
    );

    const distanceMeters = route.distance || 0;
    const timeSeconds = route.duration || 0;

    const distanceKm = Math.round((distanceMeters / 1000) * 100) / 100;
    const timeMinutes = Math.round(timeSeconds / 60);

    return {
      origin,
      destination,
      waypoints,
      distanceKm,
      timeMinutes,
    };
  } catch (error) {
    console.warn(`OSRM fetch failed for ${mode}, falling back to straight line:`, error);
    return generateFallbackRoute(origin, destination, mode);
  }
}

/**
 * Legacy wrapper for driving only.
 */
export async function fetchRoute(
  origin: Coordinate,
  destination: Coordinate
): Promise<RouteSegment> {
  return fetchModeRoute(origin, destination, 'driving');
}

/**
 * Calculates authentic routes for all 3 transport modes.
 * Uses real geometries and real duration for each mode.
 */
export async function fetchMultiModeRoutes(
  origin: Coordinate,
  destination: Coordinate
): Promise<MultiModeRoutes> {
  const [driving, cycling, walking] = await Promise.all([
    fetchModeRoute(origin, destination, 'driving'),
    fetchModeRoute(origin, destination, 'cycling'),
    fetchModeRoute(origin, destination, 'walking')
  ]);

  return { driving, cycling, walking };
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

/** Finds the fastest transport mode */
export function getOptimalMode(routes: MultiModeRoutes): TransportMode {
  const modes: TransportMode[] = ['driving', 'cycling', 'walking'];
  return modes.reduce((best, mode) =>
    routes[mode].timeMinutes < routes[best].timeMinutes ? mode : best
  );
}
