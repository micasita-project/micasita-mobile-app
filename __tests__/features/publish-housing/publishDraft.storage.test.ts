jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isDraftEmpty,
  savePublishDraft,
  getPublishDraft,
  clearPublishDraft,
} from '@/features/publish-housing/model/publishDraft.storage';
import type { HousingDraft } from '@/shared/types';

const mockGet = AsyncStorage.getItem as jest.Mock;
const mockSet = AsyncStorage.setItem as jest.Mock;
const mockRemove = AsyncStorage.removeItem as jest.Mock;

function emptyDraft(overrides: Partial<HousingDraft> = {}): HousingDraft {
  return {
    address: '',
    district: '',
    latitude: 0,
    longitude: 0,
    title: '',
    property_type: '',
    currency: 'PEN',
    price: 0,
    total_area_sqm: 0,
    covered_area_sqm: 0,
    bedrooms: 0,
    bathrooms: 0,
    parking: 0,
    antiquity: 0,
    description: '',
    phone: '',
    localImageUris: [],
    features: [],
    ...overrides,
  };
}

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

describe('isDraftEmpty', () => {
  it('es true para un borrador sin datos', () => {
    expect(isDraftEmpty(emptyDraft())).toBe(true);
  });

  it('trata los espacios en blanco como vacío', () => {
    expect(isDraftEmpty(emptyDraft({ address: '  ', title: ' ', description: '\n' }))).toBe(true);
  });

  it.each([
    ['address', { address: 'Av. 1' }],
    ['title', { title: 'Depto' }],
    ['price', { price: 100 }],
    ['localImageUris', { localImageUris: ['file:///a.jpg'] }],
    ['description', { description: 'algo' }],
  ] as const)('es false si %s tiene contenido', (_name, override) => {
    expect(isDraftEmpty(emptyDraft(override))).toBe(false);
  });

  it('ignora campos como distrito, teléfono o amenidades', () => {
    expect(isDraftEmpty(emptyDraft({ district: 'Surco', phone: '987654321', features: ['wifi'], bedrooms: 3 }))).toBe(true);
  });
});

describe('savePublishDraft', () => {
  it('guarda el borrador serializado bajo la clave publish_draft', async () => {
    const draft = emptyDraft({ title: 'Depto' });
    await savePublishDraft(draft);
    expect(mockSet).toHaveBeenCalledWith('publish_draft', JSON.stringify(draft));
  });

  it('no guarda un borrador vacío', async () => {
    await savePublishDraft(emptyDraft());
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('registra el error y no lo propaga si AsyncStorage falla', async () => {
    mockSet.mockRejectedValueOnce(new Error('full'));
    await expect(savePublishDraft(emptyDraft({ title: 'x' }))).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('getPublishDraft', () => {
  it('devuelve el borrador deserializado', async () => {
    const draft = emptyDraft({ title: 'Depto', price: 10 });
    mockGet.mockResolvedValueOnce(JSON.stringify(draft));
    await expect(getPublishDraft()).resolves.toEqual(draft);
    expect(mockGet).toHaveBeenCalledWith('publish_draft');
  });

  it('devuelve null si no hay borrador', async () => {
    mockGet.mockResolvedValueOnce(null);
    await expect(getPublishDraft()).resolves.toBeNull();
  });

  it('devuelve null si el JSON está corrupto', async () => {
    mockGet.mockResolvedValueOnce('{no-json');
    await expect(getPublishDraft()).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('devuelve null si AsyncStorage falla', async () => {
    mockGet.mockRejectedValueOnce(new Error('io'));
    await expect(getPublishDraft()).resolves.toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('clearPublishDraft', () => {
  it('elimina la clave publish_draft', async () => {
    await clearPublishDraft();
    expect(mockRemove).toHaveBeenCalledWith('publish_draft');
  });

  it('no propaga el error si AsyncStorage falla', async () => {
    mockRemove.mockRejectedValueOnce(new Error('io'));
    await expect(clearPublishDraft()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});
