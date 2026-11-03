jest.mock(
  '@/entities/recommendation-preferences/api/recommendation-preferences.api',
  () => ({
    createPreference: jest.fn(),
    fetchPreferences: jest.fn(),
    updatePreference: jest.fn(),
  }),
);

import { act } from 'react-test-renderer';
import * as api from '@/entities/recommendation-preferences/api/recommendation-preferences.api';
import {
  preferenceKeys,
  usePreferences,
  useCreatePreference,
  useUpdatePreference,
} from '@/entities/recommendation-preferences/model/useRecommendationPreferences';
import {
  mountHook,
  waitUntil,
  flush,
  createTestQueryClient,
  makeQueryWrapper,
} from '../../_helpers/state/mountHook';

const mocked = api as jest.Mocked<typeof api>;

let client: ReturnType<typeof createTestQueryClient>;
beforeEach(() => {
  client = createTestQueryClient();
});
const setup = <T,>(hook: () => T) => mountHook(hook, makeQueryWrapper(client));

describe('preferenceKeys', () => {
  it('byWorkplace extiende la clave base', () => {
    expect(preferenceKeys.all).toEqual(['recommendation-preferences']);
    expect(preferenceKeys.byWorkplace(3)).toEqual(['recommendation-preferences', 3]);
  });
});

describe('usePreferences', () => {
  it('con workplaceId consulta las preferencias de ese workplace', async () => {
    const prefs = { id: 1, budget: 100 } as any;
    mocked.fetchPreferences.mockResolvedValue(prefs);
    const { result } = setup(() => usePreferences(8));
    await waitUntil(() => result.current.isSuccess);
    expect(mocked.fetchPreferences).toHaveBeenCalledWith(8);
    expect(result.current.data).toEqual(prefs);
    expect(client.getQueryData(preferenceKeys.byWorkplace(8))).toEqual(prefs);
  });

  it('con workplaceId null no consulta', async () => {
    const { result } = setup(() => usePreferences(null));
    await flush();
    expect(mocked.fetchPreferences).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('expone el error', async () => {
    mocked.fetchPreferences.mockRejectedValue(new Error('x'));
    const { result } = setup(() => usePreferences(8));
    await waitUntil(() => result.current.isError);
    expect(result.current.isError).toBe(true);
  });
});

describe('useCreatePreference', () => {
  it('crea e invalida la clave del workplace y la clave base', async () => {
    mocked.createPreference.mockResolvedValue({ id: 1 } as any);
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useCreatePreference());
    const data = { workplace_id: 5, budget: 1, preferred_transportation: 'driving' } as any;
    await act(async () => {
      await result.current.mutateAsync(data);
    });
    expect(mocked.createPreference).toHaveBeenCalledWith(data);
    expect(spy).toHaveBeenCalledWith({ queryKey: preferenceKeys.byWorkplace(5) });
    expect(spy).toHaveBeenCalledWith({ queryKey: preferenceKeys.all });
  });

  it('si falla no invalida', async () => {
    mocked.createPreference.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useCreatePreference());
    await act(async () => {
      await result.current.mutateAsync({ workplace_id: 5 } as any).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useUpdatePreference', () => {
  it('actualiza con id y datos e invalida la clave base', async () => {
    mocked.updatePreference.mockResolvedValue({ id: 2 } as any);
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useUpdatePreference());
    const data = { budget: 500 } as any;
    await act(async () => {
      await result.current.mutateAsync({ id: 2, data });
    });
    expect(mocked.updatePreference).toHaveBeenCalledWith(2, data);
    expect(spy).toHaveBeenCalledWith({ queryKey: preferenceKeys.all });
  });

  it('si falla no invalida', async () => {
    mocked.updatePreference.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useUpdatePreference());
    await act(async () => {
      await result.current.mutateAsync({ id: 2, data: {} as any }).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
