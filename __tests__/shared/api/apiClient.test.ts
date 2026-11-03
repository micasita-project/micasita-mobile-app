jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InternalAxiosRequestConfig } from 'axios';
import {
  apiClient,
  saveAuthToken,
  getAuthToken,
  removeAuthToken,
} from '@/shared/api/apiClient';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

const TOKEN_KEY = 'micasita_auth_token';

/** Adaptador falso que devuelve la config recibida, sin tocar la red. */
function installAdapter() {
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => ({
    data: { ok: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
  apiClient.defaults.adapter = adapter as any;
  return adapter;
}

describe('apiClient: configuración base', () => {
  it('usa un timeout de 15 segundos', () => {
    expect(apiClient.defaults.timeout).toBe(15000);
  });

  it('envía JSON por defecto', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('toma la baseURL de EXPO_PUBLIC_API_BASE_URL', () => {
    const previous = process.env.EXPO_PUBLIC_API_BASE_URL;
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.micasita.test';
    let isolated: typeof import('@/shared/api/apiClient');
    jest.isolateModules(() => {
      isolated = require('@/shared/api/apiClient');
    });
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL;
    else process.env.EXPO_PUBLIC_API_BASE_URL = previous;
    expect(isolated!.apiClient.defaults.baseURL).toBe('https://api.micasita.test');
  });
});

describe('apiClient: interceptor de petición', () => {
  it('agrega el header Authorization con el token guardado', async () => {
    mockGetItem.mockResolvedValueOnce('abc.def.ghi');
    const adapter = installAdapter();

    await apiClient.get('/properties');

    expect(mockGetItem).toHaveBeenCalledWith(TOKEN_KEY);
    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  it('no agrega Authorization cuando no hay token', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    const adapter = installAdapter();

    await apiClient.get('/properties');

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.headers.Authorization).toBeUndefined();
  });

  it('no agrega Authorization cuando el token es una cadena vacía', async () => {
    mockGetItem.mockResolvedValueOnce('');
    const adapter = installAdapter();

    await apiClient.get('/properties');

    expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined();
  });

  it('lee el token en cada petición (no lo cachea)', async () => {
    mockGetItem.mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2');
    const adapter = installAdapter();

    await apiClient.get('/a');
    await apiClient.get('/b');

    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer token-1');
    expect(adapter.mock.calls[1][0].headers.Authorization).toBe('Bearer token-2');
  });

  it('conserva los demás headers y el método de la petición', async () => {
    mockGetItem.mockResolvedValueOnce('tok');
    const adapter = installAdapter();

    await apiClient.post('/x', { a: 1 }, { headers: { 'X-Test': 'yes' } });

    const sentConfig = adapter.mock.calls[0][0];
    expect(sentConfig.method).toBe('post');
    expect(sentConfig.headers['X-Test']).toBe('yes');
    expect(sentConfig.headers.Authorization).toBe('Bearer tok');
  });

  it('propaga el error si AsyncStorage falla', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage down'));
    const adapter = installAdapter();

    await expect(apiClient.get('/properties')).rejects.toThrow('storage down');
    expect(adapter).not.toHaveBeenCalled();
  });

  it('propaga los errores HTTP de la respuesta (401) sin transformarlos', async () => {
    mockGetItem.mockResolvedValueOnce('expired');
    const error: any = new Error('Unauthorized');
    error.response = { status: 401 };
    apiClient.defaults.adapter = jest.fn().mockRejectedValue(error) as any;

    await expect(apiClient.get('/me')).rejects.toBe(error);
  });
});

describe('helpers de token', () => {
  it('saveAuthToken guarda el token bajo la clave correcta', async () => {
    await saveAuthToken('my-token');
    expect(mockSetItem).toHaveBeenCalledWith(TOKEN_KEY, 'my-token');
  });

  it('getAuthToken devuelve el token guardado', async () => {
    mockGetItem.mockResolvedValueOnce('stored');
    await expect(getAuthToken()).resolves.toBe('stored');
    expect(mockGetItem).toHaveBeenCalledWith(TOKEN_KEY);
  });

  it('getAuthToken devuelve null si no hay token', async () => {
    mockGetItem.mockResolvedValueOnce(null);
    await expect(getAuthToken()).resolves.toBeNull();
  });

  it('removeAuthToken borra la clave correcta', async () => {
    await removeAuthToken();
    expect(mockRemoveItem).toHaveBeenCalledWith(TOKEN_KEY);
  });

  it('saveAuthToken espera a que AsyncStorage termine', async () => {
    let done = false;
    mockSetItem.mockImplementationOnce(
      () => new Promise<void>((r) => setTimeout(() => { done = true; r(); }, 5)),
    );
    await saveAuthToken('t');
    expect(done).toBe(true);
  });

  it('removeAuthToken espera a que AsyncStorage termine', async () => {
    let done = false;
    mockRemoveItem.mockImplementationOnce(
      () => new Promise<void>((r) => setTimeout(() => { done = true; r(); }, 5)),
    );
    await removeAuthToken();
    expect(done).toBe(true);
  });

  it('saveAuthToken propaga el error de AsyncStorage', async () => {
    mockSetItem.mockRejectedValueOnce(new Error('full'));
    await expect(saveAuthToken('t')).rejects.toThrow('full');
  });
});
