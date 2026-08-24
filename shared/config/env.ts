/**
 * @layer shared/config
 * @description Centralized environment variables configuration.
 * Single source of truth for all EXPO_PUBLIC_ vars.
 */

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL!,

  OSM_TILE_URL: process.env.EXPO_PUBLIC_OSM_TILE_URL!,
} as const;
