/**
 * @layer features/route-calculation/model
 * @description Hook for fetching a single route (one origin, one fixed
 * transport mode) to draw on the map. Time/distance for known housings
 * already come from the recommendation itself — this hook exists only to
 * get the route geometry (polyline) for the currently selected one.
 */

import { useCallback, useRef, useState } from 'react';
import type { Coordinate, RouteSegment, TransportMode } from '@/shared/types';
import { fetchModeRoute } from '@/entities/route';

interface RouteCalculationState {
  route: RouteSegment | null;
  isCalculating: boolean;
  calculateRoute: (origin: Coordinate, destination: Coordinate, mode: TransportMode) => void;
  clearRoute: () => void;
}

export function useRouteCalculation(): RouteCalculationState {
  const [route, setRoute] = useState<RouteSegment | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  // Descarta respuestas obsoletas: si se pide una ruta nueva (otra vivienda)
  // antes de que la anterior resuelva, esa respuesta tardía ya no debe pisar
  // el polyline de la selección actual.
  const requestIdRef = useRef(0);

  const calculateRoute = useCallback(
    async (origin: Coordinate, destination: Coordinate, mode: TransportMode) => {
      const requestId = ++requestIdRef.current;
      setIsCalculating(true);
      try {
        const result = await fetchModeRoute(origin, destination, mode);
        if (requestId === requestIdRef.current) setRoute(result);
      } catch (error) {
        console.warn('Route calculation failed:', error);
      } finally {
        if (requestId === requestIdRef.current) setIsCalculating(false);
      }
    },
    []
  );

  const clearRoute = useCallback(() => {
    requestIdRef.current++;
    setRoute(null);
  }, []);

  return { route, isCalculating, calculateRoute, clearRoute };
}
