jest.mock('@/entities/housing/api/housing.api', () => ({
  fetchAllProperties: jest.fn(),
  createProperty: jest.fn(),
  deleteProperty: jest.fn(),
  uploadPropertyImage: jest.fn(),
  addToFavorites: jest.fn(),
  removeFromFavorites: jest.fn(),
}));

import { act } from 'react-test-renderer';
import * as api from '@/entities/housing/api/housing.api';
import {
  propertyKeys,
  useProperties,
  useCreateProperty,
  useDeleteProperty,
  useUploadPropertyImage,
  useToggleFavorite,
} from '@/entities/housing/model/useProperties';
import {
  mountHook,
  waitUntil,
  flush,
  createTestQueryClient,
  makeQueryWrapper,
} from '../../_helpers/state/mountHook';

const mocked = api as jest.Mocked<typeof api>;

const page = (n: number, total: number, start = 0) => ({
  items: Array.from({ length: n }, (_, i) => ({ id: start + i })),
  total,
});

let client: ReturnType<typeof createTestQueryClient>;
beforeEach(() => {
  client = createTestQueryClient();
});

const setup = <T,>(hook: () => T) => mountHook(hook, makeQueryWrapper(client));

describe('propertyKeys', () => {
  it('incluye los filtros en la clave de lista', () => {
    expect(propertyKeys.all).toEqual(['properties']);
    expect(propertyKeys.list({ district: 'Miraflores' } as any)).toEqual([
      'properties',
      'list',
      { district: 'Miraflores' },
    ]);
  });
});

describe('useProperties', () => {
  it('carga la primera página con skip 0, límite 10 y los filtros', async () => {
    mocked.fetchAllProperties.mockResolvedValue(page(10, 25) as any);
    const filters = { district: 'Surco' } as any;
    const { result } = setup(() => useProperties(filters));
    await waitUntil(() => result.current.isSuccess);
    expect(mocked.fetchAllProperties).toHaveBeenCalledWith(0, 10, filters);
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('usa filtros vacíos por defecto', async () => {
    mocked.fetchAllProperties.mockResolvedValue(page(1, 1) as any);
    const { result } = setup(() => useProperties());
    await waitUntil(() => result.current.isSuccess);
    expect(mocked.fetchAllProperties).toHaveBeenCalledWith(0, 10, {});
  });

  it('pide la siguiente página con skip igual a los ítems ya cargados', async () => {
    mocked.fetchAllProperties
      .mockResolvedValueOnce(page(10, 25) as any)
      .mockResolvedValueOnce(page(10, 25, 10) as any)
      .mockResolvedValueOnce(page(5, 25, 20) as any);
    const { result } = setup(() => useProperties());
    await waitUntil(() => result.current.isSuccess);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await flush();
    expect(mocked.fetchAllProperties).toHaveBeenLastCalledWith(10, 10, {});
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await flush();
    expect(mocked.fetchAllProperties).toHaveBeenLastCalledWith(20, 10, {});
    expect(result.current.data?.pages).toHaveLength(3);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('no hay siguiente página cuando lo cargado alcanza el total', async () => {
    mocked.fetchAllProperties.mockResolvedValue(page(10, 10) as any);
    const { result } = setup(() => useProperties());
    await waitUntil(() => result.current.isSuccess);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('lista vacía: sin siguiente página', async () => {
    mocked.fetchAllProperties.mockResolvedValue(page(0, 0) as any);
    const { result } = setup(() => useProperties());
    await waitUntil(() => result.current.isSuccess);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('expone el error cuando falla la petición', async () => {
    mocked.fetchAllProperties.mockRejectedValue(new Error('boom'));
    const { result } = setup(() => useProperties());
    await waitUntil(() => result.current.isError);
    expect((result.current.error as Error).message).toBe('boom');
  });
});

describe('useCreateProperty', () => {
  it('crea y al terminar invalida la cache de propiedades', async () => {
    mocked.createProperty.mockResolvedValue({ id: 1 } as any);
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useCreateProperty());
    const data = { title: 'x' } as any;
    await act(async () => {
      await result.current.mutateAsync(data);
    });
    expect(mocked.createProperty).toHaveBeenCalledWith(data);
    expect(spy).toHaveBeenCalledWith({ queryKey: propertyKeys.all });
  });

  it('si falla no invalida la cache', async () => {
    mocked.createProperty.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useCreateProperty());
    await act(async () => {
      await result.current.mutateAsync({} as any).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useDeleteProperty', () => {
  it('elimina por id e invalida la cache', async () => {
    mocked.deleteProperty.mockResolvedValue(undefined);
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useDeleteProperty());
    await act(async () => {
      await result.current.mutateAsync(5);
    });
    expect(mocked.deleteProperty).toHaveBeenCalledWith(5);
    expect(spy).toHaveBeenCalledWith({ queryKey: propertyKeys.all });
  });

  it('si falla no invalida la cache', async () => {
    mocked.deleteProperty.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useDeleteProperty());
    await act(async () => {
      await result.current.mutateAsync(5).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useUploadPropertyImage', () => {
  it('devuelve la URL pública subida', async () => {
    mocked.uploadPropertyImage.mockResolvedValue('https://cdn/img.jpg');
    const { result } = setup(() => useUploadPropertyImage());
    let url: string | undefined;
    await act(async () => {
      url = await result.current.mutateAsync('file:///a.jpg');
    });
    expect(mocked.uploadPropertyImage).toHaveBeenCalledWith('file:///a.jpg');
    expect(url).toBe('https://cdn/img.jpg');
  });
});

describe('useToggleFavorite', () => {
  it('con isFavorite true añade a favoritos', async () => {
    mocked.addToFavorites.mockResolvedValue(undefined);
    const { result } = setup(() => useToggleFavorite());
    await act(async () => {
      await result.current.mutateAsync({ id: '9', isFavorite: true });
    });
    expect(mocked.addToFavorites).toHaveBeenCalledWith('9');
    expect(mocked.removeFromFavorites).not.toHaveBeenCalled();
  });

  it('con isFavorite false quita de favoritos', async () => {
    mocked.removeFromFavorites.mockResolvedValue(undefined);
    const { result } = setup(() => useToggleFavorite());
    await act(async () => {
      await result.current.mutateAsync({ id: '9', isFavorite: false });
    });
    expect(mocked.removeFromFavorites).toHaveBeenCalledWith('9');
    expect(mocked.addToFavorites).not.toHaveBeenCalled();
  });

  it('invalida propiedades, favoritos y el detalle de la propiedad', async () => {
    mocked.addToFavorites.mockResolvedValue(undefined);
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useToggleFavorite());
    await act(async () => {
      await result.current.mutateAsync({ id: '9', isFavorite: true });
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: propertyKeys.all });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['favorites'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['property', '9'] });
  });

  it('si falla no invalida nada', async () => {
    mocked.addToFavorites.mockRejectedValue(new Error('x'));
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = setup(() => useToggleFavorite());
    await act(async () => {
      await result.current.mutateAsync({ id: '9', isFavorite: true }).catch(() => {});
    });
    expect(spy).not.toHaveBeenCalled();
  });
});
