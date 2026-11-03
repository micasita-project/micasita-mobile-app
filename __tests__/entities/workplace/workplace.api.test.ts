jest.mock('@/shared/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { apiClient } from '@/shared/api';

import {
  fetchWorkplaces,
  createWorkplace,
  deleteWorkplace,
  updateWorkplace,
} from '@/entities/workplace/api/workplace.api';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

const workplace = {
  id: 7,
  user_id: 1,
  work_address: 'Av. Javier Prado 1000',
  work_lat: -12.09,
  work_lon: -77.02,
};

describe('fetchWorkplaces', () => {
  it('hace GET a /workplaces/ y devuelve la lista', async () => {
    mockGet.mockResolvedValueOnce({ data: [workplace] });
    await expect(fetchWorkplaces()).resolves.toEqual([workplace]);
    expect(mockGet).toHaveBeenCalledWith('/workplaces/');
  });

  it('devuelve lista vacía cuando no hay lugares', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await expect(fetchWorkplaces()).resolves.toEqual([]);
  });

  it('propaga el error de red', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    await expect(fetchWorkplaces()).rejects.toThrow('Network Error');
  });
});

describe('createWorkplace', () => {
  const payload = { work_address: workplace.work_address, work_lat: -12.09, work_lon: -77.02 };

  it('hace POST a /workplaces/ con los datos y devuelve el creado', async () => {
    mockPost.mockResolvedValueOnce({ data: workplace });
    await expect(createWorkplace(payload)).resolves.toEqual(workplace);
    expect(mockPost).toHaveBeenCalledWith('/workplaces/', payload);
  });

  it('propaga el error de validación del servidor', async () => {
    mockPost.mockRejectedValueOnce(new Error('422'));
    await expect(createWorkplace(payload)).rejects.toThrow('422');
  });
});

describe('deleteWorkplace', () => {
  it('hace DELETE a /workplaces/{id} y no devuelve nada', async () => {
    mockDelete.mockResolvedValueOnce({ data: { detail: 'ok' } });
    await expect(deleteWorkplace(7)).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/workplaces/7');
  });

  it('propaga el error del servidor', async () => {
    mockDelete.mockRejectedValueOnce(new Error('404'));
    await expect(deleteWorkplace(99)).rejects.toThrow('404');
  });
});

describe('updateWorkplace', () => {
  it('hace PATCH a /workplaces/{id} con los datos parciales', async () => {
    const updated = { ...workplace, work_address: 'Nueva' };
    mockPatch.mockResolvedValueOnce({ data: updated });
    await expect(updateWorkplace(7, { work_address: 'Nueva' })).resolves.toEqual(updated);
    expect(mockPatch).toHaveBeenCalledWith('/workplaces/7', { work_address: 'Nueva' });
  });

  it('propaga el error del servidor', async () => {
    mockPatch.mockRejectedValueOnce(new Error('403'));
    await expect(updateWorkplace(7, {})).rejects.toThrow('403');
  });
});
