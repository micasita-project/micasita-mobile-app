/**
 * @layer shared/types
 * @description Core TypeScript interfaces for the MiCasita application.
 * All property names follow English naming conventions.
 */

// ── User Model ──────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  lastName: string;
  avatar?: string;
  /** User's current home/residence */
  currentHome: HomeLocation;
  /** User's workplace */
  workplace: WorkLocation;
}

export interface HomeLocation {
  address: string;
  district: string;
  coordinates: Coordinate;
}

export interface WorkLocation {
  name: string;
  address: string;
  district: string;
  coordinates: Coordinate;
}

// ── Housing Model ───────────────────────────────────────────

export interface Housing {
  id: string;
  title: string;
  /** Property type as free string, e.g. "Departamento", "Casa" */
  property_type: string;
  address: string;
  district: string;
  /** Flat latitude (from scraper schema) */
  latitude: number;
  /** Flat longitude (from scraper schema) */
  longitude: number;
  /** Currency code, e.g. "PEN" */
  currency: string;
  /** Monthly rental price */
  price: number;
  /** Total area in square meters */
  total_area_sqm: number;
  /** Covered / built area in square meters */
  covered_area_sqm?: number;
  bedrooms: number;
  bathrooms: number;
  /** Number of parking spots */
  parking?: number;
  /** Building age in years */
  antiquity?: number;
  description: string;
  /** Array of image URLs or local paths */
  images: string[];
  features: string[];
  /** Original listing URL from the scraper */
  source_url?: string;
  /** Contact phone of the publisher (optional) */
  phone?: string;
  isFavorite?: boolean;
}

// ── Coordinates & Routes ────────────────────────────────────

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type TransportMode = 'driving' | 'cycling' | 'walking';

export interface RouteSegment {
  origin: Coordinate;
  destination: Coordinate;
  waypoints: Coordinate[];
  distanceKm: number;
  timeMinutes: number;
}

/** Colors for each transport mode polyline */
export const TRANSPORT_MODE_COLORS: Record<TransportMode, string> = {
  driving: '#E74C3C',
  cycling: '#27AE60',
  walking: '#2E86C1',
};

/** Average speeds per mode in km/h */
export const TRANSPORT_MODE_SPEEDS: Record<TransportMode, number> = {
  driving: 0, // OSRM provides actual time
  cycling: 15,
  walking: 5,
};

// ── Auth Model ──────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

// ── Publish Housing Model ────────────────────────────────────

/** Estado de validación de un anuncio publicado (HU21) */
export type ListingStatus = 'pending' | 'approved' | 'rejected';

/** Formulario en progreso del wizard de publicación */
export interface HousingDraft {
  // Paso 1 — Ubicación (HU17)
  address: string;
  district: string;
  latitude: number;
  longitude: number;

  // Paso 2 — Características (HU18)
  title: string;
  property_type: string;
  currency: string;
  price: number;
  total_area_sqm: number;
  covered_area_sqm: number;
  bedrooms: number;
  bathrooms: number;
  parking: number;
  antiquity: number;
  description: string;
  /** Teléfono de contacto sin prefijo +51 (9 dígitos) */
  phone: string;

  // Paso 3 — Fotos (HU19)
  /** URIs locales seleccionadas antes de subir a Supabase */
  localImageUris: string[];

  // Paso 4 — Amenidades (HU20)
  features: string[];
}

/** Anuncio publicado, almacenado en Supabase */
export interface PublishedHousing {
  id: string;
  /** ID del usuario propietario */
  userId: string;
  /** Email del usuario para notificaciones (HU25) */
  userEmail: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  // Datos de la vivienda (mismos campos que HousingDraft, sin URIs locales)
  address: string;
  district: string;
  latitude: number;
  longitude: number;
  title: string;
  property_type: string;
  currency: string;
  price: number;
  total_area_sqm: number;
  covered_area_sqm?: number;
  bedrooms: number;
  bathrooms: number;
  parking?: number;
  antiquity?: number;
  description: string;
  /** URLs públicas de Supabase Storage */
  images: string[];
  features: string[];
  source_url?: string;
  phone?: string;
  /** Motivo indicado por el admin al rechazar (solo si status === 'rejected') */
  rejectionReason?: string | null;
}
