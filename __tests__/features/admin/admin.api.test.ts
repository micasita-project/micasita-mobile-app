jest.mock('@/shared/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

import { apiClient } from '@/shared/api';

import {
  getPendingProperties,
  updatePropertyStatus,
  deleteProperty,
  getAllUsers,
  updateUserStatus,
} from '@/features/admin/api/admin.api';

const mockGet = apiClient.get as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;
const mockDelete = apiClient.delete as jest.Mock;

function rawProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    publisher_id: 5,
    status: 'pending',
    title: 'Depto',
    property_type: 'Departamento',
    district: 'Miraflores',
    address: 'Av. Larco 1',
    latitude: -12.1,
    longitude: -77.0,
    currency: 'USD',
    price: 900,
    total_area_sqm: 60,
    covered_area_sqm: 55,
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    antiquity: 3,
    description: 'Lindo',
    images: ['a.jpg'],
    features: ['wifi'],
    source_url: 'http://x',
    phone: '987654321',
    ...overrides,
  };
}

describe('getPendingProperties', () => {
  it('pide /admin/properties/pending con skip=0 y limit=100 por defecto', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await getPendingProperties();
    expect(mockGet).toHaveBeenCalledWith('/admin/properties/pending', {
      params: { skip: 0, limit: 100 },
    });
  });

  it('usa skip y limit personalizados', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await getPendingProperties(20, 10);
    expect(mockGet.mock.calls[0][1]).toEqual({ params: { skip: 20, limit: 10 } });
  });

  it('convierte cada propiedad a Housing con id string, status y publisher_id', async () => {
    mockGet.mockResolvedValueOnce({ data: [rawProperty()] });
    const [item] = await getPendingProperties();
    expect(item).toEqual({
      id: '42',
      title: 'Depto',
      property_type: 'Departamento',
      address: 'Av. Larco 1',
      district: 'Miraflores',
      latitude: -12.1,
      longitude: -77.0,
      currency: 'USD',
      price: 900,
      total_area_sqm: 60,
      covered_area_sqm: 55,
      bedrooms: 2,
      bathrooms: 1,
      parking: 1,
      antiquity: 3,
      description: 'Lindo',
      images: ['a.jpg'],
      features: ['wifi'],
      source_url: 'http://x',
      phone: '987654321',
      status: 'pending',
      publisher_id: 5,
    });
  });

  it('aplica valores por defecto cuando los campos opcionales son null', async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        rawProperty({
          currency: null,
          price: null,
          covered_area_sqm: null,
          bedrooms: null,
          bathrooms: null,
          parking: null,
          antiquity: null,
          description: null,
          images: null,
          features: null,
          source_url: null,
          phone: null,
        }),
      ],
    });
    const [item] = await getPendingProperties();
    expect(item.currency).toBe('PEN');
    expect(item.price).toBe(0);
    expect(item.bedrooms).toBe(0);
    expect(item.bathrooms).toBe(0);
    expect(item.description).toBe('');
    expect(item.images).toEqual([]);
    expect(item.features).toEqual([]);
    expect(item.covered_area_sqm).toBeUndefined();
    expect(item.parking).toBeUndefined();
    expect(item.antiquity).toBeUndefined();
    expect(item.source_url).toBeUndefined();
    expect(item.phone).toBeUndefined();
  });

  it('conserva los ceros en parking y antiquity (no los vuelve undefined)', async () => {
    mockGet.mockResolvedValueOnce({ data: [rawProperty({ parking: 0, antiquity: 0, covered_area_sqm: 0 })] });
    const [item] = await getPendingProperties();
    expect(item.parking).toBe(0);
    expect(item.antiquity).toBe(0);
    expect(item.covered_area_sqm).toBe(0);
  });

  it('devuelve lista vacía sin propiedades', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await expect(getPendingProperties()).resolves.toEqual([]);
  });

  it('propaga el error de red', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    await expect(getPendingProperties()).rejects.toThrow('Network Error');
  });
});

describe('updatePropertyStatus', () => {
  it('aprueba sin enviar rejection_reason', async () => {
    mockPatch.mockResolvedValueOnce({ data: rawProperty({ status: 'approved' }) });
    const result = await updatePropertyStatus('42', 'approved');
    expect(mockPatch).toHaveBeenCalledWith('/admin/properties/42/status', { status: 'approved' });
    expect(mockPatch.mock.calls[0][1]).not.toHaveProperty('rejection_reason');
    expect(result.id).toBe('42');
  });

  it('rechaza enviando rejection_reason', async () => {
    mockPatch.mockResolvedValueOnce({ data: rawProperty({ status: 'rejected' }) });
    await updatePropertyStatus('42', 'rejected', 'Fotos borrosas');
    expect(mockPatch).toHaveBeenCalledWith('/admin/properties/42/status', {
      status: 'rejected',
      rejection_reason: 'Fotos borrosas',
    });
  });

  it('omite rejection_reason cuando es cadena vacía', async () => {
    mockPatch.mockResolvedValueOnce({ data: rawProperty() });
    await updatePropertyStatus('42', 'rejected', '');
    expect(mockPatch.mock.calls[0][1]).toEqual({ status: 'rejected' });
  });

  it('propaga el error del servidor', async () => {
    mockPatch.mockRejectedValueOnce(new Error('403'));
    await expect(updatePropertyStatus('1', 'approved')).rejects.toThrow('403');
  });
});

describe('deleteProperty (admin)', () => {
  it('hace DELETE a /properties/{id}', async () => {
    mockDelete.mockResolvedValueOnce({});
    await expect(deleteProperty('42')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalledWith('/properties/42');
  });

  it('propaga el error del servidor', async () => {
    mockDelete.mockRejectedValueOnce(new Error('404'));
    await expect(deleteProperty('1')).rejects.toThrow('404');
  });
});

describe('getAllUsers', () => {
  const users = [{ id: 1, email: 'a@a.com', role: 'user', is_active: true }];

  it('usa skip=0 y limit=7 por defecto y no envía search', async () => {
    mockGet.mockResolvedValueOnce({ data: users });
    await expect(getAllUsers()).resolves.toEqual(users);
    expect(mockGet).toHaveBeenCalledWith('/admin/users', { params: { skip: 0, limit: 7 } });
  });

  it('envía search recortado', async () => {
    mockGet.mockResolvedValueOnce({ data: users });
    await getAllUsers(7, 7, '  ana  ');
    expect(mockGet).toHaveBeenCalledWith('/admin/users', {
      params: { skip: 7, limit: 7, search: 'ana' },
    });
  });

  it('omite search cuando solo tiene espacios o está vacío', async () => {
    mockGet.mockResolvedValue({ data: [] });
    await getAllUsers(0, 7, '   ');
    await getAllUsers(0, 7, '');
    expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('search');
    expect(mockGet.mock.calls[1][1].params).not.toHaveProperty('search');
  });

  it('propaga el error del servidor', async () => {
    mockGet.mockRejectedValueOnce(new Error('500'));
    await expect(getAllUsers()).rejects.toThrow('500');
  });
});

describe('updateUserStatus', () => {
  it('hace PATCH a /admin/users/{id}/status con is_active', async () => {
    const user = { id: 3, email: 'x@x.com', role: 'user', is_active: false };
    mockPatch.mockResolvedValueOnce({ data: user });
    await expect(updateUserStatus(3, false)).resolves.toEqual(user);
    expect(mockPatch).toHaveBeenCalledWith('/admin/users/3/status', { is_active: false });
  });

  it('propaga el error del servidor', async () => {
    mockPatch.mockRejectedValueOnce(new Error('403'));
    await expect(updateUserStatus(1, true)).rejects.toThrow('403');
  });
});
