/**
 * @layer features/guest/model
 * @description Contexto para modo invitado.
 * Persiste vivienda actual, trabajo y última recomendación en AsyncStorage.
 * Las recomendaciones se guardan para evitar re-ejecutar XGBoost en cada visita,
 * equivalente al flujo auth (generate → latest).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecommendationPageResponse } from '@/features/recommendation/api/recommendation.api';
import type { TransportMode } from '@/shared/types';

const GUEST_HOME_KEY = 'micasita_guest_home';
const GUEST_WORKPLACE_KEY = 'micasita_guest_workplace';
const GUEST_RECOMMENDATIONS_KEY = 'micasita_guest_recommendations';

export type TransportOption = TransportMode;

export interface GuestHome {
  lat: number;
  lon: number;
  address: string;
}

export interface GuestWorkplace {
  lat: number;
  lon: number;
  budget: number;
  transport: TransportOption;
  address: string;
  maxDistanceKm: number;
}

interface GuestContextValue {
  guestHome: GuestHome | null;
  guestWorkplace: GuestWorkplace | null;
  guestRecommendations: RecommendationPageResponse | null;
  isInitialized: boolean;
  setGuestHome: (home: GuestHome) => Promise<void>;
  setGuestWorkplace: (workplace: GuestWorkplace) => Promise<void>;
  updateGuestRadius: (maxDistanceKm: number) => Promise<void>;
  saveGuestRecommendations: (page: RecommendationPageResponse) => Promise<void>;
  clearGuestData: () => Promise<void>;
}

const GuestContext = createContext<GuestContextValue | undefined>(undefined);

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guestHome, setGuestHomeState] = useState<GuestHome | null>(null);
  const [guestWorkplace, setGuestWorkplaceState] = useState<GuestWorkplace | null>(null);
  const [guestRecommendations, setGuestRecommendationsState] = useState<RecommendationPageResponse | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [homeRaw, workRaw, recsRaw] = await Promise.all([
          AsyncStorage.getItem(GUEST_HOME_KEY),
          AsyncStorage.getItem(GUEST_WORKPLACE_KEY),
          AsyncStorage.getItem(GUEST_RECOMMENDATIONS_KEY),
        ]);
        if (homeRaw) setGuestHomeState(JSON.parse(homeRaw));
        if (workRaw) setGuestWorkplaceState(JSON.parse(workRaw));
        if (recsRaw) setGuestRecommendationsState(JSON.parse(recsRaw));
      } catch {
        // Ignore read errors
      } finally {
        setIsInitialized(true);
      }
    };
    load();
  }, []);

  const setGuestHome = useCallback(async (home: GuestHome) => {
    setGuestHomeState(home);
    await AsyncStorage.setItem(GUEST_HOME_KEY, JSON.stringify(home));
  }, []);

  const setGuestWorkplace = useCallback(async (workplace: GuestWorkplace) => {
    setGuestWorkplaceState(workplace);
    // When workplace changes, invalidate stored recommendations so stale results aren't shown
    setGuestRecommendationsState(null);
    await Promise.all([
      AsyncStorage.setItem(GUEST_WORKPLACE_KEY, JSON.stringify(workplace)),
      AsyncStorage.removeItem(GUEST_RECOMMENDATIONS_KEY),
    ]);
  }, []);

  const saveGuestRecommendations = useCallback(async (page: RecommendationPageResponse) => {
    setGuestRecommendationsState(page);
    await AsyncStorage.setItem(GUEST_RECOMMENDATIONS_KEY, JSON.stringify(page));
  }, []);

  const updateGuestRadius = useCallback(async (maxDistanceKm: number) => {
    if (!guestWorkplace) return;
    const updated = { ...guestWorkplace, maxDistanceKm };
    setGuestWorkplaceState(updated);
    await AsyncStorage.setItem(GUEST_WORKPLACE_KEY, JSON.stringify(updated));
  }, [guestWorkplace]);

  const clearGuestData = useCallback(async () => {
    setGuestHomeState(null);
    setGuestWorkplaceState(null);
    setGuestRecommendationsState(null);
    await AsyncStorage.multiRemove([GUEST_HOME_KEY, GUEST_WORKPLACE_KEY, GUEST_RECOMMENDATIONS_KEY]);
  }, []);

  return (
    <GuestContext.Provider value={{
      guestHome,
      guestWorkplace,
      guestRecommendations,
      isInitialized,
      setGuestHome,
      setGuestWorkplace,
      updateGuestRadius,
      saveGuestRecommendations,
      clearGuestData,
    }}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error('useGuest debe usarse dentro de GuestProvider');
  return ctx;
}
