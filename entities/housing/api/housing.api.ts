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
  };
}

// ── API Calls ───────────────────────────────────────────────────

/**
 * Lista todas las propiedades desde el backend.
 * Público: no requiere autenticación.
 */
export async function fetchAllProperties(skip = 0, limit = 100): Promise<Housing[]> {
  const response = await apiClient.get<PropertyResponse[]>('/properties/', {
    params: { skip, limit },
  });
  return response.data.map(toHousing);
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
