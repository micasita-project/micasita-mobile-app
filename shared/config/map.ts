/**
 * @layer shared/config
 * @description Map configuration constants.
 * Includes OSM tile URL, default Lima region, and map settings.
 */

import type { Coordinate } from '@/shared/types';
import { ENV } from './env';

// ── OpenStreetMap Tiles ─────────────────────────────────────

export const OSM_TILE_URL = ENV.OSM_TILE_URL;

// ── Default Region - Lima Metropolitana ─────────────────────

export const LIMA_REGION = {
  latitude: -12.1058,
  longitude: -76.9665,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// ── Map Constants ───────────────────────────────────────────

export const DEFAULT_ZOOM_DELTA = {
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const ROUTE_POLYLINE_WIDTH = 4;
export const MAP_ANIMATION_DURATION = 1000;
