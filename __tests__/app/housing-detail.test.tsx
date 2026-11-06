import React from 'react';
import { Alert, Linking } from 'react-native';
import { render, fireEvent, screen, act, waitFor } from '@testing-library/react-native';
import HousingDetailScreen from '@/app/housing-detail';
import { router, routeState, resetRouter } from '@/__tests__/_helpers/app/expoRouter';
import { makeHousing } from '@/__tests__/_helpers/app/housingCard';

const mockAuth = jest.fn();
const mockGuest = jest.fn();
const mockWorkplaces = jest.fn();
const mockPreferences = jest.fn();
const mockSelected = jest.fn();
const mockUseQuery = jest.fn();
const mockFetchRoute = jest.fn();
const mockMutate = jest.fn();
const mockLightbox = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}));
jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () =>
  require('@/__tests__/_helpers/app/rnPieces').activityIndicatorModule,
);
jest.mock('react-native/Libraries/Image/Image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { View } = require('react-native');
    return <View testID="hero-image" {...({ source: props.source } as any)} />;
  },
}));
jest.mock('react-native/Libraries/Lists/FlatList', () => ({
  __esModule: true,
  default: (props: any) => {
    const { View, Pressable } = require('react-native');
    const { data = [], renderItem, ListEmptyComponent } = props;
    return (
      <View>
        {data.length === 0 ? ListEmptyComponent : data.map((item: any, index: number) => (
          <View key={index}>{renderItem({ item, index })}</View>
        ))}
        <Pressable
          testID="scroll-end-2"
          onPress={() => props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 750 * 2 } } })}
        />
      </View>
    );
  },
}));
jest.mock('@tanstack/react-query', () => ({ useQuery: (o: any) => mockUseQuery(o) }));
jest.mock('@/entities/housing/api/housing.api', () => ({ fetchPropertyById: jest.fn() }));
jest.mock('@/entities/route', () => ({
  fetchModeRoute: (...a: any[]) => mockFetchRoute(...a),
  formatTravelTime: (m: number) => `${m}min`,
}));
jest.mock('@/entities/recommendation-preferences', () => ({ usePreferences: (id: any) => mockPreferences(id) }));
jest.mock('@/entities/housing/model/useProperties', () => ({
  useToggleFavorite: () => ({ mutate: mockMutate }),
}));
jest.mock('@/entities/workplace/model/useWorkplaces', () => ({ useWorkplaces: (e: any) => mockWorkplaces(e) }));
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/features/guest', () => ({ useGuest: () => mockGuest() }));
jest.mock('@/shared/model/SelectedWorkplaceContext', () => ({ useSelectedWorkplace: () => mockSelected() }));
jest.mock('@/shared/ui/ImageLightbox', () => ({
  ImageLightbox: (props: any) => {
    mockLightbox(props);
    const { Pressable } = require('react-native');
    return <Pressable testID="lightbox-close" onPress={props.onClose} />;
  },
}));

const house = makeHousing({
  id: 'h1',
  title: 'Depa Miraflores',
  address: 'Av. Larco 123',
  district: 'Miraflores',
  price: 1500,
  currency: 'USD',
  property_type: 'Departamento',
  images: ['a.jpg', 'b.jpg', 'c.jpg'],
  description: 'Luminoso',
  features: ['Balcón', 'Ascensor'],
  phone: '987654321',
  parking: 1,
  antiquity: 3,
  covered_area_sqm: 60,
  total_area_sqm: 70,
});
const wp = { id: 7, work_lat: -12.05, work_lon: -77.04, work_address: 'Oficina Centro' };
const alertCalls = () => (Alert.alert as jest.Mock).mock.calls;

let queryResult: any;
function setHousing(h: any, extra: Record<string, any> = {}) {
  queryResult = { data: h, isLoading: false, ...extra };
}

function setParams(p: Record<string, any>) {
  routeState.params = p;
}

beforeEach(() => {
  resetRouter();
  mockLightbox.mockClear();
  mockAuth.mockReturnValue({ user: { id: 1 } });
  mockGuest.mockReturnValue({ guestWorkplace: null });
  mockWorkplaces.mockReturnValue({ data: [wp] });
  mockPreferences.mockReturnValue({ data: [{ preferred_transportation: 'driving' }] });
  mockSelected.mockReturnValue({ selectedWorkplaceId: null });
  mockFetchRoute.mockResolvedValue({ timeMinutes: 25 });
  setHousing(house);
  mockUseQuery.mockImplementation(() => queryResult);
  setParams({ id: 'h1', data: JSON.stringify(house) });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
});
afterEach(() => jest.restoreAllMocks());

async function setup() {
  const utils = await render(<HousingDetailScreen />);
  await act(async () => {});
  return utils;
}

describe('HousingDetailScreen estados de carga', () => {
  it('consulta el contacto actual aunque llegue una recomendación antigua y exista caché reciente sin teléfono', async () => {
    const actual = jest.requireActual('@tanstack/react-query');
    const client = new actual.QueryClient({
      defaultOptions: { queries: { staleTime: 300000, retry: false } },
    });
    const previous = { ...house, id: '1294', phone: undefined };
    client.setQueryData(['property', '1294'], previous);
    setParams({ id: '1294', data: JSON.stringify(previous) });
    const { fetchPropertyById } = require('@/entities/housing/api/housing.api');
    fetchPropertyById.mockResolvedValueOnce({ ...previous, phone: '51 940 246 465' });
    mockUseQuery.mockImplementation((options) => actual.useQuery(options));
    const Provider = actual.QueryClientProvider;
    const view = await render(<Provider client={client}><HousingDetailScreen /></Provider>);
    await waitFor(() => expect(screen.getByText('Contactar por WhatsApp')).toBeTruthy());
    expect(fetchPropertyById).toHaveBeenCalledWith(1294);
    await view.unmount();
    client.clear();
  });

  it('mientras carga muestra el mensaje', async () => {
    setHousing(undefined, { isLoading: true });
    await setup();
    expect(screen.getByText('Cargando vivienda...')).toBeTruthy();
  });

  it('sin vivienda muestra "Vivienda no encontrada"', async () => {
    setHousing(undefined);
    await setup();
    expect(screen.getByText('Vivienda no encontrada')).toBeTruthy();
  });

  it('usa los datos recibidos por parámetro como valor inicial y consulta por id', async () => {
    await setup();
    const opts = mockUseQuery.mock.calls[0][0];
    expect(opts.queryKey).toEqual(['property', 'h1']);
    expect(opts.initialData).toEqual(house);
    expect(opts.enabled).toBe(true);
  });

  it('con datos JSON inválidos no hay valor inicial', async () => {
    setParams({ id: 'h1', data: '{roto' });
    await setup();
    expect(mockUseQuery.mock.calls[0][0].initialData).toBeUndefined();
  });

  it('sin id la consulta queda deshabilitada', async () => {
    setParams({});
    await setup();
    expect(mockUseQuery.mock.calls[0][0].enabled).toBe(false);
  });

  it('la función de consulta pide la vivienda con id numérico', async () => {
    const { fetchPropertyById } = require('@/entities/housing/api/housing.api');
    setParams({ id: '42' });
    await setup();
    mockUseQuery.mock.calls[0][0].queryFn();
    expect(fetchPropertyById).toHaveBeenCalledWith(42);
  });
});

describe('HousingDetailScreen contenido', () => {
  it('muestra título, dirección, precio con moneda, descripción y tipo', async () => {
    await setup();
    expect(screen.getByText('Depa Miraflores')).toBeTruthy();
    expect(screen.getByText('Av. Larco 123, Miraflores')).toBeTruthy();
    expect(screen.getByText('USD')).toBeTruthy();
    expect(screen.getByText('Luminoso')).toBeTruthy();
    expect(screen.getByText('Departamento')).toBeTruthy();
  });

  it('en soles muestra el símbolo S/', async () => {
    setHousing({ ...house, currency: 'PEN' });
    await setup();
    expect(screen.getByText('S/')).toBeTruthy();
  });

  it('muestra las características y oculta la sección si no hay', async () => {
    const { rerender } = await setup();
    expect(screen.getByText('Balcón')).toBeTruthy();
    expect(screen.getByText('Ascensor')).toBeTruthy();
    setHousing({ ...house, features: [] });
    await rerender(<HousingDetailScreen />);
    expect(screen.queryByText('Características')).toBeNull();
  });

  it('con una sola característica la sección se muestra', async () => {
    setHousing({ ...house, features: ['Balcón'] });
    await setup();
    expect(screen.getByText('Características')).toBeTruthy();
  });

  it('muestra estacionamientos solo si el dato está definido (0 incluido)', async () => {
    const { rerender } = await setup();
    expect(screen.getByText('Est.')).toBeTruthy();
    setHousing({ ...house, parking: 0 });
    await rerender(<HousingDetailScreen />);
    expect(screen.getByText('Est.')).toBeTruthy();
    setHousing({ ...house, parking: undefined });
    await rerender(<HousingDetailScreen />);
    expect(screen.queryByText('Est.')).toBeNull();
  });

  it('antigüedad: Estreno, singular y plural', async () => {
    setHousing({ ...house, antiquity: 0 });
    const { rerender } = await setup();
    expect(screen.getByText('Estreno')).toBeTruthy();
    setHousing({ ...house, antiquity: 1 });
    await rerender(<HousingDetailScreen />);
    expect(screen.getByText('1 año')).toBeTruthy();
    setHousing({ ...house, antiquity: 5 });
    await rerender(<HousingDetailScreen />);
    expect(screen.getByText('5 años')).toBeTruthy();
    setHousing({ ...house, antiquity: undefined });
    await rerender(<HousingDetailScreen />);
    expect(screen.queryByText('Estreno')).toBeNull();
    expect(screen.queryByText(/^\d+ años?$/)).toBeNull();
  });

  it('muestra el área cubierta solo si existe', async () => {
    const { rerender } = await setup();
    expect(screen.getByText('60 m² cubiertos')).toBeTruthy();
    setHousing({ ...house, covered_area_sqm: undefined });
    await rerender(<HousingDetailScreen />);
    expect(screen.queryByText(/cubiertos/)).toBeNull();
  });
});

describe('HousingDetailScreen galería', () => {
  it('muestra una imagen por foto', async () => {
    await setup();
    expect(screen.getAllByTestId('hero-image')).toHaveLength(3);
  });

  it('sin fotos muestra el marcador de imagen vacía', async () => {
    setHousing({ ...house, images: [] });
    await setup();
    expect(screen.queryAllByTestId('hero-image')).toHaveLength(0);
    expect(screen.getByTestId('icon-image-outline')).toBeTruthy();
  });

  it('pulsar una foto abre el visor en esa posición y cerrar lo oculta', async () => {
    await setup();
    expect(mockLightbox).not.toHaveBeenCalled();
    await fireEvent.press(screen.getAllByTestId('hero-image')[1]);
    expect(mockLightbox.mock.calls[0][0].initialIndex).toBe(1);
    expect(mockLightbox.mock.calls[0][0].sources).toEqual([{ uri: 'a.jpg' }, { uri: 'b.jpg' }, { uri: 'c.jpg' }]);
    await fireEvent.press(screen.getByTestId('lightbox-close'));
    expect(screen.queryByTestId('lightbox-close')).toBeNull();
  });

  it('el botón de retroceso vuelve atrás', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('icon-arrow-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe('HousingDetailScreen favorito', () => {
  it('invitado: avisa y ofrece iniciar sesión', async () => {
    mockAuth.mockReturnValue({ user: null });
    await setup();
    await fireEvent.press(screen.getByTestId('icon-heart-outline'));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(alertCalls()[0].slice(0, 2)).toEqual(['Inicia sesión', 'Debes iniciar sesión para guardar favoritos.']);
    alertCalls()[0][2].find((b: any) => b.text === 'Iniciar sesión').onPress();
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('con sesión y no favorita: la marca', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('icon-heart-outline'));
    expect(mockMutate).toHaveBeenCalledWith({ id: 'h1', isFavorite: true });
  });

  it('con sesión y favorita: muestra corazón lleno y la quita', async () => {
    setHousing({ ...house, isFavorite: true });
    await setup();
    await fireEvent.press(screen.getByTestId('icon-heart'));
    expect(mockMutate).toHaveBeenCalledWith({ id: 'h1', isFavorite: false });
  });
});

describe('HousingDetailScreen ver en mapa', () => {
  it('desde una recomendación vuelve al mapa principal enfocando la vivienda', async () => {
    setParams({ id: 'h1', data: JSON.stringify(house), reco: JSON.stringify({ predicted_time_min: 20, time_saved_mins: 5 }) });
    await setup();
    await fireEvent.press(screen.getByTestId('icon-map-outline'));
    expect(router.dismissTo).toHaveBeenCalledWith({ pathname: '/(tabs)', params: { focusPropertyId: 'h1' } });
    expect(router.push).not.toHaveBeenCalled();
  });

  it('sin recomendación abre el mapa simple con coordenadas y título', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('icon-map-outline'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/property-map',
      params: { lat: String(house.latitude), lon: String(house.longitude), title: 'Depa Miraflores' },
    });
    expect(router.dismissTo).not.toHaveBeenCalled();
  });
});

describe('HousingDetailScreen WhatsApp', () => {
  const press = () => fireEvent.press(screen.getByText('Contactar por WhatsApp'));

  it('un número de 9 dígitos recibe el prefijo 51 y el mensaje codificado', async () => {
    await setup();
    await press();
    const url = (Linking.openURL as jest.Mock).mock.calls[0][0] as string;
    expect(url.startsWith('https://wa.me/51987654321?text=')).toBe(true);
    const msg = decodeURIComponent(url.split('?text=')[1]);
    expect(msg).toContain('"Depa Miraflores"');
  });

  it('quita símbolos del número y no antepone 51 si ya trae código', async () => {
    setHousing({ ...house, phone: '+51 987-654-321' });
    await setup();
    await press();
    expect((Linking.openURL as jest.Mock).mock.calls[0][0]).toContain('https://wa.me/51987654321?');
  });

  it('un número de 9 dígitos con espacios también se normaliza', async () => {
    setHousing({ ...house, phone: '987 654 321' });
    await setup();
    await press();
    expect((Linking.openURL as jest.Mock).mock.calls[0][0]).toContain('wa.me/51987654321?');
  });

  it('si WhatsApp no se puede abrir avisa', async () => {
    (Linking.openURL as jest.Mock).mockRejectedValue(new Error('x'));
    await setup();
    await press();
    await act(async () => {});
    expect(alertCalls()[0]).toEqual(['WhatsApp no disponible', 'No se pudo abrir WhatsApp en este dispositivo.']);
  });

  it('sin teléfono muestra el aviso y no el botón', async () => {
    setHousing({ ...house, phone: undefined });
    await setup();
    expect(screen.queryByText('Contactar por WhatsApp')).toBeNull();
    expect(screen.getByText('El anunciante no dejó un número de contacto')).toBeTruthy();
  });

  it('no afirma que falta el teléfono mientras consulta los datos actuales', async () => {
    setHousing({ ...house, phone: undefined }, { isFetching: true });
    await setup();
    expect(screen.getByText('Consultando contacto...')).toBeTruthy();
    expect(screen.queryByText('El anunciante no dejó un número de contacto')).toBeNull();
  });
});

describe('HousingDetailScreen tiempo al trabajo', () => {
  it('con recomendación usa el tiempo y el ahorro del modelo sin pedir ruta', async () => {
    setParams({ id: 'h1', data: JSON.stringify(house), reco: JSON.stringify({ predicted_time_min: 19.6, time_saved_mins: 7.4 }) });
    await setup();
    expect(mockFetchRoute).not.toHaveBeenCalled();
    expect(screen.getByText('20min')).toBeTruthy();
    expect(screen.getByText('7min')).toBeTruthy();
    expect(screen.getByText('vs tu casa actual')).toBeTruthy();
  });

  it('con ahorro negativo muestra el valor absoluto y "más que tu casa"', async () => {
    setParams({ id: 'h1', data: JSON.stringify(house), reco: JSON.stringify({ predicted_time_min: 30, time_saved_mins: -12 }) });
    await setup();
    expect(screen.getByText('12min')).toBeTruthy();
    expect(screen.getByText('más que tu casa')).toBeTruthy();
    expect(screen.getByTestId('icon-trending-up')).toBeTruthy();
  });

  it('con ahorro 0 cuenta como ahorro (no negativo)', async () => {
    setParams({ id: 'h1', data: JSON.stringify(house), reco: JSON.stringify({ predicted_time_min: 30, time_saved_mins: 0 }) });
    await setup();
    expect(screen.getByText('vs tu casa actual')).toBeTruthy();
    expect(screen.getByTestId('icon-trending-down')).toBeTruthy();
  });

  it('con ahorro null no muestra la tarjeta de ahorro', async () => {
    setParams({ id: 'h1', data: JSON.stringify(house), reco: JSON.stringify({ predicted_time_min: 30, time_saved_mins: null }) });
    await setup();
    expect(screen.queryByText('vs tu casa actual')).toBeNull();
    expect(screen.queryByText('más que tu casa')).toBeNull();
  });

  it('sin recomendación pide una ruta en el modo preferido y muestra el tiempo', async () => {
    await setup();
    expect(mockFetchRoute).toHaveBeenCalledTimes(1);
    expect(mockFetchRoute).toHaveBeenCalledWith(
      { latitude: house.latitude, longitude: house.longitude },
      { latitude: wp.work_lat, longitude: wp.work_lon },
      'driving',
    );
    expect(screen.getByText('25min')).toBeTruthy();
  });

  it('mientras llega la ruta muestra "--"', async () => {
    mockFetchRoute.mockReturnValue(new Promise(() => {}));
    await setup();
    expect(screen.getByText('--')).toBeTruthy();
  });

  it('un reco con JSON inválido se trata como sin recomendación', async () => {
    setParams({ id: 'h1', data: JSON.stringify(house), reco: '{roto' });
    await setup();
    expect(mockFetchRoute).toHaveBeenCalledTimes(1);
  });

  it('usa el modo de transporte de las preferencias', async () => {
    mockPreferences.mockReturnValue({ data: [{ preferred_transportation: 'walking' }] });
    await setup();
    expect(mockFetchRoute.mock.calls[0][2]).toBe('walking');
    expect(screen.getByText('A pie')).toBeTruthy();
  });

  it('sin coordenadas de trabajo no pide ruta ni muestra la sección', async () => {
    mockWorkplaces.mockReturnValue({ data: [] });
    await setup();
    expect(mockFetchRoute).not.toHaveBeenCalled();
    expect(screen.queryByText('Tiempo a tu trabajo')).toBeNull();
  });

  it('sin longitud de trabajo no muestra la sección de tiempo', async () => {
    mockWorkplaces.mockReturnValue({ data: [{ ...wp, work_lon: null }] });
    await setup();
    expect(screen.queryByText('Tiempo a tu trabajo')).toBeNull();
  });

  it('muestra el nombre del trabajo activo', async () => {
    await setup();
    expect(screen.getByText('Oficina Centro')).toBeTruthy();
  });

  it('elige el workplace seleccionado y consulta preferencias con su id', async () => {
    const wp2 = { id: 9, work_lat: -12.2, work_lon: -77.1, work_address: 'Sede Sur' };
    mockWorkplaces.mockReturnValue({ data: [wp, wp2] });
    mockSelected.mockReturnValue({ selectedWorkplaceId: 9 });
    await setup();
    expect(mockPreferences).toHaveBeenCalledWith(9);
    expect(screen.getByText('Sede Sur')).toBeTruthy();
    expect(mockFetchRoute.mock.calls[0][1]).toEqual({ latitude: -12.2, longitude: -77.1 });
  });

  it('un id seleccionado inexistente cae en el primer workplace', async () => {
    mockSelected.mockReturnValue({ selectedWorkplaceId: 999 });
    await setup();
    expect(screen.getByText('Oficina Centro')).toBeTruthy();
  });

  it('con sesión consulta workplaces habilitado; invitado no', async () => {
    await setup();
    expect(mockWorkplaces).toHaveBeenCalledWith(true);
  });

  it('invitado usa el trabajo y modo de su búsqueda local', async () => {
    mockAuth.mockReturnValue({ user: null });
    mockWorkplaces.mockReturnValue({ data: [] });
    mockGuest.mockReturnValue({
      guestWorkplace: { lat: -12.3, lon: -77.2, address: 'Av. Brasil 100, Lima', transport: 'Bicicleta' },
    });
    await setup();
    expect(mockWorkplaces).toHaveBeenCalledWith(false);
    expect(mockPreferences).toHaveBeenCalledWith(null);
    expect(screen.getByText('Av. Brasil 100')).toBeTruthy();
    expect(mockFetchRoute).toHaveBeenCalledWith(expect.anything(), { latitude: -12.3, longitude: -77.2 }, 'cycling');
  });

  it('muestra las franjas horarias solo en auto con franjas', async () => {
    const reco = { predicted_time_min: 20, time_saved_mins: 1, franjas: { punta_manana: 31.4, valle: 18, punta_tarde: 40.6 } };
    setParams({ id: 'h1', data: JSON.stringify(house), reco: JSON.stringify(reco) });
    const { rerender } = await setup();
    expect(screen.getByText('7am')).toBeTruthy();
    expect(screen.getByText('31m')).toBeTruthy();
    expect(screen.getByText('18m')).toBeTruthy();
    expect(screen.getByText('41m')).toBeTruthy();
    mockPreferences.mockReturnValue({ data: [{ preferred_transportation: 'walking' }] });
    await rerender(<HousingDetailScreen />);
    expect(screen.queryByText('7am')).toBeNull();
  });

  it('en auto sin franjas no muestra el desglose', async () => {
    setParams({ id: 'h1', data: JSON.stringify(house), reco: JSON.stringify({ predicted_time_min: 20, time_saved_mins: 1 }) });
    await setup();
    expect(screen.queryByText('7am')).toBeNull();
  });
});
