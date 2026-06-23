jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import { apiClient } from '@/shared/api';
import {
  getGuestRecommendations,
  generateRecommendations,
  getLatestRecommendations,
} from '@/features/recommendation/api/recommendation.api';

const mockPost = apiClient.post as jest.Mock;
const mockGet = apiClient.get as jest.Mock;

function makeRawProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    publisher_id: 2,
    title: 'Depto Miraflores',
    property_type: 'Departamento',
    district: 'Miraflores',
    address: 'Av. Larco 123',
    latitude: -12.046,
    longitude: -77.042,
    currency: 'PEN',
    price: 1500,
    total_area_sqm: 80,
    covered_area_sqm: null,
    bedrooms: 2,
    bathrooms: 1,
    parking: null,
    antiquity: null,
    description: 'Buen depto',
    images: [],
    source_url: null,
    ...overrides,
  };
}

function makeRawItem(propertyOverrides: Record<string, unknown> = {}, itemOverrides: Record<string, unknown> = {}) {
  return {
    property: makeRawProperty(propertyOverrides),
    match_score: 85.0,
    predicted_time_min: 20,
    time_saved_mins: null,
    ...itemOverrides,
  };
}

function makeRawPage(items: unknown[] = [], pageOverrides: Record<string, unknown> = {}) {
  return {
    results: items,
    total: items.length,
    message: null,
    min_price_in_area: null,
    ...pageOverrides,
  };
}

const GUEST_REQUEST = {
  work_lat: -12.046,
  work_lon: -77.042,
  budget: 1500,
  preferred_transportation: 'driving',
};

// ── toRecommendationItem mapper ───────────────────────────────────────────────
// Tested indirectly through getGuestRecommendations.

describe('toRecommendationItem mapper', () => {
  it('converts property id from number to string', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage([makeRawItem({ id: 7 })]) });
    const result = await getGuestRecommendations(GUEST_REQUEST);
    expect(typeof result.results[0].property.id).toBe('string');
    expect(result.results[0].property.id).toBe('7');
  });

  it('defaults currency to PEN when backend sends null', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage([makeRawItem({ currency: null })]) });
    const result = await getGuestRecommendations(GUEST_REQUEST);
    expect(result.results[0].property.currency).toBe('PEN');
  });

  it('defaults price to 0 when backend sends null', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage([makeRawItem({ price: null })]) });
    const result = await getGuestRecommendations(GUEST_REQUEST);
    expect(result.results[0].property.price).toBe(0);
  });

  it('preserves match_score and predicted_time_min', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage([makeRawItem({}, { match_score: 92.5, predicted_time_min: 35 })]) });
    const result = await getGuestRecommendations(GUEST_REQUEST);
    expect(result.results[0].match_score).toBe(92.5);
    expect(result.results[0].predicted_time_min).toBe(35);
  });

  it('keeps time_saved_mins as null when not provided', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage([makeRawItem({}, { time_saved_mins: null })]) });
    const result = await getGuestRecommendations(GUEST_REQUEST);
    expect(result.results[0].time_saved_mins).toBeNull();
  });

  it('maps time_saved_mins when provided', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage([makeRawItem({}, { time_saved_mins: 12 })]) });
    const result = await getGuestRecommendations(GUEST_REQUEST);
    expect(result.results[0].time_saved_mins).toBe(12);
  });

  it('defaults description to empty string when null', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage([makeRawItem({ description: null })]) });
    const result = await getGuestRecommendations(GUEST_REQUEST);
    expect(result.results[0].property.description).toBe('');
  });
});

// ── getGuestRecommendations ───────────────────────────────────────────────────

describe('getGuestRecommendations', () => {
  it('posts to /recommend/guest with the provided data', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage() });
    await getGuestRecommendations(GUEST_REQUEST);
    expect(mockPost).toHaveBeenCalledWith(
      '/recommend/guest',
      GUEST_REQUEST,
      expect.objectContaining({ timeout: 60000 })
    );
  });

  it('returns a page response with total and results', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage([makeRawItem()], { total: 1 }) });
    const result = await getGuestRecommendations(GUEST_REQUEST);
    expect(result.total).toBe(1);
    expect(result.results).toHaveLength(1);
  });

  it('returns message and min_price_in_area from backend', async () => {
    mockPost.mockResolvedValueOnce({
      data: makeRawPage([], { message: 'Presupuesto insuficiente', min_price_in_area: 800 }),
    });
    const result = await getGuestRecommendations(GUEST_REQUEST);
    expect(result.message).toBe('Presupuesto insuficiente');
    expect(result.min_price_in_area).toBe(800);
  });

  it('re-throws API errors', async () => {
    mockPost.mockRejectedValueOnce(new Error('Server error'));
    await expect(getGuestRecommendations(GUEST_REQUEST)).rejects.toThrow('Server error');
  });
});

// ── getLatestRecommendations ──────────────────────────────────────────────────

describe('getLatestRecommendations', () => {
  it('returns null when backend returns 404 (no cached results)', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 404 }, message: 'Not Found' });
    const result = await getLatestRecommendations(1);
    expect(result).toBeNull();
  });

  it('re-throws non-404 errors', async () => {
    mockGet.mockRejectedValueOnce({ response: { status: 500 }, message: 'Internal Server Error' });
    await expect(getLatestRecommendations(1)).rejects.toMatchObject({ response: { status: 500 } });
  });

  it('maps and returns results when the backend has cached recommendations', async () => {
    mockGet.mockResolvedValueOnce({ data: makeRawPage([makeRawItem()], { total: 1 }) });
    const result = await getLatestRecommendations(1);
    expect(result).not.toBeNull();
    expect(result!.total).toBe(1);
    expect(result!.results[0].property.id).toBe('1'); // number → string
  });

  it('calls the correct endpoint for the given workplace', async () => {
    mockGet.mockResolvedValueOnce({ data: makeRawPage() });
    await getLatestRecommendations(42);
    expect(mockGet).toHaveBeenCalledWith('/recommend/workplaces/42/latest');
  });
});

// ── generateRecommendations ───────────────────────────────────────────────────

describe('generateRecommendations', () => {
  it('posts to /recommend/workplaces/{id}/generate with 60s timeout', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage() });
    await generateRecommendations(7);
    expect(mockPost).toHaveBeenCalledWith(
      '/recommend/workplaces/7/generate',
      undefined,
      expect.objectContaining({ timeout: 60000 })
    );
  });

  it('re-throws errors (timeout, 400, 500, etc)', async () => {
    mockPost.mockRejectedValueOnce(new Error('Request timeout'));
    await expect(generateRecommendations(1)).rejects.toThrow('Request timeout');
  });

  it('returns a mapped page response on success', async () => {
    mockPost.mockResolvedValueOnce({ data: makeRawPage([makeRawItem()], { total: 1 }) });
    const result = await generateRecommendations(3);
    expect(result.total).toBe(1);
    expect(result.results[0].property.id).toBe('1');
  });
});
