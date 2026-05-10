/**
 * @layer entities/housing/api
 * @description Servicio de propiedades conectado al backend real (FastAPI).
 * Reemplaza la lectura de JSON estático por llamadas HTTP.
 */

import { apiClient } from '@/shared/api';
import type { Housing } from '@/shared/types';

// ── Types (alineadas con el backend Python) ─────────────────────

/** Respuesta cruda del backend para una propiedad */
export interface PropertyResponse {
  id: number;
  publisher_id: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  title: string;
  property_type: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  currency: string | null;
  price: number | null;
  total_area_sqm: number;
  covered_area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  antiquity: number | null;
  description: string | null;
  images: string[];
  features: string[];
  source_url: string | null;
  is_favorite: boolean;
}

export interface CreatePropertyRequest {
  title: string;
  property_type: string;
  district: string;
  address: string;
  latitude: number;
  longitude: number;
  currency?: string;
  price?: number;
  total_area_sqm: number;
  covered_area_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  antiquity?: number;
  description?: string;
  images?: string[];
  features?: string[];
  source_url?: string;
}
export interface PaginatedPropertyResponse {
  items: PropertyResponse[];
  total: number;
}

export interface PropertyFilters {
  district?: string;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  min_area_sqm?: number;
  min_price?: number;
  max_price?: number;
}
// ── Mapper (Backend → Frontend) ─────────────────────────────────

/** Convierte la respuesta del backend al tipo Housing que usa toda la app */
function toHousing(p: PropertyResponse): Housing {
  return {
    id: String(p.id),
    title: p.title,
    property_type: p.property_type,
    address: p.address,
    district: p.district,
    latitude: p.latitude,
    longitude: p.longitude,
    currency: p.currency ?? 'PEN',
    price: p.price ?? 0,
    total_area_sqm: p.total_area_sqm,
    covered_area_sqm: p.covered_area_sqm ?? undefined,
    bedrooms: p.bedrooms ?? 0,
    bathrooms: p.bathrooms ?? 0,
    parking: p.parking ?? undefined,
    antiquity: p.antiquity ?? undefined,
    description: p.description ?? '',
    images: p.images ?? [],
    features: p.features ?? [],
    source_url: p.source_url ?? undefined,
    isFavorite: p.is_favorite ?? false,
  };
}

/**
 * Lista propiedades desde el backend con soporte de paginación y filtros.
 * Público: no requiere autenticación.
 */
export async function fetchAllProperties(
  skip = 0,
  limit = 10,
  filters: PropertyFilters = {}
): Promise<{ items: Housing[]; total: number }> {
  const params: Record<string, any> = { skip, limit };
  if (filters.district) params.district = filters.district;
  if (filters.bedrooms != null) params.bedrooms = filters.bedrooms;
  if (filters.bathrooms != null) params.bathrooms = filters.bathrooms;
  if (filters.parking != null) params.parking = filters.parking;
  if (filters.min_area_sqm != null) params.min_area_sqm = filters.min_area_sqm;
  if (filters.min_price != null) params.min_price = filters.min_price;
  if (filters.max_price != null) params.max_price = filters.max_price;

  const response = await apiClient.get<PaginatedPropertyResponse>('/properties/', { params });
  return {
    items: response.data.items.map(toHousing),
    total: response.data.total,
  };
}

/**
 * Lista las propiedades del usuario logueado.
 * Protegido: requiere autenticación.
 */
export async function fetchMyProperties(): Promise<PropertyResponse[]> {
  const response = await apiClient.get<PropertyResponse[]>('/properties/mine');
  return response.data;
}

/**
 * Crea una nueva propiedad en el backend.
 * Protegido: requiere usuario logueado.
 */
export async function createProperty(data: CreatePropertyRequest): Promise<Housing> {
  const response = await apiClient.post<PropertyResponse>('/properties/', data);
  return toHousing(response.data);
}

/**
 * Obtiene una propiedad por su ID.
 * Público: no requiere autenticación.
 */
export async function fetchPropertyById(id: number): Promise<Housing> {
  const response = await apiClient.get<PropertyResponse>(`/properties/${id}`);
  return toHousing(response.data);
}

/**
 * Actualiza una propiedad existente.
 * Protegido: requiere usuario logueado.
 */
export async function updateProperty(id: number, data: Partial<CreatePropertyRequest>): Promise<Housing> {
  const response = await apiClient.patch<PropertyResponse>(`/properties/${id}`, data);
  return toHousing(response.data);
}

/**
 * Elimina una propiedad.
 * Protegido: solo el dueño o admin.
 */
export async function deleteProperty(propertyId: number): Promise<void> {
  await apiClient.delete(`/properties/${propertyId}`);
}

/**
 * Sube una imagen a Cloudinary a través del backend.
 * Protegido: requiere usuario logueado.
 */
export async function uploadPropertyImage(fileUri: string): Promise<string> {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() ?? 'photo.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: fileUri,
    name: filename,
    type,
  } as any);

  const response = await apiClient.post<{ url: string }>('/properties/upload_image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.url;
}

// ── Favorites (HU26) ───────────────────────────────────────────

/**
 * Añade una propiedad a la lista de favoritos del usuario.
 */
export async function addToFavorites(propertyId: string): Promise<void> {
  await apiClient.post(`/properties/${propertyId}/favorite`);
}

/**
 * Quita una propiedad de la lista de favoritos.
 */
export async function removeFromFavorites(propertyId: string): Promise<void> {
  await apiClient.delete(`/properties/${propertyId}/favorite`);
}

/**
 * Obtiene la lista de propiedades favoritas del usuario logueado.
 */
export async function fetchMyFavorites(): Promise<Housing[]> {
  const response = await apiClient.get<PropertyResponse[]>('/properties/favorites');
  return response.data.map(toHousing);
}
