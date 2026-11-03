import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import HousingScreen from '@/app/(tabs)/housing';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';
import { makeHousing } from '@/__tests__/_helpers/app/housingCard';

const mockAuth = jest.fn();
const mockUseProperties = jest.fn();
const mockMutate = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native/Libraries/Lists/FlatList', () => require('@/__tests__/_helpers/app/rnPieces').flatListModule);
jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => require('@/__tests__/_helpers/app/rnPieces').activityIndicatorModule);
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/entities/housing/model/useProperties', () => ({
  useProperties: (f: any) => mockUseProperties(f),
  useToggleFavorite: () => ({ mutate: mockMutate }),
}));
jest.mock('@/entities/housing', () => require('@/__tests__/_helpers/app/housingCard').housingEntityModule);
jest.mock('@/shared/ui/BottomSheet', () => require('@/__tests__/_helpers/app/sheets').bottomSheetModule);
jest.mock('@/shared/ui/SheetTextInput', () => require('@/__tests__/_helpers/app/sheets').sheetTextInputModule);

const h1 = makeHousing({ id: 'h1', title: 'Casa 1' });
const h2 = makeHousing({ id: 'h2', title: 'Casa 2' });

function listState(over: Record<string, any> = {}) {
  return {
    data: { pages: [{ items: [h1, h2], total: 2 }] },
    isLoading: false,
    isError: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
    ...over,
  };
}

const lastFilters = () => mockUseProperties.mock.calls[mockUseProperties.mock.calls.length - 1][0];

beforeEach(() => {
  resetRouter();
  mockAuth.mockReturnValue({ isAuthenticated: true });
  mockUseProperties.mockReturnValue(listState());
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

async function openFilters() {
  await fireEvent.press(screen.getByText('Filtros'));
}

describe('HousingScreen estados', () => {
  it('cargando muestra el mensaje y no la lista', async () => {
    mockUseProperties.mockReturnValue(listState({ isLoading: true, data: undefined }));
    await render(<HousingScreen />);
    expect(screen.getByText('Cargando viviendas...')).toBeTruthy();
    expect(screen.queryByText('Filtros')).toBeNull();
  });

  it('con error muestra el aviso y Reintentar vuelve a consultar', async () => {
    const refetch = jest.fn();
    mockUseProperties.mockReturnValue(listState({ isError: true, data: undefined, refetch }));
    await render(<HousingScreen />);
    expect(screen.getByText('No se pudo conectar al servidor')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('muestra las viviendas y el total en plural', async () => {
    await render(<HousingScreen />);
    expect(screen.getByText('Casa 1')).toBeTruthy();
    expect(screen.getByText('Casa 2')).toBeTruthy();
    expect(screen.getByText(/viviendas disponibles/)).toBeTruthy();
  });

  it('con un total de 1 usa el singular', async () => {
    mockUseProperties.mockReturnValue(listState({ data: { pages: [{ items: [h1], total: 1 }] } }));
    await render(<HousingScreen />);
    expect(screen.getByText(/vivienda disponible$/)).toBeTruthy();
  });

  it('sin resultados y sin filtros muestra el vacío sin botón de limpiar', async () => {
    mockUseProperties.mockReturnValue(listState({ data: { pages: [{ items: [], total: 0 }] } }));
    await render(<HousingScreen />);
    expect(screen.getByText('No se encontraron viviendas con estos filtros')).toBeTruthy();
    expect(screen.queryByText('Limpiar filtros')).toBeNull();
  });

  it('junta los items de todas las páginas y toma el total de la primera', async () => {
    const h3 = makeHousing({ id: 'h3', title: 'Casa 3' });
    mockUseProperties.mockReturnValue(
      listState({ data: { pages: [{ items: [h1], total: 3 }, { items: [h2, h3], total: 3 }] } }),
    );
    await render(<HousingScreen />);
    expect(screen.getByText('Casa 3')).toBeTruthy();
    expect(screen.getByText(/viviendas disponibles/)).toBeTruthy();
  });

  it('muestra el indicador de pie solo mientras carga la página siguiente', async () => {
    await render(<HousingScreen />);
    expect(screen.queryByTestId('spinner')).toBeNull();
    mockUseProperties.mockReturnValue(listState({ isFetchingNextPage: true }));
    await screen.rerender(<HousingScreen />);
    expect(screen.getByTestId('spinner')).toBeTruthy();
  });

  it('al llegar al final pide la siguiente página solo si existe', async () => {
    const fetchNextPage = jest.fn();
    mockUseProperties.mockReturnValue(listState({ fetchNextPage, hasNextPage: true }));
    await render(<HousingScreen />);
    await fireEvent.press(screen.getByTestId('end-reached'));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('al llegar al final no pide más si no hay otra página', async () => {
    const fetchNextPage = jest.fn();
    mockUseProperties.mockReturnValue(listState({ fetchNextPage, hasNextPage: false }));
    await render(<HousingScreen />);
    await fireEvent.press(screen.getByTestId('end-reached'));
    expect(fetchNextPage).not.toHaveBeenCalled();
  });
});

describe('HousingScreen acciones según sesión', () => {
  it('usuario autenticado ve "Mis publicaciones" y navega a ellas', async () => {
    await render(<HousingScreen />);
    await fireEvent.press(screen.getByText('Mis publicaciones'));
    expect(router.push).toHaveBeenCalledWith('/my-listings');
  });

  it('invitado no ve "Mis publicaciones"', async () => {
    mockAuth.mockReturnValue({ isAuthenticated: false });
    await render(<HousingScreen />);
    expect(screen.queryByText('Mis publicaciones')).toBeNull();
  });

  it('Publicar con sesión abre el asistente', async () => {
    await render(<HousingScreen />);
    await fireEvent.press(screen.getByText('Publicar'));
    expect(router.push).toHaveBeenCalledWith('/publish-housing');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('Publicar como invitado pide iniciar sesión y la acción lleva al login', async () => {
    mockAuth.mockReturnValue({ isAuthenticated: false });
    await render(<HousingScreen />);
    await fireEvent.press(screen.getByText('Publicar'));
    expect(router.push).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Inicia sesión',
      'Necesitas una cuenta para publicar una vivienda.',
      expect.any(Array),
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    buttons.find((b: any) => b.text === 'Iniciar sesión').onPress();
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('pulsar una vivienda abre el detalle con sus datos', async () => {
    await render(<HousingScreen />);
    await fireEvent.press(screen.getByTestId('card-h1'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/housing-detail',
      params: { id: 'h1', data: JSON.stringify(h1) },
    });
  });

  it('favorito con sesión llama a la mutación con el nuevo estado', async () => {
    await render(<HousingScreen />);
    await fireEvent.press(screen.getByTestId('fav-h1'));
    expect(mockMutate).toHaveBeenCalledWith({ id: 'h1', isFavorite: true });
  });

  it('favorito como invitado avisa y no muta', async () => {
    mockAuth.mockReturnValue({ isAuthenticated: false });
    await render(<HousingScreen />);
    await fireEvent.press(screen.getByTestId('fav-h1'));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Inicia sesión',
      'Debes iniciar sesión para guardar favoritos.',
      expect.any(Array),
    );
    (Alert.alert as jest.Mock).mock.calls[0][2].find((b: any) => b.text === 'Iniciar sesión').onPress();
    expect(router.push).toHaveBeenCalledWith('/login');
  });
});

describe('HousingScreen filtros', () => {
  it('empieza sin filtros aplicados y el panel cerrado', async () => {
    await render(<HousingScreen />);
    expect(lastFilters()).toEqual({});
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('Filtros abre el panel y Aplicar/Limpiar arrancan deshabilitados sin cambios', async () => {
    await render(<HousingScreen />);
    await openFilters();
    expect(screen.getByText('Filtros de búsqueda')).toBeTruthy();
    expect(screen.getByText('Aplicar filtros')).toBeDisabled();
    expect(screen.getByText('Limpiar')).toBeDisabled();
  });

  it('escribir un distrito habilita Aplicar y envía el filtro al aplicar', async () => {
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Miraflores, San Isidro...'), 'Surco');
    expect(screen.getByText('Aplicar filtros')).toBeEnabled();
    await fireEvent.press(screen.getByText('Aplicar filtros'));
    expect(lastFilters()).toEqual({ district: 'Surco' });
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('los filtros numéricos se convierten a número', async () => {
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. 50'), '55');
    await fireEvent.changeText(screen.getByPlaceholderText('0'), '500');
    await fireEvent.changeText(screen.getByPlaceholderText('Inf'), '1200');
    await fireEvent.press(screen.getByText('Aplicar filtros'));
    expect(lastFilters()).toEqual({ min_area_sqm: 55, min_price: 500, max_price: 1200 });
  });

  it.each([
    ['Ej. 50', 'área mínima'],
    ['0', 'precio mínimo'],
    ['Inf', 'precio máximo'],
  ])('un único filtro de %s (%s) basta para habilitar Aplicar', async (placeholder) => {
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.changeText(screen.getByPlaceholderText(placeholder), '10');
    expect(screen.getByText('Aplicar filtros')).toBeEnabled();
  });

  it.each([[1], [2], [3]])('un único stepper (posición %i) basta para habilitar Aplicar', async (pos) => {
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.press(screen.getAllByTestId('icon-add')[pos]);
    expect(screen.getByText('Aplicar filtros')).toBeEnabled();
  });

  it('vaciar un campo numérico lo quita del filtro', async () => {
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.changeText(screen.getByPlaceholderText('Inf'), '1200');
    await fireEvent.changeText(screen.getByPlaceholderText('Inf'), '');
    expect(screen.getByText('Aplicar filtros')).toBeDisabled();
  });

  it('el stepper suma de uno en uno y al bajar de 1 quita el valor', async () => {
    await render(<HousingScreen />);
    await openFilters();
    const adds = screen.getAllByTestId('icon-add');
    // adds[0] es el FAB; los tres siguientes son habitaciones, baños y estacionamientos
    await fireEvent.press(adds[1]);
    await fireEvent.press(adds[1]);
    await fireEvent.press(screen.getAllByTestId('icon-add')[2]);
    await fireEvent.press(screen.getByText('Aplicar filtros'));
    expect(lastFilters()).toEqual({ bedrooms: 2, bathrooms: 1 });

    await openFilters();
    await fireEvent.press(screen.getAllByTestId('icon-remove')[1]);
    await fireEvent.press(screen.getByText('Aplicar filtros'));
    expect(lastFilters()).toEqual({ bedrooms: 2 });
  });

  it('al reabrir el panel, el borrador parte de los filtros ya aplicados', async () => {
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Miraflores, San Isidro...'), 'Surco');
    await fireEvent.press(screen.getByText('Aplicar filtros'));
    await openFilters();
    expect(screen.getByPlaceholderText('Ej. Miraflores, San Isidro...').props.value).toBe('Surco');
  });

  it('cerrar el panel sin aplicar descarta el borrador', async () => {
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Miraflores, San Isidro...'), 'Surco');
    await fireEvent.press(screen.getByTestId('sheet-close'));
    expect(lastFilters()).toEqual({});
    await openFilters();
    expect(screen.getByPlaceholderText('Ej. Miraflores, San Isidro...').props.value).toBe('');
  });

  it('Limpiar elimina los filtros aplicados y cierra el panel', async () => {
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Miraflores, San Isidro...'), 'Surco');
    await fireEvent.press(screen.getByText('Aplicar filtros'));
    await openFilters();
    await fireEvent.press(screen.getByText('Limpiar'));
    expect(lastFilters()).toEqual({});
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('con filtros activos y lista vacía aparece "Limpiar filtros" y los quita', async () => {
    mockUseProperties.mockImplementation((f: any) =>
      listState({ data: { pages: [{ items: Object.keys(f).length ? [] : [h1], total: 0 }] } }),
    );
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Miraflores, San Isidro...'), 'Surco');
    await fireEvent.press(screen.getByText('Aplicar filtros'));
    await fireEvent.press(screen.getByText('Limpiar filtros'));
    expect(lastFilters()).toEqual({});
    expect(screen.getByText('Casa 1')).toBeTruthy();
  });

  it('el botón de cerrar junto al distrito borra solo ese campo', async () => {
    await render(<HousingScreen />);
    await openFilters();
    await fireEvent.changeText(screen.getByPlaceholderText('Ej. Miraflores, San Isidro...'), 'Surco');
    await fireEvent.press(screen.getByTestId('icon-close-circle'));
    expect(screen.getByPlaceholderText('Ej. Miraflores, San Isidro...').props.value).toBe('');
  });
});
