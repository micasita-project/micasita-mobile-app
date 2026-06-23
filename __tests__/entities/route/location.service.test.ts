jest.mock('@/shared/config/env', () => ({
  ENV: {
    OSRM_DRIVING_URL: 'http://osrm-test/driving',
    OSRM_CYCLING_URL: 'http://osrm-test/cycling',
    OSRM_WALKING_URL: 'http://osrm-test/walking',
    API_BASE_URL: 'http://api-test',
    OSM_TILE_URL: 'http://tile-test/{z}/{x}/{y}.png',
  },
}));

import {
  calculateHaversineDistance,
  estimateTravelTime,
  formatDistance,
  formatTravelTime,
  getOptimalMode,
  fetchModeRoute,
} from '@/entities/route/api/location.service';
import type { MultiModeRoutes } from '@/shared/types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockFetchSuccess(distanceM: number, durationS: number) {
  mockFetch.mockResolvedValueOnce({
    json: () =>
      Promise.resolve({
        code: 'Ok',
        routes: [
          {
            distance: distanceM,
            duration: durationS,
            geometry: { coordinates: [[-77.042, -12.046], [-77.030, -12.120]] },
          },
        ],
      }),
  });
}

function makeRoute(timeMinutes: number) {
  return {
    origin: { latitude: 0, longitude: 0 },
    destination: { latitude: 1, longitude: 1 },
    waypoints: [],
    distanceKm: 10,
    timeMinutes,
  };
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

// ── getOptimalMode ────────────────────────────────────────────────────────────

describe('getOptimalMode', () => {
  it('returns the mode with the lowest timeMinutes', () => {
    const routes: MultiModeRoutes = {
      driving: makeRoute(20),
      cycling: makeRoute(15),
      walking: makeRoute(60),
    };
    expect(getOptimalMode(routes)).toBe('cycling');
  });

  it('returns driving when driving is fastest', () => {
    const routes: MultiModeRoutes = {
      driving: makeRoute(10),
      cycling: makeRoute(30),
      walking: makeRoute(90),
    };
    expect(getOptimalMode(routes)).toBe('driving');
  });

  it('returns walking when walking is fastest', () => {
    const routes: MultiModeRoutes = {
      driving: makeRoute(30),
      cycling: makeRoute(20),
      walking: makeRoute(5),
    };
    expect(getOptimalMode(routes)).toBe('walking');
  });
});

// ── fetchModeRoute ────────────────────────────────────────────────────────────
// Each test uses unique coordinates to avoid routeCache interference.

describe('fetchModeRoute', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('calls the driving URL for driving mode', async () => {
    mockFetchSuccess(5000, 300);
    await fetchModeRoute({ latitude: -12.01, longitude: -77.01 }, { latitude: -12.02, longitude: -77.02 }, 'driving');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('http://osrm-test/driving'),
      expect.any(Object)
    );
  });

  it('calls the cycling URL for cycling mode', async () => {
    mockFetchSuccess(5000, 1200);
    await fetchModeRoute({ latitude: -12.10, longitude: -77.10 }, { latitude: -12.11, longitude: -77.11 }, 'cycling');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('http://osrm-test/cycling'),
      expect.any(Object)
    );
  });

  it('calls the walking URL for walking mode', async () => {
    mockFetchSuccess(5000, 3600);
    await fetchModeRoute({ latitude: -12.20, longitude: -77.20 }, { latitude: -12.21, longitude: -77.21 }, 'walking');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('http://osrm-test/walking'),
      expect.any(Object)
    );
  });

  it('passes coordinates as lon,lat in the URL', async () => {
    mockFetchSuccess(5000, 300);
    await fetchModeRoute({ latitude: -12.30, longitude: -77.30 }, { latitude: -12.31, longitude: -77.31 }, 'driving');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('-77.3,-12.3'),
      expect.any(Object)
    );
  });

  it('returns correct distanceKm and timeMinutes from OSRM', async () => {
    mockFetchSuccess(10000, 1800); // 10 km, 30 min
    const result = await fetchModeRoute(
      { latitude: -12.40, longitude: -77.40 },
      { latitude: -12.41, longitude: -77.41 },
      'driving'
    );
    expect(result.distanceKm).toBe(10);
    expect(result.timeMinutes).toBe(30);
  });

  it('falls back to haversine when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await fetchModeRoute(
      { latitude: -12.50, longitude: -77.50 },
      { latitude: -12.51, longitude: -77.51 },
      'driving'
    );
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.timeMinutes).toBeGreaterThan(0);
    expect(result.waypoints).toHaveLength(2); // only origin + destination
  });

  it('falls back when OSRM returns a non-Ok code', async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ code: 'NoSegment', routes: [] }),
    });
    const result = await fetchModeRoute(
      { latitude: -11.60, longitude: -76.60 },
      { latitude: -11.61, longitude: -76.61 },
      'driving'
    );
    expect(result.waypoints).toHaveLength(2);
  });

  it('caches results and skips fetch on the second identical call', async () => {
    mockFetchSuccess(3000, 600);
    const origin = { latitude: -11.70, longitude: -76.70 };
    const dest = { latitude: -11.71, longitude: -76.71 };
    const r1 = await fetchModeRoute(origin, dest, 'driving');
    const r2 = await fetchModeRoute(origin, dest, 'driving');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(r1).toBe(r2); // same object reference from cache
  });
});
