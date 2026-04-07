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
  address: string;
  district: string;
  /** Monthly price in PEN (Soles) */
  price: number;
  bedrooms: number;
  bathrooms: number;
  /** Area in square meters */
  area: number;
  description: string;
  image: string;
  coordinates: Coordinate;
  features: string[];
  type: 'apartment' | 'house' | 'room';
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

/** Route info per transport mode */
export interface MultiModeRoutes {
  driving: RouteSegment;
  cycling: RouteSegment;
  walking: RouteSegment;
}

/** Comparison between current home → work vs new home → work */
export interface RouteSavings {
  currentRoute: RouteSegment;
  newRoute: RouteSegment;
  savedMinutes: number;
  savedKm: number;
  /** Positive = saves time, negative = takes longer */
  savingsPercentage: number;
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
