import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import FavoritesScreen from '@/app/favorites';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';
import { makeHousing } from '@/__tests__/_helpers/app/housingCard';

const mockUseQuery = jest.fn();
const mockSetQueryData = jest.fn();
const mockMutate = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: (opts: any) => mockUseQuery(opts),
  useQueryClient: () => ({ setQueryData: mockSetQueryData }),
}));
jest.mock('@/entities/housing/api/housing.api', () => ({ fetchMyFavorites: jest.fn() }));
jest.mock('@/entities/housing/model/useProperties', () => ({
  useToggleFavorite: () => ({ mutate: mockMutate }),
  propertyKeys: {},
}));
jest.mock('@/entities/housing', () => require('@/__tests__/_helpers/app/housingCard').housingEntityModule);

const a = makeHousing({ id: 'a', title: 'Casa A', isFavorite: true });
const b = makeHousing({ id: 'b', title: 'Casa B', isFavorite: true });

beforeEach(() => {
  resetRouter();
  mockUseQuery.mockReturnValue({ data: [a, b], isLoading: false, isError: false, refetch: jest.fn() });
});

describe('FavoritesScreen', () => {
  it('mientras carga no muestra el encabezado ni la lista', async () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    await render(<FavoritesScreen />);
    expect(screen.queryByText('Mis Favoritos')).toBeNull();
  });

  it('consulta los favoritos con la clave "favorites"', async () => {
    await render(<FavoritesScreen />);
    expect(mockUseQuery.mock.calls[0][0].queryKey).toEqual(['favorites']);
  });

  it('muestra el conteo en plural y las tarjetas', async () => {
    await render(<FavoritesScreen />);
    expect(screen.getByText('2 propiedades')).toBeTruthy();
    expect(screen.getByText('Casa A')).toBeTruthy();
    expect(screen.getByText('Casa B')).toBeTruthy();
  });

  it('con un solo favorito el conteo va en singular', async () => {
    mockUseQuery.mockReturnValue({ data: [a], isLoading: false });
    await render(<FavoritesScreen />);
    expect(screen.getByText('1 propiedad')).toBeTruthy();
  });

  it('sin favoritos muestra el estado vacío y lleva a explorar viviendas', async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    await render(<FavoritesScreen />);
    expect(screen.getByText('Aún no tienes favoritos')).toBeTruthy();
    expect(screen.getByText('0 propiedades')).toBeTruthy();
    await fireEvent.press(screen.getByText('Explorar viviendas'));
    expect(router.push).toHaveBeenCalledWith('/(tabs)/housing');
  });

  it('pulsar una tarjeta abre el detalle con id y datos serializados', async () => {
    await render(<FavoritesScreen />);
    await fireEvent.press(screen.getByTestId('card-a'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/housing-detail',
      params: { id: 'a', data: JSON.stringify(a) },
    });
  });

  it('quitar un favorito lo elimina de la caché al instante y llama a la mutación', async () => {
    await render(<FavoritesScreen />);
    await fireEvent.press(screen.getByTestId('fav-a'));
    expect(mockSetQueryData).toHaveBeenCalledTimes(1);
    const [key, updater] = mockSetQueryData.mock.calls[0];
    expect(key).toEqual(['favorites']);
    expect(updater([a, b]).map((h: any) => h.id)).toEqual(['b']);
    expect(updater(undefined)).toBeUndefined();
    expect(mockMutate).toHaveBeenCalledWith({ id: 'a', isFavorite: false });
  });

  it('marcar como favorito (isFavorite=true) no toca la caché local', async () => {
    const off = makeHousing({ id: 'a', title: 'Casa A', isFavorite: false });
    mockUseQuery.mockReturnValue({ data: [off, b], isLoading: false });
    await render(<FavoritesScreen />);
    await fireEvent.press(screen.getByTestId('fav-a'));
    expect(mockSetQueryData).not.toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalledWith({ id: 'a', isFavorite: true });
  });

  it('el botón de retroceso vuelve atrás', async () => {
    await render(<FavoritesScreen />);
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
