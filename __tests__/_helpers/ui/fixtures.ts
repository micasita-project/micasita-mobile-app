import type { Housing } from '@/shared/types';

/** Vivienda de prueba con valores razonables; cada prueba sobrescribe lo que le importa. */
export function makeHousing(over: Partial<Housing> = {}): Housing {
  return {
    id: 'h-1',
    title: 'Departamento luminoso en Miraflores',
    property_type: 'Departamento',
    address: 'Av. Larco 123',
    district: 'Miraflores',
    latitude: -12.12,
    longitude: -77.03,
    currency: 'PEN',
    price: 2500,
    total_area_sqm: 85,
    bedrooms: 2,
    bathrooms: 2,
    description: '',
    images: ['https://img.test/1.jpg', 'https://img.test/2.jpg'],
    features: [],
    ...over,
  };
}

// Este archivo vive bajo __tests__; al ejecutarse solo necesita una prueba.
if (expect.getState().testPath?.includes('/_helpers/')) {
  it('auxiliar', () => {});
}
