/**
 * @layer entities/housing/model
 * @description Service for Housing entity CRUD operations.
 */

import type { Housing } from '@/shared/types';
import housingData from '@/entities/housing/api/housing.data.json';

const allHousing: Housing[] = housingData as Housing[];

export function getAllHousing(): Housing[] {
  return allHousing;
}

export function getHousingById(id: string): Housing | undefined {
  return allHousing.find((h) => h.id === id);
}

export function getHousingByDistrict(district: string): Housing[] {
  return allHousing.filter(
    (h) => h.district.toLowerCase() === district.toLowerCase()
  );
}

export function getAvailableDistricts(): string[] {
  const districts = new Set(allHousing.map((h) => h.district));
  return Array.from(districts).sort();
}

export function getHousingByPriceRange(min: number, max: number): Housing[] {
  return allHousing.filter((h) => h.price >= min && h.price <= max);
}
