/**
 * @layer features/guest/model
 * @description Datos de la sesión de invitado que se transfieren a la cuenta al registrarse.
 */

import type { RecommendationPageResponse } from '@/entities/recommendation';
import type { GuestHome, GuestWorkplace } from './GuestContext';

export interface GuestTransferData {
  home?: { lat: number; lon: number; address: string };
  workplace?: {
    lat: number;
    lon: number;
    budget: number;
    transport: string;
    address: string;
    maxDistanceKm?: number;
  };
  recommendations?: RecommendationPageResponse;
}

export function toGuestTransferData(guest: {
  guestHome: GuestHome | null;
  guestWorkplace: GuestWorkplace | null;
  guestRecommendations: RecommendationPageResponse | null;
}): GuestTransferData {
  const { guestHome, guestWorkplace, guestRecommendations } = guest;
  return {
    home: guestHome ? { lat: guestHome.lat, lon: guestHome.lon, address: guestHome.address } : undefined,
    workplace: guestWorkplace
      ? {
          lat: guestWorkplace.lat,
          lon: guestWorkplace.lon,
          budget: guestWorkplace.budget,
          transport: guestWorkplace.transport,
          address: guestWorkplace.address,
          maxDistanceKm: guestWorkplace.maxDistanceKm,
        }
      : undefined,
    recommendations: guestRecommendations ?? undefined,
  };
}
