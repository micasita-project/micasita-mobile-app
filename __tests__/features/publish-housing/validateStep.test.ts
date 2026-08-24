import { validateStep } from '@/features/publish-housing/model/validateStep';
import type { HousingDraft } from '@/shared/types';

const BASE_DRAFT: HousingDraft = {
  address: 'Av. Larco 123',
  district: 'Miraflores',
  latitude: -12.1211,
  longitude: -77.0295,
  title: 'Depto Test',
  property_type: 'Departamento',
  currency: 'PEN',
  price: 1500,
  total_area_sqm: 80,
  covered_area_sqm: 70,
  bedrooms: 2,
  bathrooms: 1,
  parking: 0,
  antiquity: 0,
  description: 'Descripción',
  phone: '',
  localImageUris: ['file://foto.jpg'],
  features: [],
};

describe('validateStep — Paso 1 (ubicación)', () => {
  it('pasa con una dirección dentro de Lima', () => {
    expect(validateStep(1, BASE_DRAFT)).toBeNull();
  });

  it('rechaza una vivienda fuera de Lima Metropolitana', () => {
    // Arequipa
    const draft = { ...BASE_DRAFT, latitude: -16.4, longitude: -71.5 };
    expect(validateStep(1, draft)).toMatch(/Lima/);
  });

  it('sigue exigiendo dirección antes que la validación de Lima', () => {
    const draft = { ...BASE_DRAFT, address: '' };
    expect(validateStep(1, draft)).toMatch(/dirección/i);
  });

  it('sigue exigiendo distrito antes que la validación de Lima', () => {
    const draft = { ...BASE_DRAFT, district: '' };
    expect(validateStep(1, draft)).toMatch(/distrito/i);
  });
});
