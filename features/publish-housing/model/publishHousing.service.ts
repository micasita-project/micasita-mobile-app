/**
 * @layer features/publish-housing
 * @description Servicio para publicar viviendas (Mock).
 */

import type { HousingDraft, PublishedHousing, ListingStatus } from '@/shared/types';

// ── Public API ──────────────────────────────────────────────────

/**
 * MOCK: Simula publicación de vivienda.
 */
export async function submitHousingListing(
  draft: HousingDraft,
  userId: string,
  userEmail: string
): Promise<PublishedHousing> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: Math.random().toString(36).slice(2),
        userId,
        userEmail,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        address: draft.address,
        district: draft.district,
        latitude: draft.latitude,
        longitude: draft.longitude,
        title: draft.title,
        property_type: draft.property_type,
        currency: draft.currency,
        price: draft.price,
        total_area_sqm: draft.total_area_sqm,
        covered_area_sqm: draft.covered_area_sqm,
        bedrooms: draft.bedrooms,
        bathrooms: draft.bathrooms,
        parking: draft.parking,
        antiquity: draft.antiquity,
        description: draft.description,
        images: draft.localImageUris || [],
        features: draft.features,
      });
    }, 1500);
  });
}

/**
 * MOCK: Obtiene las publicaciones del usuario (vacío por defecto).
 */
export async function getMyListings(userId: string): Promise<PublishedHousing[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([]);
    }, 1000);
  });
}

/**
 * MOCK: Actualiza el estado de una publicación.
 */
export async function updateListingStatus(
  id: string,
  status: ListingStatus
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
}
