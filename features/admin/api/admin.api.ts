import { apiClient } from '@/shared/api';
import type { Housing } from '@/shared/types';
import type { PropertyResponse } from '@/entities/housing/api/housing.api';

/** Convierte PropertyResponse a Housing */
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

export async function getPendingProperties(skip = 0, limit = 100): Promise<(Housing & { status: string, publisher_id: number })[]> {
  const response = await apiClient.get<PropertyResponse[]>('/admin/properties/pending', {
    params: { skip, limit },
  });
  return response.data.map((p) => ({
    ...toHousing(p),
    status: p.status,
    publisher_id: p.publisher_id,
  }));
}

export async function updatePropertyStatus(propertyId: string, status: 'approved' | 'rejected', rejection_reason?: string): Promise<Housing> {
  const payload: any = { status };
  if (rejection_reason) {
    payload.rejection_reason = rejection_reason;
  }
  
  const response = await apiClient.patch<PropertyResponse>(`/admin/properties/${propertyId}/status`, payload);
  return toHousing(response.data);
}

export async function deleteProperty(propertyId: string): Promise<void> {
  await apiClient.delete(`/properties/${propertyId}`);
}

export interface AdminUserResponse {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  name?: string | null;
  last_name?: string | null;
}

export async function getAllUsers(skip = 0, limit = 7, search?: string): Promise<AdminUserResponse[]> {
  const params: any = { skip, limit };
  if (search && search.trim()) {
    params.search = search.trim();
  }
  const response = await apiClient.get<AdminUserResponse[]>('/admin/users', { params });
  return response.data;
}

export async function updateUserStatus(userId: number, is_active: boolean): Promise<AdminUserResponse> {
  const response = await apiClient.patch<AdminUserResponse>(`/admin/users/${userId}/status`, {
    is_active,
  });
  return response.data;
}
