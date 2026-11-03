jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import React, { type ReactNode } from 'react';
import { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GuestProvider, useGuest } from '@/features/guest/model/GuestContext';
import { mountHook, flush } from '../../_helpers/state/mountHook';

const HOME_KEY = 'micasita_guest_home';
const WORK_KEY = 'micasita_guest_workplace';
const RECS_KEY = 'micasita_guest_recommendations';

const HOME = { lat: -12.1, lon: -77.0, address: 'Av. Casa 1' };
const WORK = {
  lat: -12.0,
  lon: -77.1,
  budget: 2000,
  transport: 'driving' as const,
  address: 'Oficina',
  maxDistanceKm: 5,
};
const RECS = { results: [{ id: 1 }], total: 1 } as any;

const wrapper = ({ children }: { children: ReactNode }) => (
  <GuestProvider>{children}</GuestProvider>
);

async function mountGuest() {
  const hook = mountHook(() => useGuest(), wrapper);
  await flush();
  return hook;
}

const stored = async (key: string) => {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('useGuest', () => {
  it('lanza un error fuera de GuestProvider', () => {
    expect(() => mountHook(() => useGuest())).toThrow(
      'useGuest debe usarse dentro de GuestProvider',
    );
  });
});

describe('GuestProvider: carga desde AsyncStorage', () => {
  it('sin datos guardados queda inicializado con todo en null', async () => {
    const { result } = await mountGuest();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.guestHome).toBeNull();
    expect(result.current.guestWorkplace).toBeNull();
    expect(result.current.guestRecommendations).toBeNull();
  });

  it('restaura casa, trabajo y recomendaciones guardados', async () => {
    await AsyncStorage.setItem(HOME_KEY, JSON.stringify(HOME));
    await AsyncStorage.setItem(WORK_KEY, JSON.stringify(WORK));
    await AsyncStorage.setItem(RECS_KEY, JSON.stringify(RECS));
    const { result } = await mountGuest();
    expect(result.current.guestHome).toEqual(HOME);
    expect(result.current.guestWorkplace).toEqual(WORK);
    expect(result.current.guestRecommendations).toEqual(RECS);
  });

  it('restaura solo lo que existe', async () => {
    await AsyncStorage.setItem(WORK_KEY, JSON.stringify(WORK));
    const { result } = await mountGuest();
    expect(result.current.guestHome).toBeNull();
    expect(result.current.guestWorkplace).toEqual(WORK);
    expect(result.current.guestRecommendations).toBeNull();
  });

  it('si la lectura falla queda inicializado igualmente', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('io'));
    const { result } = await mountGuest();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.guestHome).toBeNull();
  });

  it('si el JSON está corrupto queda inicializado sin lanzar', async () => {
    await AsyncStorage.setItem(HOME_KEY, '{no-json');
    const { result } = await mountGuest();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.guestHome).toBeNull();
  });
});

describe('setGuestHome', () => {
  it('actualiza el estado y persiste en la clave de casa', async () => {
    const { result } = await mountGuest();
    await act(async () => {
      await result.current.setGuestHome(HOME);
    });
    expect(result.current.guestHome).toEqual(HOME);
    expect(await stored(HOME_KEY)).toEqual(HOME);
  });

  it('no invalida las recomendaciones guardadas', async () => {
    await AsyncStorage.setItem(RECS_KEY, JSON.stringify(RECS));
    const { result } = await mountGuest();
    await act(async () => {
      await result.current.setGuestHome(HOME);
    });
    expect(result.current.guestRecommendations).toEqual(RECS);
    expect(await stored(RECS_KEY)).toEqual(RECS);
  });
});

describe('setGuestWorkplace', () => {
  it('actualiza el estado y persiste en la clave de trabajo', async () => {
    const { result } = await mountGuest();
    await act(async () => {
      await result.current.setGuestWorkplace(WORK);
    });
    expect(result.current.guestWorkplace).toEqual(WORK);
    expect(await stored(WORK_KEY)).toEqual(WORK);
  });

  it('invalida las recomendaciones (estado y almacenamiento) al cambiar el trabajo', async () => {
    await AsyncStorage.setItem(RECS_KEY, JSON.stringify(RECS));
    const { result } = await mountGuest();
    expect(result.current.guestRecommendations).toEqual(RECS);
    await act(async () => {
      await result.current.setGuestWorkplace(WORK);
    });
    expect(result.current.guestRecommendations).toBeNull();
    expect(await stored(RECS_KEY)).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(RECS_KEY);
  });

  it('no toca la casa guardada', async () => {
    await AsyncStorage.setItem(HOME_KEY, JSON.stringify(HOME));
    const { result } = await mountGuest();
    await act(async () => {
      await result.current.setGuestWorkplace(WORK);
    });
    expect(result.current.guestHome).toEqual(HOME);
    expect(await stored(HOME_KEY)).toEqual(HOME);
  });
});

describe('saveGuestRecommendations', () => {
  it('actualiza el estado y persiste en la clave de recomendaciones', async () => {
    const { result } = await mountGuest();
    await act(async () => {
      await result.current.saveGuestRecommendations(RECS);
    });
    expect(result.current.guestRecommendations).toEqual(RECS);
    expect(await stored(RECS_KEY)).toEqual(RECS);
  });
});

describe('updateGuestRadius', () => {
  it('sin trabajo guardado no hace nada', async () => {
    const { result } = await mountGuest();
    await act(async () => {
      await result.current.updateGuestRadius(10);
    });
    expect(result.current.guestWorkplace).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('con trabajo cambia solo el radio, en estado y almacenamiento', async () => {
    await AsyncStorage.setItem(WORK_KEY, JSON.stringify(WORK));
    const { result } = await mountGuest();
    await act(async () => {
      await result.current.updateGuestRadius(12);
    });
    expect(result.current.guestWorkplace).toEqual({ ...WORK, maxDistanceKm: 12 });
    expect(await stored(WORK_KEY)).toEqual({ ...WORK, maxDistanceKm: 12 });
  });

  it('usa el trabajo más reciente tras setGuestWorkplace', async () => {
    const { result } = await mountGuest();
    await act(async () => {
      await result.current.setGuestWorkplace(WORK);
    });
    await act(async () => {
      await result.current.updateGuestRadius(3);
    });
    expect(result.current.guestWorkplace).toEqual({ ...WORK, maxDistanceKm: 3 });
  });
});

describe('clearGuestData', () => {
  it('vacía estado y borra las tres claves', async () => {
    await AsyncStorage.setItem(HOME_KEY, JSON.stringify(HOME));
    await AsyncStorage.setItem(WORK_KEY, JSON.stringify(WORK));
    await AsyncStorage.setItem(RECS_KEY, JSON.stringify(RECS));
    const { result } = await mountGuest();
    await act(async () => {
      await result.current.clearGuestData();
    });
    expect(result.current.guestHome).toBeNull();
    expect(result.current.guestWorkplace).toBeNull();
    expect(result.current.guestRecommendations).toBeNull();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([HOME_KEY, WORK_KEY, RECS_KEY]);
    expect(await stored(HOME_KEY)).toBeNull();
    expect(await stored(WORK_KEY)).toBeNull();
    expect(await stored(RECS_KEY)).toBeNull();
  });
});
