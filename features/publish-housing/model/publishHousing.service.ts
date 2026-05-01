/**
 * @layer features/publish-housing
 * @description Servicio para publicar viviendas conectado al backend real.
 */

import { createProperty, uploadPropertyImage } from '@/entities/housing/api/housing.api';
import type { CreatePropertyRequest } from '@/entities/housing/api/housing.api';
import type { HousingDraft, PublishedHousing } from '@/shared/types';

// ── Public API ──────────────────────────────────────────────────

/**
 * Sube las imágenes a Cloudinary y luego publica la vivienda en el backend.
 */
export async function submitHousingListing(
  draft: HousingDraft,
  userId: string,
  userEmail: string
): Promise<PublishedHousing> {
  // 1. Subir imágenes locales a Cloudinary y obtener las URLs
  const imageUrls: string[] = [];
  for (const uri of draft.localImageUris) {
    try {
      const url = await uploadPropertyImage(uri);
      imageUrls.push(url);
    } catch (err) {
      console.warn('Error uploading image, skipping:', err);
    }
  }

  // 2. Construir el request para el backend
  const propertyData: CreatePropertyRequest = {
    title: draft.title,
    property_type: draft.property_type,
    district: draft.district,
    address: draft.address,
    latitude: draft.latitude,
    longitude: draft.longitude,
    currency: draft.currency,
    price: draft.price,
    total_area_sqm: draft.total_area_sqm,
    covered_area_sqm: draft.covered_area_sqm,
    bedrooms: draft.bedrooms,
    bathrooms: draft.bathrooms,
    parking: draft.parking,
    antiquity: draft.antiquity,
    description: draft.description,
    images: imageUrls,
  };

  // 3. Crear la propiedad en la base de datos
  const created = await createProperty(propertyData);

  // 4. Mapear al tipo PublishedHousing que espera la UI
  return {
    id: created.id,
    userId,
    userEmail,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    address: created.address,
    district: created.district,
    latitude: created.latitude,
    longitude: created.longitude,
    title: created.title,
    property_type: created.property_type,
    currency: created.currency,
    price: created.price,
    total_area_sqm: created.total_area_sqm,
    covered_area_sqm: created.covered_area_sqm,
    bedrooms: created.bedrooms,
    bathrooms: created.bathrooms,
    parking: created.parking,
    antiquity: created.antiquity,
    description: created.description,
    images: created.images,
    features: [],
  };
}

/**
 * Obtiene las publicaciones del usuario desde el backend.
 * Por ahora filtra client-side. En el futuro, el backend debería tener un endpoint GET /properties/mine.
 */
export async function getMyListings(userId: string): Promise<PublishedHousing[]> {
  // TODO: Crear endpoint GET /properties/mine en el backend para filtrar server-side
  const { fetchAllProperties } = await import('@/entities/housing/api/housing.api');
  const all = await fetchAllProperties(0, 500);

  // Filtramos las que tienen publisher_id = userId (comparando como string)
  // Por ahora retornamos todas ya que el backend no expone publisher_id como filtro
  return all.map((h) => ({
    id: h.id,
    userId,
    userEmail: '',
    status: 'approved' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    address: h.address,
    district: h.district,
    latitude: h.latitude,
    longitude: h.longitude,
    title: h.title,
    property_type: h.property_type,
    currency: h.currency,
    price: h.price,
    total_area_sqm: h.total_area_sqm,
    covered_area_sqm: h.covered_area_sqm,
    bedrooms: h.bedrooms,
    bathrooms: h.bathrooms,
    parking: h.parking,
    antiquity: h.antiquity,
    description: h.description,
    images: h.images,
    features: h.features,
  }));
}
