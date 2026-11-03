jest.mock('@/shared/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { apiClient } from '@/shared/api';

import {
  createPreference,
  fetchPreferences,
  updatePreference,
} from '@/entities/recommendation-preferences/api/recommendation-preferences.api';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;

const pref = {
  id: 3,
  user_id: 1,
  workplace_id: 7,
  budget: 2000,
  preferred_transportation: 'driving',
  max_distance_km: 10,
};

describe('createPreference', () => {
  it('hace POST a /recommendation_preferences/ y devuelve la preferencia', async () => {
    const payload = { workplace_id: 7, budget: 2000, preferred_transportation: 'driving' };
    mockPost.mockResolvedValueOnce({ data: pref });
    await expect(createPreference(payload)).resolves.toEqual(pref);
    expect(mockPost).toHaveBeenCalledWith('/recommendation_preferences/', payload);
  });

  it('envía max_distance_km cuando se indica', async () => {
    const payload = { workplace_id: 7, budget: 1, preferred_transportation: 'walking', max_distance_km: 3 };
    mockPost.mockResolvedValueOnce({ data: pref });
    await createPreference(payload);
    expect(mockPost.mock.calls[0][1]).toEqual(payload);
  });

  it('propaga el error del servidor', async () => {
    mockPost.mockRejectedValueOnce(new Error('400'));
    await expect(
      createPreference({ workplace_id: 1, budget: 1, preferred_transportation: 'x' }),
    ).rejects.toThrow('400');
  });
});

describe('fetchPreferences', () => {
  it('filtra por workplace_id cuando se indica', async () => {
    mockGet.mockResolvedValueOnce({ data: [pref] });
    await expect(fetchPreferences(7)).resolves.toEqual([pref]);
    expect(mockGet).toHaveBeenCalledWith('/recommendation_preferences/', {
      params: { workplace_id: 7 },
    });
  });

  it('no envía params cuando no se indica workplace', async () => {
    mockGet.mockResolvedValueOnce({ data: [pref] });
    await fetchPreferences();
    expect(mockGet).toHaveBeenCalledWith('/recommendation_preferences/', {
      params: undefined,
    });
  });

  it('devuelve lista vacía si no hay preferencias', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await expect(fetchPreferences()).resolves.toEqual([]);
  });

  it('propaga el error de red', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    await expect(fetchPreferences(1)).rejects.toThrow('Network Error');
  });
});

describe('updatePreference', () => {
  it('hace PATCH a /recommendation_preferences/{id} con los cambios', async () => {
    const updated = { ...pref, budget: 3000 };
    mockPatch.mockResolvedValueOnce({ data: updated });
    await expect(updatePreference(3, { budget: 3000 })).resolves.toEqual(updated);
    expect(mockPatch).toHaveBeenCalledWith('/recommendation_preferences/3', { budget: 3000 });
  });

  it('propaga el error del servidor', async () => {
    mockPatch.mockRejectedValueOnce(new Error('404'));
    await expect(updatePreference(9, {})).rejects.toThrow('404');
  });
});
