/**
 * @layer shared/config
 * @description Paleta de colores centralizada de la aplicación MiCasita.
 *
 * En Feature-Sliced Design, los colores pertenecen a la capa "shared"
 * porque son utilizados por TODOS los niveles superiores (entities,
 * features, widgets, pages).
 *
 * Colores principales:
 * - Primario (#34216b): Morado oscuro
 * - Fondo (#ebe7f3): Blanco cremoso/lavanda
 */

export const Colors = {
  // ── Colores Principales ─────────────────────────────────
  primary: '#34216b',
  primaryLight: '#4a3a8a',
  primaryDark: '#241752',

  // ── Fondos ───────────────────────────────────────────────
  background: '#ebe7f3',
  surface: '#FFFFFF',
  surfaceElevated: '#f5f3f9',

  // ── Texto ────────────────────────────────────────────────
  textPrimary: '#1a1a2e',
  textSecondary: '#6b6b80',
  textOnPrimary: '#FFFFFF',
  textMuted: '#9e9eb0',

  // ── Acentos Funcionales ──────────────────────────────────
  accent: '#2E86C1',
  success: '#27ae60',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#3498db',

  // ── Mapa y Telemetría ────────────────────────────────────
  routePolyline: '#2E86C1',
  routePolylineAlternative: '#85C1E9',
  telemetryBackground: 'rgba(0, 0, 0, 0.85)',
  telemetryText: '#00FF41',
  telemetryTextSecondary: '#FFFFFF',
  markerHousing: '#34216b',
  markerWork: '#e74c3c',
  markerUser: '#2E86C1',

  // ── Bordes y Sombras ─────────────────────────────────────
  border: '#d4d0e0',
  borderLight: '#ece8f4',
  shadow: 'rgba(52, 33, 107, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',

  // ── Overlay ──────────────────────────────────────────────
  overlay: 'rgba(26, 26, 46, 0.5)',
} as const;

export type ColorKey = keyof typeof Colors;
