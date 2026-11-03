jest.mock('@/entities/housing/api/housing.api', () => ({
  createProperty: jest.fn(),
  updateProperty: jest.fn(),
  uploadPropertyImage: jest.fn(),
  fetchMyProperties: jest.fn(),
}));

import {
  createProperty,
  updateProperty,
  uploadPropertyImage,
  fetchMyProperties,
} from '@/entities/housing/api/housing.api';
import {
  submitHousingListing,
  updateHousingListing,
  getMyListings,
} from '@/features/publish-housing/model/publishHousing.service';
import type { HousingDraft } from '@/shared/types';

const mockCreate = createProperty as jest.Mock;
const mockUpdate = updateProperty as jest.Mock;
const mockUpload = uploadPropertyImage as jest.Mock;
const mockFetchMine = fetchMyProperties as jest.Mock;

function makeDraft(overrides: Partial<HousingDraft> = {}): HousingDraft {
  return {
    address: 'Av. Larco 123',
    district: 'Miraflores',
    latitude: -12.12,
    longitude: -77.03,
    title: 'Depto luminoso',
    property_type: 'Departamento',
    currency: 'PEN',
    price: 1800,
    total_area_sqm: 80,
    covered_area_sqm: 70,
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    antiquity: 5,
    description: 'Descripción',
    phone: '987654321',
    localImageUris: [],
    features: ['wifi', 'gym'],
    ...overrides,
  };
}

function makeHousing(overrides: Record<string, unknown> = {}) {
  return {
    id: '99',
    title: 'Depto luminoso',
    property_type: 'Departamento',
    address: 'Av. Larco 123',
    district: 'Miraflores',
    latitude: -12.12,
    longitude: -77.03,
    currency: 'PEN',
    price: 1800,
    total_area_sqm: 80,
    covered_area_sqm: 70,
    bedrooms: 2,
    bathrooms: 1,
    parking: 1,
    antiquity: 5,
    description: 'Descripción',
    images: ['https://cdn/1.jpg'],
    features: ['wifi'],
    ...overrides,
  };
}

let warnSpy: jest.SpyInstance;
beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => warnSpy.mockRestore());

describe('submitHousingListing', () => {
  it('sube cada imagen local y manda las URLs al crear la propiedad', async () => {
    mockUpload.mockResolvedValueOnce('https://cdn/1.jpg').mockResolvedValueOnce('https://cdn/2.jpg');
    mockCreate.mockResolvedValueOnce(makeHousing());

    await submitHousingListing(makeDraft({ localImageUris: ['file:///a.jpg', 'file:///b.jpg'] }), 'u1', 'u@x.com');

    expect(mockUpload).toHaveBeenNthCalledWith(1, 'file:///a.jpg');
    expect(mockUpload).toHaveBeenNthCalledWith(2, 'file:///b.jpg');
    expect(mockCreate.mock.calls[0][0].images).toEqual(['https://cdn/1.jpg', 'https://cdn/2.jpg']);
  });

  it('envía los datos del borrador en el request', async () => {
    mockCreate.mockResolvedValueOnce(makeHousing());
    await submitHousingListing(makeDraft(), 'u1', 'u@x.com');

    expect(mockCreate).toHaveBeenCalledWith({
      title: 'Depto luminoso',
      property_type: 'Departamento',
      district: 'Miraflores',
      address: 'Av. Larco 123',
      latitude: -12.12,
      longitude: -77.03,
      currency: 'PEN',
      price: 1800,
      total_area_sqm: 80,
      covered_area_sqm: 70,
      bedrooms: 2,
      bathrooms: 1,
      parking: 1,
      antiquity: 5,
      description: 'Descripción',
      images: [],
      features: ['wifi', 'gym'],
      phone: '987654321',
    });
  });

  it('omite las imágenes que fallan al subir y continúa con las demás', async () => {
    mockUpload
      .mockResolvedValueOnce('https://cdn/1.jpg')
      .mockRejectedValueOnce(new Error('upload failed'))
      .mockResolvedValueOnce('https://cdn/3.jpg');
    mockCreate.mockResolvedValueOnce(makeHousing());

    await submitHousingListing(makeDraft({ localImageUris: ['a', 'b', 'c'] }), 'u1', 'u@x.com');

    expect(mockCreate.mock.calls[0][0].images).toEqual(['https://cdn/1.jpg', 'https://cdn/3.jpg']);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('publica sin imágenes si todas fallan', async () => {
    mockUpload.mockRejectedValue(new Error('down'));
    mockCreate.mockResolvedValueOnce(makeHousing());

    await submitHousingListing(makeDraft({ localImageUris: ['a', 'b'] }), 'u1', 'u@x.com');

    expect(mockCreate.mock.calls[0][0].images).toEqual([]);
  });

  it('no llama a uploadPropertyImage sin imágenes locales', async () => {
    mockCreate.mockResolvedValueOnce(makeHousing());
    await submitHousingListing(makeDraft(), 'u1', 'u@x.com');
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('recorta el teléfono', async () => {
    mockCreate.mockResolvedValueOnce(makeHousing());
    await submitHousingListing(makeDraft({ phone: '  987654321  ' }), 'u1', 'u@x.com');
    expect(mockCreate.mock.calls[0][0].phone).toBe('987654321');
  });

  it.each(['', '   '])('envía phone undefined si el teléfono es %p', async (phone) => {
    mockCreate.mockResolvedValueOnce(makeHousing());
    await submitHousingListing(makeDraft({ phone }), 'u1', 'u@x.com');
    expect(mockCreate.mock.calls[0][0].phone).toBeUndefined();
  });

  it('devuelve PublishedHousing con estado pending, usuario y datos creados', async () => {
    mockCreate.mockResolvedValueOnce(makeHousing({ id: '99', images: ['https://cdn/z.jpg'] }));

    const result = await submitHousingListing(makeDraft(), 'user-7', 'seven@x.com');

    expect(result).toMatchObject({
      id: '99',
      userId: 'user-7',
      userEmail: 'seven@x.com',
      status: 'pending',
      title: 'Depto luminoso',
      images: ['https://cdn/z.jpg'],
      price: 1800,
    });
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
    expect(new Date(result.updatedAt).toISOString()).toBe(result.updatedAt);
  });

  it('propaga el error si createProperty falla', async () => {
    mockCreate.mockRejectedValueOnce(new Error('422'));
    await expect(submitHousingListing(makeDraft(), 'u', 'e')).rejects.toThrow('422');
  });
});

describe('updateHousingListing', () => {
  it('reutiliza las URLs http(s) y solo sube las locales, respetando el orden', async () => {
    mockUpload.mockResolvedValueOnce('https://cdn/new.jpg');
    mockUpdate.mockResolvedValueOnce(makeHousing());

    await updateHousingListing(
      '99',
      makeDraft({ localImageUris: ['https://cdn/old.jpg', 'file:///new.jpg', 'http://cdn/old2.jpg'] }),
    );

    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith('file:///new.jpg');
    expect(mockUpdate.mock.calls[0][1].images).toEqual([
      'https://cdn/old.jpg',
      'https://cdn/new.jpg',
      'http://cdn/old2.jpg',
    ]);
  });

  it('convierte el id a número al actualizar', async () => {
    mockUpdate.mockResolvedValueOnce(makeHousing());
    await updateHousingListing('99', makeDraft());
    expect(mockUpdate.mock.calls[0][0]).toBe(99);
  });

  it('omite las imágenes nuevas que fallan al subir', async () => {
    mockUpload.mockRejectedValueOnce(new Error('x'));
    mockUpdate.mockResolvedValueOnce(makeHousing());

    await updateHousingListing('1', makeDraft({ localImageUris: ['https://cdn/a.jpg', 'file:///b.jpg'] }));

    expect(mockUpdate.mock.calls[0][1].images).toEqual(['https://cdn/a.jpg']);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('envía los datos del borrador y recorta el teléfono', async () => {
    mockUpdate.mockResolvedValueOnce(makeHousing());
    await updateHousingListing('5', makeDraft({ phone: ' 912345678 ' }));

    expect(mockUpdate).toHaveBeenCalledWith(5, expect.objectContaining({
      title: 'Depto luminoso',
      price: 1800,
      features: ['wifi', 'gym'],
      phone: '912345678',
    }));
  });

  it('envía phone undefined si el teléfono está en blanco', async () => {
    mockUpdate.mockResolvedValueOnce(makeHousing());
    await updateHousingListing('5', makeDraft({ phone: '  ' }));
    expect(mockUpdate.mock.calls[0][1].phone).toBeUndefined();
  });

  it('devuelve el anuncio en estado pending con userId vacío', async () => {
    mockUpdate.mockResolvedValueOnce(makeHousing({ features: ['wifi'] }));
    const result = await updateHousingListing('99', makeDraft());
    expect(result).toMatchObject({
      id: '99',
      userId: '',
      userEmail: '',
      status: 'pending',
      features: ['wifi'],
    });
  });

  it('usa features [] si la respuesta no las trae', async () => {
    mockUpdate.mockResolvedValueOnce(makeHousing({ features: undefined }));
    const result = await updateHousingListing('99', makeDraft());
    expect(result.features).toEqual([]);
  });

  it('propaga el error si updateProperty falla', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('403'));
    await expect(updateHousingListing('1', makeDraft())).rejects.toThrow('403');
  });
});

// Omitido: getMyListings usa import() dinámico, que jest-expo no transforma a require.
describe('getMyListings', () => {
  function raw(overrides: Record<string, unknown> = {}) {
    return {
      id: 12,
      status: 'approved',
      title: 'T',
      property_type: 'Casa',
      address: 'Calle 1',
      district: 'Surco',
      latitude: 1,
      longitude: 2,
      currency: 'USD',
      price: 500,
      total_area_sqm: 40,
      covered_area_sqm: 30,
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      antiquity: 4,
      description: 'D',
      images: ['i.jpg'],
      features: ['f'],
      rejection_reason: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('mapea las propiedades propias a PublishedHousing', async () => {
    mockFetchMine.mockResolvedValueOnce([raw()]);
    const [item] = await getMyListings('u1');
    expect(item).toEqual({
      id: '12',
      userId: 'u1',
      userEmail: '',
      status: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
      address: 'Calle 1',
      district: 'Surco',
      latitude: 1,
      longitude: 2,
      title: 'T',
      property_type: 'Casa',
      currency: 'USD',
      price: 500,
      total_area_sqm: 40,
      covered_area_sqm: 30,
      bedrooms: 3,
      bathrooms: 2,
      parking: 1,
      antiquity: 4,
      description: 'D',
      images: ['i.jpg'],
      features: ['f'],
      rejectionReason: null,
    });
  });

  it.each(['pending', 'approved', 'rejected'])('conserva el estado válido %s', async (status) => {
    mockFetchMine.mockResolvedValueOnce([raw({ status })]);
    const [item] = await getMyListings('u');
    expect(item.status).toBe(status);
  });

  it.each(['draft', 'APPROVED', ''])('normaliza el estado desconocido %p a pending', async (status) => {
    mockFetchMine.mockResolvedValueOnce([raw({ status })]);
    const [item] = await getMyListings('u');
    expect(item.status).toBe('pending');
  });

  it('incluye el motivo de rechazo', async () => {
    mockFetchMine.mockResolvedValueOnce([raw({ status: 'rejected', rejection_reason: 'Fotos malas' })]);
    const [item] = await getMyListings('u');
    expect(item.rejectionReason).toBe('Fotos malas');
  });

  it('usa valores por defecto para campos nulos o ausentes', async () => {
    mockFetchMine.mockResolvedValueOnce([
      raw({
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
        rejection_reason: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      }),
    ]);
    const [item] = await getMyListings('u');
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
    expect(item.rejectionReason).toBeNull();
    expect(Number.isNaN(Date.parse(item.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(item.updatedAt))).toBe(false);
  });

  it('devuelve [] cuando no hay publicaciones', async () => {
    mockFetchMine.mockResolvedValueOnce([]);
    await expect(getMyListings('u')).resolves.toEqual([]);
  });

  it('propaga el error de red', async () => {
    mockFetchMine.mockRejectedValueOnce(new Error('Network Error'));
    await expect(getMyListings('u')).rejects.toThrow('Network Error');
  });
});
