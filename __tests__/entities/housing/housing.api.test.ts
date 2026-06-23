jest.mock('@/shared/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from '@/shared/api';
import {
  fetchAllProperties,
  fetchPropertyById,
  createProperty,
  fetchMyFavorites,
  addToFavorites,
  removeFromFavorites,
  deleteProperty,
} from '@/entities/housing/api/housing.api';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

function makeRawProperty(propertyOverrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    publisher_id: 1,
    status: 'approved',
    title: 'Depto Test',
    property_type: 'Departamento',
    district: 'Miraflores',
    address: 'Av. Larco 123',
    latitude: -12.046,
    longitude: -77.042,
    currency: 'PEN',
    price: 1500,
    total_area_sqm: 80,
    covered_area_sqm: 70,
    bedrooms: 2,
    bathrooms: 1,
    parking: 0,
    antiquity: null,
    description: 'Un departamento',
    images: ['img1.jpg'],
    features: ['wifi'],
    source_url: null,
    is_favorite: false,
    ...propertyOverrides,
  };
}

// ── toHousing mapper ──────────────────────────────────────────────────────────
// Tested indirectly through public API functions.

describe('toHousing mapper', () => {
  it('converts property id from number to string', async () => {
    mockGet.mockResolvedValueOnce({ data: makeRawProperty({ id: 42 }) });
    const result = await fetchPropertyById(42);
    expect(typeof result.id).toBe('string');
    expect(result.id).toBe('42');
  });

  it('defaults currency to PEN when backend sends null', async () => {
    mockGet.mockResolvedValueOnce({ data: makeRawProperty({ currency: null }) });
    const result = await fetchPropertyById(1);
    expect(result.currency).toBe('PEN');
  });

  it('defaults price to 0 when backend sends null', async () => {
    mockGet.mockResolvedValueOnce({ data: makeRawProperty({ price: null }) });
    const result = await fetchPropertyById(1);
    expect(result.price).toBe(0);
  });

  it('maps is_favorite to isFavorite', async () => {
    mockGet.mockResolvedValueOnce({ data: makeRawProperty({ is_favorite: true }) });
    const result = await fetchPropertyById(1);
    expect(result.isFavorite).toBe(true);
  });

  it('maps is_favorite = false correctly', async () => {
    mockGet.mockResolvedValueOnce({ data: makeRawProperty({ is_favorite: false }) });
    const result = await fetchPropertyById(1);
    expect(result.isFavorite).toBe(false);
  });

  it('preserves all core fields correctly', async () => {
    mockGet.mockResolvedValueOnce({ data: makeRawProperty() });
    const result = await fetchPropertyById(42);
    expect(result.title).toBe('Depto Test');
    expect(result.district).toBe('Miraflores');
    expect(result.latitude).toBe(-12.046);
    expect(result.longitude).toBe(-77.042);
    expect(result.total_area_sqm).toBe(80);
  });

  it('defaults description to empty string when null', async () => {
    mockGet.mockResolvedValueOnce({ data: makeRawProperty({ description: null }) });
    const result = await fetchPropertyById(1);
    expect(result.description).toBe('');
  });
});

// ── fetchAllProperties ────────────────────────────────────────────────────────

describe('fetchAllProperties', () => {
  it('returns mapped housing items with total count', async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [makeRawProperty({ id: 1 })], total: 1 } });
    const result = await fetchAllProperties();
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('1');
  });

  it('maps multiple results correctly', async () => {
    const raws = [makeRawProperty({ id: 1 }), makeRawProperty({ id: 2 })];
    mockGet.mockResolvedValueOnce({ data: { items: raws, total: 2 } });
    const result = await fetchAllProperties();
    expect(result.items[0].id).toBe('1');
    expect(result.items[1].id).toBe('2');
  });

  it('sends skip and limit pagination params', async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
    await fetchAllProperties(10, 20);
    expect(mockGet).toHaveBeenCalledWith('/properties/', expect.objectContaining({
      params: expect.objectContaining({ skip: 10, limit: 20 }),
    }));
  });

  it('includes district filter when provided', async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
    await fetchAllProperties(0, 10, { district: 'Miraflores' });
    expect(mockGet).toHaveBeenCalledWith('/properties/', expect.objectContaining({
      params: expect.objectContaining({ district: 'Miraflores' }),
    }));
  });

  it('includes bedroom and price filters when provided', async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
    await fetchAllProperties(0, 10, { bedrooms: 2, min_price: 500, max_price: 2000 });
    expect(mockGet).toHaveBeenCalledWith('/properties/', expect.objectContaining({
      params: expect.objectContaining({ bedrooms: 2, min_price: 500, max_price: 2000 }),
    }));
  });

  it('returns empty list when backend returns no items', async () => {
    mockGet.mockResolvedValueOnce({ data: { items: [], total: 0 } });
    const result = await fetchAllProperties();
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ── fetchMyFavorites ──────────────────────────────────────────────────────────

describe('fetchMyFavorites', () => {
  it('maps all returned properties using toHousing', async () => {
    const raws = [makeRawProperty({ id: 5, is_favorite: true }), makeRawProperty({ id: 6, is_favorite: true })];
    mockGet.mockResolvedValueOnce({ data: raws });
    const result = await fetchMyFavorites();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('5');
    expect(result[1].id).toBe('6');
    expect(result[0].isFavorite).toBe(true);
  });

  it('calls GET /properties/favorites', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await fetchMyFavorites();
    expect(mockGet).toHaveBeenCalledWith('/properties/favorites');
  });
});

// ── createProperty ────────────────────────────────────────────────────────────

describe('createProperty', () => {
  it('posts to /properties/ and maps the response using toHousing', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawProperty({ id: 99 }) });
    const result = await createProperty({
      title: 'Depto Test',
      property_type: 'Departamento',
      district: 'Miraflores',
      address: 'Av. Larco 123',
      latitude: -12.046,
      longitude: -77.042,
      total_area_sqm: 80,
    });
    expect(mockPost).toHaveBeenCalledWith('/properties/', expect.any(Object));
    expect(result.id).toBe('99'); // number → string via toHousing
  });
});

// ── addToFavorites / removeFromFavorites ──────────────────────────────────────

describe('addToFavorites', () => {
  it('posts to /properties/{id}/favorite', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    await addToFavorites('42');
    expect(mockPost).toHaveBeenCalledWith('/properties/42/favorite');
  });
});

describe('removeFromFavorites', () => {
  it('deletes /properties/{id}/favorite', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await removeFromFavorites('42');
    expect(mockDelete).toHaveBeenCalledWith('/properties/42/favorite');
  });
});

// ── deleteProperty ────────────────────────────────────────────────────────────

describe('deleteProperty', () => {
  it('calls DELETE /properties/{id}', async () => {
    mockDelete.mockResolvedValueOnce({ data: {} });
    await deleteProperty(42);
    expect(mockDelete).toHaveBeenCalledWith('/properties/42');
  });
});
