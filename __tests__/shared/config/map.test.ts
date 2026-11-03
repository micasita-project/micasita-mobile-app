import {
  OSM_TILE_URL,
  LIMA_REGION,
  DEFAULT_ZOOM_DELTA,
  ROUTE_POLYLINE_WIDTH,
  MAP_ANIMATION_DURATION,
} from '@/shared/config/map';

describe('map config', () => {
  it('LIMA_REGION está centrada en Lima, Perú', () => {
    expect(LIMA_REGION.latitude).toBeCloseTo(-12.0464, 4);
    expect(LIMA_REGION.longitude).toBeCloseTo(-77.0428, 4);
  });

  it('LIMA_REGION tiene deltas positivos que cubren la metrópoli', () => {
    expect(LIMA_REGION.latitudeDelta).toBe(0.08);
    expect(LIMA_REGION.longitudeDelta).toBe(0.08);
  });

  it('el zoom por defecto es más cercano que la región de Lima', () => {
    expect(DEFAULT_ZOOM_DELTA.latitudeDelta).toBe(0.05);
    expect(DEFAULT_ZOOM_DELTA.longitudeDelta).toBe(0.05);
    expect(DEFAULT_ZOOM_DELTA.latitudeDelta).toBeLessThan(LIMA_REGION.latitudeDelta);
  });

  it('define el ancho de la ruta y la duración de la animación', () => {
    expect(ROUTE_POLYLINE_WIDTH).toBe(4);
    expect(MAP_ANIMATION_DURATION).toBe(1000);
  });

  it('OSM_TILE_URL proviene de ENV.OSM_TILE_URL', () => {
    const { ENV } = require('@/shared/config/env');
    expect(OSM_TILE_URL).toBe(ENV.OSM_TILE_URL);
  });

  it('OSM_TILE_URL refleja la variable de entorno al cargar el módulo', () => {
    const prev = process.env.EXPO_PUBLIC_OSM_TILE_URL;
    process.env.EXPO_PUBLIC_OSM_TILE_URL = 'https://tiles.test/{z}/{x}/{y}.png';
    let url: string | undefined;
    jest.isolateModules(() => {
      url = require('@/shared/config/map').OSM_TILE_URL;
    });
    if (prev === undefined) delete process.env.EXPO_PUBLIC_OSM_TILE_URL;
    else process.env.EXPO_PUBLIC_OSM_TILE_URL = prev;
    expect(url).toBe('https://tiles.test/{z}/{x}/{y}.png');
  });
});
