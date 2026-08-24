jest.mock('@/shared/api', () => ({
  apiClient: { get: jest.fn() },
}));

import { apiClient } from '@/shared/api';
import {
  calculateHaversineDistance,
  estimateTravelTime,
  formatDistance,
  formatTravelTime,
  fetchModeRoute,
} from '@/entities/route/api/location.service';

const mockGet = apiClient.get as jest.Mock;

function mockRouteSuccess(distanceKm: number, durationMin: number) {
  mockGet.mockResolvedValueOnce({
    data: {
      distance_km: distanceKm,
      duration_min: durationMin,
      waypoints: [
        { latitude: -12.046, longitude: -77.042 },
        { latitude: -12.120, longitude: -77.030 },
      ],
      from_osrm: true,
    },
  });
}

// ── calculateHaversineDistance ────────────────────────────────────────────────

describe('calculateHaversineDistance', () => {
  it('returns 0 for the same point', () => {
    const p = { latitude: -12.046, longitude: -77.042 };
    expect(calculateHaversineDistance(p, p)).toBe(0);
  });

  it('is symmetric', () => {
    const a = { latitude: -12.046, longitude: -77.042 };
    const b = { latitude: -12.120, longitude: -77.030 };
    expect(calculateHaversineDistance(a, b)).toBeCloseTo(
      calculateHaversineDistance(b, a),
      5
    );
  });

  it('returns a positive distance for different points', () => {
    const a = { latitude: -12.046, longitude: -77.042 };
    const b = { latitude: -12.120, longitude: -77.030 };
    expect(calculateHaversineDistance(a, b)).toBeGreaterThan(0);
  });

  it('returns ~8.5 km between Lima Centro and Miraflores', () => {
    const lima = { latitude: -12.046, longitude: -77.042 };
    const miraflores = { latitude: -12.119, longitude: -77.029 };
    const dist = calculateHaversineDistance(lima, miraflores);
    expect(dist).toBeGreaterThan(7);
    expect(dist).toBeLessThan(10);
  });

  it('increases proportionally with distance', () => {
    const a = { latitude: -12.046, longitude: -77.042 };
    const b1 = { latitude: -12.146, longitude: -77.042 }; // ~11 km north
    const b2 = { latitude: -12.246, longitude: -77.042 }; // ~22 km north
    const d1 = calculateHaversineDistance(a, b1);
    const d2 = calculateHaversineDistance(a, b2);
    expect(d2).toBeGreaterThan(d1 * 1.8);
  });
});

// ── estimateTravelTime ────────────────────────────────────────────────────────

describe('estimateTravelTime', () => {
  it('returns 60 min for 20 km at 20 km/h average', () => {
    expect(estimateTravelTime(20)).toBe(60);
  });

  it('returns 30 min for 10 km', () => {
    expect(estimateTravelTime(10)).toBe(30);
  });

  it('returns 0 min for 0 km', () => {
    expect(estimateTravelTime(0)).toBe(0);
  });

  it('rounds fractional minutes', () => {
    // 1 km / 20 km/h * 60 = 3 min exactly
    expect(estimateTravelTime(1)).toBe(3);
  });
});

// ── formatDistance ────────────────────────────────────────────────────────────

describe('formatDistance', () => {
  it('formats sub-km distances in meters', () => {
    expect(formatDistance(0.5)).toBe('500 m');
  });

  it('formats distances >= 1 km with one decimal', () => {
    expect(formatDistance(1.5)).toBe('1.5 km');
  });

  it('formats exactly 1 km', () => {
    expect(formatDistance(1.0)).toBe('1.0 km');
  });

  it('formats 0 as 0 m', () => {
    expect(formatDistance(0)).toBe('0 m');
  });

  it('formats 0.999 km as 999 m', () => {
    expect(formatDistance(0.999)).toBe('999 m');
  });
});

// ── formatTravelTime ──────────────────────────────────────────────────────────

describe('formatTravelTime', () => {
  it('returns "X min" for less than 60 minutes', () => {
    expect(formatTravelTime(30)).toBe('30 min');
    expect(formatTravelTime(1)).toBe('1 min');
  });

  it('returns "Xh" for exact hours', () => {
    expect(formatTravelTime(60)).toBe('1h');
    expect(formatTravelTime(120)).toBe('2h');
  });

  it('returns "Xh Ymin" for hours with remaining minutes', () => {
    expect(formatTravelTime(90)).toBe('1h 30min');
    expect(formatTravelTime(75)).toBe('1h 15min');
  });

  it('returns "0 min" for 0 minutes', () => {
    expect(formatTravelTime(0)).toBe('0 min');
  });
});

// ── fetchModeRoute ────────────────────────────────────────────────────────────
// Each test uses unique coordinates to avoid routeCache interference.

describe('fetchModeRoute', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('calls GET /route with the requested mode', async () => {
    mockRouteSuccess(5, 5);
    await fetchModeRoute({ latitude: -12.01, longitude: -77.01 }, { latitude: -12.02, longitude: -77.02 }, 'cycling');
    expect(mockGet).toHaveBeenCalledWith(
      '/route',
      expect.objectContaining({ params: expect.objectContaining({ mode: 'cycling' }) })
    );
  });

  it('passes origin/destination coordinates as separate lat/lon params', async () => {
    mockRouteSuccess(5, 5);
    await fetchModeRoute({ latitude: -12.30, longitude: -77.30 }, { latitude: -12.31, longitude: -77.31 }, 'driving');
    expect(mockGet).toHaveBeenCalledWith(
      '/route',
      expect.objectContaining({
        params: expect.objectContaining({
          origin_lat: -12.30, origin_lon: -77.30,
          dest_lat: -12.31, dest_lon: -77.31,
        }),
      })
    );
  });

  it('returns correct distanceKm and timeMinutes from the backend', async () => {
    mockRouteSuccess(10, 30); // 10 km, 30 min, already corrected by the traffic model
    const result = await fetchModeRoute(
      { latitude: -12.40, longitude: -77.40 },
      { latitude: -12.41, longitude: -77.41 },
      'driving'
    );
    expect(result.distanceKm).toBe(10);
    expect(result.timeMinutes).toBe(30);
  });

  it('falls back to haversine when the request throws', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    const result = await fetchModeRoute(
      { latitude: -12.50, longitude: -77.50 },
      { latitude: -12.51, longitude: -77.51 },
      'driving'
    );
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.timeMinutes).toBeGreaterThan(0);
    expect(result.waypoints).toHaveLength(2); // only origin + destination
  });

  it('caches results and skips the request on the second identical call', async () => {
    mockRouteSuccess(3, 10);
    const origin = { latitude: -11.70, longitude: -76.70 };
    const dest = { latitude: -11.71, longitude: -76.71 };
    const r1 = await fetchModeRoute(origin, dest, 'driving');
    const r2 = await fetchModeRoute(origin, dest, 'driving');
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2); // same object reference from cache
  });
});
