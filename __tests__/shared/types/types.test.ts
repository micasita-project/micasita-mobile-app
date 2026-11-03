import { TRANSPORT_MODE_COLORS, TRANSPORT_MODE_SPEEDS } from '@/shared/types';

describe('TRANSPORT_MODE_COLORS', () => {
  it('define un color hex por cada modo', () => {
    expect(TRANSPORT_MODE_COLORS).toEqual({
      driving: '#E74C3C',
      cycling: '#27AE60',
      walking: '#2E86C1',
    });
  });

  it('usa colores distintos para cada modo', () => {
    expect(new Set(Object.values(TRANSPORT_MODE_COLORS)).size).toBe(3);
  });
});

describe('TRANSPORT_MODE_SPEEDS', () => {
  it('define velocidades en km/h para bici y a pie', () => {
    expect(TRANSPORT_MODE_SPEEDS.cycling).toBe(15);
    expect(TRANSPORT_MODE_SPEEDS.walking).toBe(5);
  });

  it('usa 0 para auto (el tiempo lo da OSRM)', () => {
    expect(TRANSPORT_MODE_SPEEDS.driving).toBe(0);
  });

  it('la bici es más rápida que caminar', () => {
    expect(TRANSPORT_MODE_SPEEDS.cycling).toBeGreaterThan(TRANSPORT_MODE_SPEEDS.walking);
  });
});
