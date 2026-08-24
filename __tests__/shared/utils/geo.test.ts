import { isWithinLima, spreadOverlappingMarkers } from '@/shared/utils/geo';

function haversineMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Lima bbox: lat ∈ [-12.55, -11.70], lon ∈ [-77.20, -76.65]

describe('isWithinLima', () => {
  it('returns true for Lima Centro', () => {
    expect(isWithinLima(-12.046, -77.042)).toBe(true);
  });

  it('returns true for Miraflores', () => {
    expect(isWithinLima(-12.119, -77.029)).toBe(true);
  });

  it('returns true for San Isidro', () => {
    expect(isWithinLima(-12.097, -77.036)).toBe(true);
  });

  it('returns false when latitude is too far south (< -12.55)', () => {
    expect(isWithinLima(-13.0, -77.042)).toBe(false);
  });

  it('returns false when latitude is too far north (> -11.70)', () => {
    expect(isWithinLima(-11.0, -77.042)).toBe(false);
  });

  it('returns false when longitude is too far west (< -77.20)', () => {
    expect(isWithinLima(-12.046, -78.0)).toBe(false);
  });

  it('returns false when longitude is too far east (> -76.65)', () => {
    expect(isWithinLima(-12.046, -76.0)).toBe(false);
  });

  it('returns true at the southern boundary (-12.55)', () => {
    expect(isWithinLima(-12.55, -77.0)).toBe(true);
  });

  it('returns true at the northern boundary (-11.70)', () => {
    expect(isWithinLima(-11.70, -77.0)).toBe(true);
  });

  it('returns true at the western boundary (-77.20)', () => {
    expect(isWithinLima(-12.0, -77.20)).toBe(true);
  });

  it('returns true at the eastern boundary (-76.65)', () => {
    expect(isWithinLima(-12.0, -76.65)).toBe(true);
  });

  it('returns false for completely outside Lima', () => {
    expect(isWithinLima(-15.0, -75.0)).toBe(false);
  });
});

// ── spreadOverlappingMarkers ───────────────────────────────────────────────

describe('spreadOverlappingMarkers', () => {
  const SAME = { latitude: -12.1074985, longitude: -77.0328097 };

  it('leaves points untouched when no coordinates coincide', () => {
    const items = [
      { id: 1, latitude: -12.046, longitude: -77.042 },
      { id: 2, latitude: -12.12, longitude: -77.03 },
    ];
    const result = spreadOverlappingMarkers(items);
    expect(result).toEqual(items);
    // Los singletons se devuelven sin copiar: misma referencia.
    expect(result[0]).toBe(items[0]);
    expect(result[1]).toBe(items[1]);
  });

  it('spreads two coincident points roughly `radiusMeters` apart from the original', () => {
    const items = [
      { id: 1, ...SAME },
      { id: 2, ...SAME },
    ];
    const result = spreadOverlappingMarkers(items, 18);
    for (const p of result) {
      expect(haversineMeters(SAME, p)).toBeCloseTo(18, 0);
    }
    // Y distintos entre sí — si no, seguirían superpuestos.
    expect(haversineMeters(result[0], result[1])).toBeGreaterThan(1);
  });

  it('spreads a group of 3+ into distinct positions', () => {
    const items = [
      { id: 1, ...SAME },
      { id: 2, ...SAME },
      { id: 3, ...SAME },
    ];
    const result = spreadOverlappingMarkers(items);
    const keys = new Set(result.map((p) => `${p.latitude},${p.longitude}`));
    expect(keys.size).toBe(3);
  });

  it('treats near-duplicate coordinates (~1 m apart) as the same group', () => {
    const items = [
      { id: 1, latitude: -12.1074985, longitude: -77.0328097 },
      { id: 2, latitude: -12.1074986, longitude: -77.0328098 }, // ruido de precisión de punto flotante
    ];
    const result = spreadOverlappingMarkers(items);
    expect(result[0]).not.toEqual(items[0]);
    expect(result[1]).not.toEqual(items[1]);
  });

  it('preserves the original array order', () => {
    const items = [
      { id: 1, ...SAME },
      { id: 2, latitude: -12.05, longitude: -77.05 },
      { id: 3, ...SAME },
    ];
    const result = spreadOverlappingMarkers(items);
    expect(result.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it('preserves extra fields on each item', () => {
    const items = [
      { id: 1, ...SAME, price: 850 },
      { id: 2, ...SAME, price: 950 },
    ];
    const result = spreadOverlappingMarkers(items);
    expect(result.map((p) => p.price).sort()).toEqual([850, 950]);
  });
});
