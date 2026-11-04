jest.mock('@/features/auth/api/auth.service', () => ({
  getMe: jest.fn(),
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
  registerUser: jest.fn(),
  resendVerification: jest.fn(),
  updateHome: jest.fn(),
  verifyEmail: jest.fn(),
}));
jest.mock('@/shared/api', () => ({
  getAuthToken: jest.fn(),
  queryClient: { clear: jest.fn() },
}));
jest.mock('@/entities/recommendation-preferences', () => ({
  createPreference: jest.fn(),
}));
jest.mock('@/entities/workplace/api/workplace.api', () => ({
  createWorkplace: jest.fn(),
}));
jest.mock('@/features/recommendation/api/recommendation.api', () => ({
  importGuestRecommendations: jest.fn(),
}));

import React, { type ReactNode } from 'react';
import { act } from 'react-test-renderer';
import { AuthProvider, useAuth } from '@/features/auth/model/AuthContext';
import * as authService from '@/features/auth/api/auth.service';
import { getAuthToken, queryClient } from '@/shared/api';
import { createPreference } from '@/entities/recommendation-preferences';
import { createWorkplace } from '@/entities/workplace/api/workplace.api';
import { importGuestRecommendations } from '@/features/recommendation/api/recommendation.api';
import { mountHook, flush } from '../../_helpers/state/mountHook';

const svc = authService as jest.Mocked<typeof authService>;
const mockGetToken = getAuthToken as jest.Mock;
const mockClear = queryClient.clear as jest.Mock;
const mockCreateWorkplace = createWorkplace as jest.Mock;
const mockCreatePreference = createPreference as jest.Mock;
const mockImport = importGuestRecommendations as jest.Mock;

const USER = { id: 1, email: 'a@b.com', name: 'Ana' } as any;
const USER_WITH_HOME = { ...USER, home_address: 'Calle 1' } as any;

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const httpError = (status: number, detail?: string) => ({
  response: { status, data: detail === undefined ? {} : { detail } },
});

async function mountAuth() {
  const hook = mountHook(() => useAuth(), wrapper);
  await flush();
  return hook;
}

const GUEST = {
  home: { lat: 1, lon: 2, address: 'Av. Casa 123' },
  workplace: {
    lat: 3,
    lon: 4,
    budget: 1500,
    transport: 'driving',
    address: 'Oficina Central, Lima',
    maxDistanceKm: 7,
  },
  recommendations: { results: [{ id: 1 }], total: 1 } as any,
};

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockGetToken.mockResolvedValue(null);
  svc.getMe.mockResolvedValue(USER);
  svc.loginUser.mockResolvedValue({} as any);
  svc.logoutUser.mockResolvedValue(undefined as any);
  svc.verifyEmail.mockResolvedValue(undefined as any);
  mockCreateWorkplace.mockResolvedValue({ id: 99 });
  mockCreatePreference.mockResolvedValue({});
  mockImport.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useAuth', () => {
  it('lanza un error si se usa fuera del AuthProvider', () => {
    expect(() => mountHook(() => useAuth())).toThrow(
      'useAuth debe ser usado dentro de un AuthProvider',
    );
  });
});

describe('AuthProvider: inicialización desde almacenamiento', () => {
  it('sin token queda inicializado y sin usuario, sin consultar el perfil', async () => {
    const { result } = await mountAuth();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(svc.getMe).not.toHaveBeenCalled();
  });

  it('con token restaura la sesión con el perfil del backend', async () => {
    mockGetToken.mockResolvedValue('tok');
    const { result } = await mountAuth();
    expect(svc.getMe).toHaveBeenCalledTimes(1);
    expect(result.current.user).toEqual(USER);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isInitialized).toBe(true);
  });

  it('con 401 limpia la sesión (logout + cache) y queda inicializado', async () => {
    mockGetToken.mockResolvedValue('tok');
    svc.getMe.mockRejectedValue(httpError(401));
    const { result } = await mountAuth();
    expect(svc.logoutUser).toHaveBeenCalledTimes(1);
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.isInitialized).toBe(true);
  });

  it('con un error distinto de 401 no cierra la sesión y queda inicializado', async () => {
    mockGetToken.mockResolvedValue('tok');
    svc.getMe.mockRejectedValue(httpError(500));
    const { result } = await mountAuth();
    expect(svc.logoutUser).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(true);
  });

  it('si falla la lectura del token (sin response) queda inicializado sin cerrar sesión', async () => {
    mockGetToken.mockRejectedValue(new Error('secure store'));
    const { result } = await mountAuth();
    expect(svc.logoutUser).not.toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.user).toBeNull();
  });
});

describe('login', () => {
  it('éxito: inicia sesión, carga el perfil y apaga isLoading', async () => {
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.login('a@b.com', 'pw');
    });
    expect(svc.loginUser).toHaveBeenCalledWith('a@b.com', 'pw');
    expect(res).toEqual({ success: true });
    expect(result.current.user).toEqual(USER);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('isLoading es true mientras la petición está en curso', async () => {
    const { result } = await mountAuth();
    let resolve!: (v: any) => void;
    svc.loginUser.mockReturnValue(new Promise((r) => (resolve = r)));
    let p!: Promise<any>;
    act(() => {
      p = result.current.login('a@b.com', 'pw');
    });
    expect(result.current.isLoading).toBe(true);
    await act(async () => {
      resolve({});
      await p;
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('403 con detalle de verificación devuelve needsVerification y guarda pendingEmail', async () => {
    svc.loginUser.mockRejectedValue(httpError(403, 'Debes Verificar tu correo'));
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.login('a@b.com', 'pw');
    });
    expect(res).toEqual({
      success: false,
      error: 'Debes Verificar tu correo',
      needsVerification: true,
    });
    expect(result.current.pendingEmail).toBe('a@b.com');
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('403 con otro detalle devuelve ese detalle sin needsVerification ni pendingEmail', async () => {
    svc.loginUser.mockRejectedValue(httpError(403, 'Cuenta suspendida'));
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.login('a@b.com', 'pw');
    });
    expect(res).toEqual({ success: false, error: 'Cuenta suspendida' });
    expect(res.needsVerification).toBeUndefined();
    expect(result.current.pendingEmail).toBeNull();
  });

  it('403 sin detalle usa el mensaje de cuenta bloqueada', async () => {
    svc.loginUser.mockRejectedValue({ response: { status: 403 } });
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.login('a@b.com', 'pw');
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe(
      'Tu cuenta ha sido bloqueada. Comunícate con un administrador.',
    );
  });

  it('401 devuelve credenciales incorrectas', async () => {
    svc.loginUser.mockRejectedValue(httpError(401, 'x'));
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.login('a@b.com', 'bad');
    });
    expect(res).toEqual({ success: false, error: 'Email o contraseña incorrectos.' });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('error de red (sin response) devuelve credenciales incorrectas', async () => {
    svc.loginUser.mockRejectedValue(new Error('Network Error'));
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.login('a@b.com', 'pw');
    });
    expect(res.error).toBe('Email o contraseña incorrectos.');
  });

  it('si getMe falla tras el login no deja usuario establecido', async () => {
    svc.getMe.mockRejectedValue(httpError(500));
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.login('a@b.com', 'pw');
    });
    expect(res.success).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('register', () => {
  it('éxito: envía los datos mapeados, guarda pendingEmail y no inicia sesión', async () => {
    svc.registerUser.mockResolvedValue({} as any);
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.register('a@b.com', 'pw', undefined, 'Ana', 'Pérez', true);
    });
    expect(svc.registerUser).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      name: 'Ana',
      last_name: 'Pérez',
      accepted_terms: true,
    });
    expect(res).toEqual({ success: true });
    expect(result.current.pendingEmail).toBe('a@b.com');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('acceptedTerms vale false por defecto', async () => {
    svc.registerUser.mockResolvedValue({} as any);
    const { result } = await mountAuth();
    await act(async () => {
      await result.current.register('a@b.com', 'pw');
    });
    expect(svc.registerUser).toHaveBeenCalledWith(
      expect.objectContaining({ accepted_terms: false }),
    );
  });

  it('error con detalle del backend lo devuelve y no deja pendingEmail', async () => {
    svc.registerUser.mockRejectedValue(httpError(400, 'El correo ya existe'));
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.register('a@b.com', 'pw');
    });
    expect(res).toEqual({ success: false, error: 'El correo ya existe' });
    expect(console.warn).toHaveBeenCalledWith('Register failed:', expect.anything());
    expect(console.error).not.toHaveBeenCalled();
    expect(result.current.pendingEmail).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('error sin detalle devuelve el mensaje genérico', async () => {
    svc.registerUser.mockRejectedValue(new Error('boom'));
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.register('a@b.com', 'pw');
    });
    expect(res).toEqual({ success: false, error: 'Error al registrar' });
    expect(console.error).toHaveBeenCalledWith('Register failed:', expect.any(Error));
  });
});

describe('completePendingVerification', () => {
  async function registerFirst(guestData?: any) {
    svc.registerUser.mockResolvedValue({} as any);
    const hook = await mountAuth();
    await act(async () => {
      await hook.result.current.register('a@b.com', 'pw', guestData);
    });
    return hook;
  }

  it('sin verificación pendiente devuelve error de sesión expirada', async () => {
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.completePendingVerification('123456');
    });
    expect(res).toEqual({
      success: false,
      error: 'La sesión expiró. Inicia sesión nuevamente.',
    });
    expect(svc.verifyEmail).not.toHaveBeenCalled();
  });

  it('éxito sin datos de invitado: verifica, inicia sesión, carga el perfil y limpia pending', async () => {
    const { result } = await registerFirst();
    let res: any;
    await act(async () => {
      res = await result.current.completePendingVerification('123456');
    });
    expect(svc.verifyEmail).toHaveBeenCalledWith('a@b.com', '123456');
    expect(svc.loginUser).toHaveBeenCalledWith('a@b.com', 'pw');
    expect(res).toEqual({ success: true });
    expect(result.current.user).toEqual(USER);
    expect(result.current.pendingEmail).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(svc.updateHome).not.toHaveBeenCalled();
    expect(mockCreateWorkplace).not.toHaveBeenCalled();
  });

  it('verifica antes de iniciar sesión', async () => {
    const { result } = await registerFirst();
    const order: string[] = [];
    svc.verifyEmail.mockImplementation(async () => void order.push('verify'));
    svc.loginUser.mockImplementation(async () => void order.push('login') as any);
    await act(async () => {
      await result.current.completePendingVerification('1');
    });
    expect(order).toEqual(['verify', 'login']);
  });

  it('transfiere casa, trabajo, preferencias y recomendaciones del invitado', async () => {
    svc.updateHome.mockResolvedValue(USER_WITH_HOME);
    const { result } = await registerFirst(GUEST);
    await act(async () => {
      await result.current.completePendingVerification('123456');
    });
    expect(svc.updateHome).toHaveBeenCalledWith({
      home_lat: 1,
      home_lon: 2,
      home_address: 'Av. Casa 123',
    });
    expect(mockCreateWorkplace).toHaveBeenCalledWith({
      work_address: 'Oficina Central',
      work_lat: 3,
      work_lon: 4,
    });
    expect(mockCreatePreference).toHaveBeenCalledWith({
      workplace_id: 99,
      budget: 1500,
      preferred_transportation: 'driving',
      max_distance_km: 7,
    });
    expect(mockImport).toHaveBeenCalledWith(99, GUEST.recommendations);
    expect(result.current.user).toEqual(USER_WITH_HOME);
  });

  it('no importa recomendaciones si la lista de resultados está vacía', async () => {
    const { result } = await registerFirst({
      workplace: GUEST.workplace,
      recommendations: { results: [], total: 0 },
    });
    await act(async () => {
      await result.current.completePendingVerification('1');
    });
    expect(mockCreatePreference).toHaveBeenCalled();
    expect(mockImport).not.toHaveBeenCalled();
  });

  it('no importa recomendaciones si no hay en los datos de invitado', async () => {
    const { result } = await registerFirst({ workplace: GUEST.workplace });
    await act(async () => {
      await result.current.completePendingVerification('1');
    });
    expect(mockImport).not.toHaveBeenCalled();
  });

  it('usa "Mi Trabajo" si la primera parte de la dirección está vacía', async () => {
    const { result } = await registerFirst({
      workplace: { ...GUEST.workplace, address: ' , Lima' },
    });
    await act(async () => {
      await result.current.completePendingVerification('1');
    });
    expect(mockCreateWorkplace).toHaveBeenCalledWith(
      expect.objectContaining({ work_address: 'Mi Trabajo' }),
    );
  });

  it('solo con casa de invitado no crea trabajo', async () => {
    svc.updateHome.mockResolvedValue(USER_WITH_HOME);
    const { result } = await registerFirst({ home: GUEST.home });
    await act(async () => {
      await result.current.completePendingVerification('1');
    });
    expect(svc.updateHome).toHaveBeenCalled();
    expect(mockCreateWorkplace).not.toHaveBeenCalled();
  });

  it('si falla updateHome conserva el perfil de getMe y completa igualmente', async () => {
    svc.updateHome.mockRejectedValue(new Error('x'));
    const { result } = await registerFirst(GUEST);
    let res: any;
    await act(async () => {
      res = await result.current.completePendingVerification('1');
    });
    expect(res).toEqual({ success: true });
    expect(result.current.user).toEqual(USER);
    expect(mockCreateWorkplace).toHaveBeenCalled();
  });

  it('si falla createWorkplace no crea preferencia ni importa y completa igualmente', async () => {
    mockCreateWorkplace.mockRejectedValue(new Error('x'));
    svc.updateHome.mockResolvedValue(USER_WITH_HOME);
    const { result } = await registerFirst(GUEST);
    let res: any;
    await act(async () => {
      res = await result.current.completePendingVerification('1');
    });
    expect(res).toEqual({ success: true });
    expect(mockCreatePreference).not.toHaveBeenCalled();
    expect(mockImport).not.toHaveBeenCalled();
  });

  it('si falla createPreference no importa recomendaciones', async () => {
    mockCreatePreference.mockRejectedValue(new Error('x'));
    const { result } = await registerFirst(GUEST);
    await act(async () => {
      await result.current.completePendingVerification('1');
    });
    expect(mockImport).not.toHaveBeenCalled();
  });

  it('si falla la importación de recomendaciones no rompe la verificación', async () => {
    mockImport.mockRejectedValue(new Error('x'));
    const { result } = await registerFirst(GUEST);
    let res: any;
    await act(async () => {
      res = await result.current.completePendingVerification('1');
    });
    await flush();
    expect(res).toEqual({ success: true });
  });

  it('código incorrecto devuelve el detalle, mantiene pending y no inicia sesión', async () => {
    svc.verifyEmail.mockRejectedValue(httpError(400, 'OTP inválido'));
    const { result } = await registerFirst();
    let res: any;
    await act(async () => {
      res = await result.current.completePendingVerification('000000');
    });
    expect(res).toEqual({ success: false, error: 'OTP inválido' });
    expect(result.current.pendingEmail).toBe('a@b.com');
    expect(result.current.user).toBeNull();
    expect(svc.loginUser).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('error sin detalle devuelve el mensaje genérico de código', async () => {
    svc.verifyEmail.mockRejectedValue(new Error('x'));
    const { result } = await registerFirst();
    let res: any;
    await act(async () => {
      res = await result.current.completePendingVerification('1');
    });
    expect(res.error).toBe('Código incorrecto o expirado.');
  });

  it('tras un login bloqueado por verificación usa la contraseña guardada', async () => {
    svc.loginUser.mockRejectedValueOnce(httpError(403, 'Verifica tu correo'));
    const { result } = await mountAuth();
    await act(async () => {
      await result.current.login('a@b.com', 'secret');
    });
    await act(async () => {
      await result.current.completePendingVerification('111111');
    });
    expect(svc.verifyEmail).toHaveBeenCalledWith('a@b.com', '111111');
    expect(svc.loginUser).toHaveBeenLastCalledWith('a@b.com', 'secret');
    expect(result.current.user).toEqual(USER);
    expect(result.current.pendingEmail).toBeNull();
  });
});

describe('resendVerification', () => {
  it('éxito', async () => {
    svc.resendVerification.mockResolvedValue(undefined as any);
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.resendVerification('a@b.com');
    });
    expect(svc.resendVerification).toHaveBeenCalledWith('a@b.com');
    expect(res).toEqual({ success: true });
  });

  it('error con detalle', async () => {
    svc.resendVerification.mockRejectedValue(httpError(429, 'Espera un minuto'));
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.resendVerification('a@b.com');
    });
    expect(res).toEqual({ success: false, error: 'Espera un minuto' });
  });

  it('error sin detalle usa el mensaje genérico', async () => {
    svc.resendVerification.mockRejectedValue(new Error('x'));
    const { result } = await mountAuth();
    let res: any;
    await act(async () => {
      res = await result.current.resendVerification('a@b.com');
    });
    expect(res).toEqual({ success: false, error: 'No se pudo reenviar el código.' });
  });
});

describe('logout', () => {
  it('cierra sesión en el servicio, limpia la cache y borra el usuario', async () => {
    mockGetToken.mockResolvedValue('tok');
    const { result } = await mountAuth();
    expect(result.current.isAuthenticated).toBe(true);
    await act(async () => {
      await result.current.logout();
    });
    expect(svc.logoutUser).toHaveBeenCalledTimes(1);
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

describe('refreshUser', () => {
  it('actualiza el usuario con el perfil nuevo', async () => {
    mockGetToken.mockResolvedValue('tok');
    const { result } = await mountAuth();
    svc.getMe.mockResolvedValue({ ...USER, name: 'Nuevo' });
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(result.current.user?.name).toBe('Nuevo');
  });

  it('con 401 cierra la sesión', async () => {
    mockGetToken.mockResolvedValue('tok');
    const { result } = await mountAuth();
    svc.getMe.mockRejectedValue(httpError(401));
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(svc.logoutUser).toHaveBeenCalledTimes(1);
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });

  it('con otro error conserva el usuario actual', async () => {
    mockGetToken.mockResolvedValue('tok');
    const { result } = await mountAuth();
    svc.getMe.mockRejectedValue(httpError(500));
    await act(async () => {
      await result.current.refreshUser();
    });
    expect(svc.logoutUser).not.toHaveBeenCalled();
    expect(result.current.user).toEqual(USER);
  });
});

describe('setHome', () => {
  const HOME = { home_lat: 1, home_lon: 2, home_address: 'X' } as any;

  it('éxito: devuelve true y actualiza el usuario', async () => {
    svc.updateHome.mockResolvedValue(USER_WITH_HOME);
    const { result } = await mountAuth();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.setHome(HOME);
    });
    expect(svc.updateHome).toHaveBeenCalledWith(HOME);
    expect(ok).toBe(true);
    expect(result.current.user).toEqual(USER_WITH_HOME);
    expect(result.current.isLoading).toBe(false);
  });

  it('error: devuelve false, conserva el usuario y apaga isLoading', async () => {
    svc.updateHome.mockRejectedValue(new Error('x'));
    mockGetToken.mockResolvedValue('tok');
    const { result } = await mountAuth();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.setHome(HOME);
    });
    expect(ok).toBe(false);
    expect(result.current.user).toEqual(USER);
    expect(result.current.isLoading).toBe(false);
  });
});
