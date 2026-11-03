const KEYS = ['EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_OSM_TILE_URL'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  KEYS.forEach((k) => (saved[k] = process.env[k]));
});
afterEach(() => {
  KEYS.forEach((k) => {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  });
});

function loadEnv() {
  let mod: typeof import('@/shared/config/env');
  jest.isolateModules(() => {
    mod = require('@/shared/config/env');
  });
  return mod!.ENV;
}

describe('ENV', () => {
  it('lee API_BASE_URL de EXPO_PUBLIC_API_BASE_URL', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test';
    expect(loadEnv().API_BASE_URL).toBe('https://api.test');
  });

  it('lee OSM_TILE_URL de EXPO_PUBLIC_OSM_TILE_URL', () => {
    process.env.EXPO_PUBLIC_OSM_TILE_URL = 'https://tiles.test/{z}/{x}/{y}.png';
    expect(loadEnv().OSM_TILE_URL).toBe('https://tiles.test/{z}/{x}/{y}.png');
  });

  it('las dos variables son independientes', () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://a';
    process.env.EXPO_PUBLIC_OSM_TILE_URL = 'https://b';
    const env = loadEnv();
    expect(env.API_BASE_URL).toBe('https://a');
    expect(env.OSM_TILE_URL).toBe('https://b');
  });

  it('deja undefined una variable no definida', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    expect(loadEnv().API_BASE_URL).toBeUndefined();
  });
});
