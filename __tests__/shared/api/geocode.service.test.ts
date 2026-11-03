jest.mock('@/shared/api/apiClient', () => ({
  apiClient: { get: jest.fn() },
}));

import { apiClient } from '@/shared/api/apiClient';
import { searchAddress, reverseAddress } from '@/shared/api/geocode.service';

const mockGet = apiClient.get as jest.Mock;

const suggestion = {
  display_name: 'Av. Larco 123, Miraflores',
  latitude: -12.12,
  longitude: -77.03,
  place_type: 'road',
  district: 'Miraflores',
};

describe('searchAddress', () => {
  it('consulta /geocode/search con q y limit por defecto 5', async () => {
    mockGet.mockResolvedValueOnce({ data: [suggestion] });

    const result = await searchAddress('Larco');

    expect(mockGet).toHaveBeenCalledWith('/geocode/search', {
      params: { q: 'Larco', limit: 5 },
    });
    expect(result).toEqual([suggestion]);
  });

  it('respeta un limit personalizado', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await searchAddress('Larco', 10);
    expect(mockGet).toHaveBeenCalledWith('/geocode/search', {
      params: { q: 'Larco', limit: 10 },
    });
  });

  it('no consulta con menos de 3 caracteres y devuelve []', async () => {
    await expect(searchAddress('ab')).resolves.toEqual([]);
    await expect(searchAddress('')).resolves.toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('ignora los espacios al medir el largo mínimo', async () => {
    await expect(searchAddress('  a ')).resolves.toEqual([]);
    await expect(searchAddress('   ')).resolves.toEqual([]);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('consulta con exactamente 3 caracteres', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await searchAddress('abc');
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('envía el texto original sin recortar', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await searchAddress(' Larco ');
    expect(mockGet).toHaveBeenCalledWith('/geocode/search', {
      params: { q: ' Larco ', limit: 5 },
    });
  });

  it('propaga el error de red', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    await expect(searchAddress('Larco')).rejects.toThrow('Network Error');
  });
});

describe('reverseAddress', () => {
  it('consulta /geocode/reverse con lat y lon', async () => {
    mockGet.mockResolvedValueOnce({ data: suggestion });

    const result = await reverseAddress(-12.12, -77.03);

    expect(mockGet).toHaveBeenCalledWith('/geocode/reverse', {
      params: { lat: -12.12, lon: -77.03 },
    });
    expect(result).toEqual(suggestion);
  });

  it('acepta coordenadas en cero', async () => {
    mockGet.mockResolvedValueOnce({ data: suggestion });
    await reverseAddress(0, 0);
    expect(mockGet).toHaveBeenCalledWith('/geocode/reverse', {
      params: { lat: 0, lon: 0 },
    });
  });

  it('propaga el error del servidor', async () => {
    mockGet.mockRejectedValueOnce(new Error('404'));
    await expect(reverseAddress(1, 2)).rejects.toThrow('404');
  });
});
