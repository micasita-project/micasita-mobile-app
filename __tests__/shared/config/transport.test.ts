import {
  TRANSPORT_MODE_CONFIG,
  getTransportConfig,
  normalizeTransportMode,
} from '@/shared/config/transport';
import { TRANSPORT_MODE_COLORS } from '@/shared/types';

describe('TRANSPORT_MODE_CONFIG', () => {
  it('tiene los tres modos en orden driving, cycling, walking', () => {
    expect(TRANSPORT_MODE_CONFIG.map((c) => c.id)).toEqual(['driving', 'cycling', 'walking']);
  });

  it('usa el color definido para cada modo en TRANSPORT_MODE_COLORS', () => {
    for (const c of TRANSPORT_MODE_CONFIG) {
      expect(c.color).toBe(TRANSPORT_MODE_COLORS[c.id]);
    }
  });

  it('define etiquetas e íconos esperados', () => {
    expect(TRANSPORT_MODE_CONFIG).toEqual([
      expect.objectContaining({ id: 'driving', label: 'Auto', labelFull: 'Auto', icon: 'car', iconOutline: 'car-outline' }),
      expect.objectContaining({ id: 'cycling', label: 'Bici', labelFull: 'Bicicleta', icon: 'bicycle', iconOutline: 'bicycle-outline' }),
      expect.objectContaining({ id: 'walking', label: 'A pie', labelFull: 'Caminando', icon: 'walk', iconOutline: 'walk-outline' }),
    ]);
  });
});

describe('getTransportConfig', () => {
  it.each(['driving', 'cycling', 'walking'] as const)('devuelve la configuración de %s', (mode) => {
    expect(getTransportConfig(mode).id).toBe(mode);
  });

  it('devuelve undefined para un modo desconocido', () => {
    expect(getTransportConfig('flying' as any)).toBeUndefined();
  });
});

describe('normalizeTransportMode', () => {
  it.each(['driving', 'cycling', 'walking'])('conserva el valor válido %s', (v) => {
    expect(normalizeTransportMode(v)).toBe(v);
  });

  it.each([
    ['Auto', 'driving'],
    ['Bicicleta', 'cycling'],
    ['Caminando', 'walking'],
  ])('convierte la etiqueta heredada %s a %s', (legacy, mode) => {
    expect(normalizeTransportMode(legacy)).toBe(mode);
  });

  it.each([undefined, null, '', 'Moto', 'DRIVING', 'auto'])('usa driving por defecto para %p', (v) => {
    expect(normalizeTransportMode(v as any)).toBe('driving');
  });
});
