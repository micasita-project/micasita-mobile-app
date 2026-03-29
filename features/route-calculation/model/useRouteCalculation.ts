/**
 * @layer features/route-calculation/model
 * @description Hook for multi-mode route calculation with savings comparison.
 * Calculates driving, cycling, and walking routes using OSRM data.
 */

import { useState, useCallback } from 'react';
import type { Coordinate, MultiModeRoutes, RouteSavings, TransportMode } from '@/shared/types';
import { fetchMultiModeRoutes, getOptimalMode } from '@/entities/route';

interface RouteCalculationState {
  /** All 3 mode routes for the selected housing */
  newHomeRoutes: MultiModeRoutes | null;
  /** All 3 mode routes from current home */
  currentHomeRoutes: MultiModeRoutes | null;
  /** Currently selected transport mode */
  selectedMode: TransportMode;
  /** Optimal mode based on time */
  optimalMode: TransportMode | null;
  /** Savings for the selected mode */
  savings: RouteSavings | null;
  isCalculating: boolean;
  setSelectedMode: (mode: TransportMode) => void;
  calculateRoutes: (
    newHome: Coordinate,
    currentHome: Coordinate,
    workplace: Coordinate
  ) => void;
  clearRoute: () => void;
}

export function useRouteCalculation(): RouteCalculationState {
  const [newHomeRoutes, setNewHomeRoutes] = useState<MultiModeRoutes | null>(null);
  const [currentHomeRoutes, setCurrentHomeRoutes] = useState<MultiModeRoutes | null>(null);
  const [selectedMode, setSelectedMode] = useState<TransportMode>('driving');
  const [optimalMode, setOptimalMode] = useState<TransportMode | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const calculateRoutes = useCallback(
    async (newHome: Coordinate, currentHome: Coordinate, workplace: Coordinate) => {
      setIsCalculating(true);

      try {
        // Fetch routes for both origins in parallel
        const [newRoutes, currentRoutes] = await Promise.all([
          fetchMultiModeRoutes(newHome, workplace),
          fetchMultiModeRoutes(currentHome, workplace),
        ]);

        setNewHomeRoutes(newRoutes);
        setCurrentHomeRoutes(currentRoutes);
        setOptimalMode(getOptimalMode(newRoutes));
      } catch (error) {
        console.warn('Multi-mode route calculation failed:', error);
      } finally {
        setIsCalculating(false);
      }
    },
    []
  );

  // Compute savings dynamically for the selected mode
  const savings: RouteSavings | null =
    newHomeRoutes && currentHomeRoutes
      ? {
          currentRoute: currentHomeRoutes[selectedMode],
          newRoute: newHomeRoutes[selectedMode],
          savedMinutes:
            currentHomeRoutes[selectedMode].timeMinutes - newHomeRoutes[selectedMode].timeMinutes,
          savedKm: Math.round(
            (currentHomeRoutes[selectedMode].distanceKm - newHomeRoutes[selectedMode].distanceKm) * 100
          ) / 100,
          savingsPercentage:
            currentHomeRoutes[selectedMode].timeMinutes > 0
              ? Math.round(
                  ((currentHomeRoutes[selectedMode].timeMinutes - newHomeRoutes[selectedMode].timeMinutes) /
                    currentHomeRoutes[selectedMode].timeMinutes) *
                    100
                )
              : 0,
        }
      : null;

  const clearRoute = useCallback(() => {
    setNewHomeRoutes(null);
    setCurrentHomeRoutes(null);
    setOptimalMode(null);
  }, []);

  return {
    newHomeRoutes,
    currentHomeRoutes,
    selectedMode,
    optimalMode,
    savings,
    isCalculating,
    setSelectedMode,
    calculateRoutes,
    clearRoute,
  };
}
