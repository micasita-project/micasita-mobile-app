/**
 * @layer features/publish-housing
 * @description Servicio para publicar viviendas conectado al backend real.
 */

import { createProperty, uploadPropertyImage, updateProperty } from '@/entities/housing/api/housing.api';
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
    features: draft.features,
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
 * Actualiza una vivienda existente. Sube nuevas imágenes si es necesario.
 */
export async function updateHousingListing(
  propertyId: string,
  draft: HousingDraft
): Promise<PublishedHousing> {
  const imageUrls: string[] = [];
  for (const uri of draft.localImageUris) {
    if (uri.startsWith('http')) {
      imageUrls.push(uri);
    } else {
      try {
        const url = await uploadPropertyImage(uri);
        imageUrls.push(url);
      } catch (err) {
        console.warn('Error uploading image, skipping:', err);
      }
    }
  }

  const propertyData: Partial<CreatePropertyRequest> = {
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
    features: draft.features,
  };

  const updated = await updateProperty(Number(propertyId), propertyData);

  return {
    id: updated.id,
    userId: '', // No disponible en el response del frontend mapped
    userEmail: '',
    status: 'pending', // Debería volver a pending al editar
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    address: updated.address,
    district: updated.district,
    latitude: updated.latitude,
    longitude: updated.longitude,
    title: updated.title,
    property_type: updated.property_type,
    currency: updated.currency,
    price: updated.price,
    total_area_sqm: updated.total_area_sqm,
    covered_area_sqm: updated.covered_area_sqm,
    bedrooms: updated.bedrooms,
    bathrooms: updated.bathrooms,
    parking: updated.parking,
    antiquity: updated.antiquity,
    description: updated.description,
    images: updated.images,
    features: updated.features ?? [],
  };
}

/**
 * Obtiene las publicaciones del usuario desde el backend.
 */
export async function getMyListings(userId: string): Promise<PublishedHousing[]> {
  const { fetchMyProperties } = await import('@/entities/housing/api/housing.api');
  const all = await fetchMyProperties();

  return all.map((h) => ({
    id: String(h.id),
    userId,
    userEmail: '',
    status: h.status as 'pending' | 'approved' | 'rejected',
    createdAt: h.createdAt ?? new Date().toISOString(),
    updatedAt: h.updatedAt ?? new Date().toISOString(),
    address: h.address,
    district: h.district,
    latitude: h.latitude,
    longitude: h.longitude,
    title: h.title,
    property_type: h.property_type,
    currency: h.currency ?? 'PEN',
    price: h.price ?? 0,
    total_area_sqm: h.total_area_sqm,
    covered_area_sqm: h.covered_area_sqm ?? undefined,
    bedrooms: h.bedrooms ?? 0,
    bathrooms: h.bathrooms ?? 0,
    parking: h.parking ?? undefined,
    antiquity: h.antiquity ?? undefined,
    description: h.description ?? '',
    images: h.images ?? [],
    features: h.features ?? [],
  }));
}
