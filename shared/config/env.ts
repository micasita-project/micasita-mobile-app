/**
 * @layer shared/config
 * @description Centralized environment variables configuration.
 * Single source of truth for all EXPO_PUBLIC_ vars.
 */

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL!,
  
  OSM_TILE_URL: process.env.EXPO_PUBLIC_OSM_TILE_URL!,
  
  OSRM_DRIVING_URL: process.env.EXPO_PUBLIC_OSRM_DRIVING_URL!,
  OSRM_CYCLING_URL: process.env.EXPO_PUBLIC_OSRM_CYCLING_URL!,
  OSRM_WALKING_URL: process.env.EXPO_PUBLIC_OSRM_WALKING_URL!,
} as const;
