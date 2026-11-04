import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import MapScreen from '@/app/(tabs)';
import { router, routeState, resetRouter } from '@/__tests__/_helpers/app/expoRouter';
import { mapHandle } from '@/__tests__/_helpers/app/map';
import { makeHousing } from '@/__tests__/_helpers/app/housingCard';

const mockAuth = jest.fn();
const mockGuest = jest.fn();
const mockUseWorkplaces = jest.fn();
const mockUsePreferences = jest.fn();
const mockUseLatest = jest.fn();
const mockUseIsMutating = jest.fn();
const mockSelectedWorkplace = jest.fn();
const mockRouteCalc = jest.fn();
const mockSetupModal = jest.fn();
const mockWorkplaceSheet = jest.fn();
const mockHomeSheet = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}));
jest.mock('@/shared/ui/map', () => require('@/__tests__/_helpers/app/map').mapModule);
jest.mock('@/entities/housing', () => require('@/__tests__/_helpers/app/housingCard').housingEntityModule);
jest.mock('@/entities/route', () => ({
  RoutePolyline: ({ coordinates }: any) => {
    const { Text } = require('react-native');
    return <Text testID="polyline">{String(coordinates.length)}</Text>;
  },
  formatTravelTime: (m: number) => `${m} min`,
}));
jest.mock('@/entities/recommendation-preferences', () => ({
  usePreferences: (id: any) => mockUsePreferences(id),
}));
jest.mock('@/entities/workplace/model/useWorkplaces', () => ({
  useWorkplaces: (enabled: boolean) => mockUseWorkplaces(enabled),
}));
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/features/guest', () => ({
  useGuest: () => mockGuest(),
  GuestSetupModal: (props: any) => {
    mockSetupModal(props);
    return null;
  },
}));
jest.mock('@/features/recommendation/model/useRecommendations', () => ({
  guestGenerateKey: ['guest-generate'],
  recommendKeys: { generate: ['generate'] },
  useLatestRecommendations: (id: any) => mockUseLatest(id),
}));
jest.mock('@tanstack/react-query', () => ({
  useIsMutating: (opts: any) => mockUseIsMutating(opts),
}));
jest.mock('@/features/route-calculation', () => ({ useRouteCalculation: () => mockRouteCalc() }));
jest.mock('@/shared/model/SelectedWorkplaceContext', () => ({
  useSelectedWorkplace: () => mockSelectedWorkplace(),
}));
jest.mock('@/widgets/workplace/ui/WorkplaceSheet', () => ({
  WorkplaceSheet: (props: any) => {
    mockWorkplaceSheet(props);
    return null;
  },
}));
jest.mock('@/widgets/home/ui/HomeSheet', () => ({
  HomeSheet: (props: any) => {
    mockHomeSheet(props);
    return null;
  },
}));

const calculateRoute = jest.fn();
const clearRoute = jest.fn();
const routeState2: { route: any } = { route: null };

const lastProps = (m: jest.Mock) => m.mock.calls[m.mock.calls.length - 1][0];

const hA = makeHousing({ id: 'A', title: 'Casa A', latitude: -12.1, longitude: -77.0, price: 1500, currency: 'USD', district: 'Surco', bedrooms: 2, total_area_sqm: 70 });
const hB = makeHousing({ id: 'B', title: 'Casa B', latitude: -12.2, longitude: -77.1, price: 900, currency: 'PEN', district: 'Lince', bedrooms: 1, total_area_sqm: 40 });
const rec = (property: any, over: Record<string, any> = {}) => ({
  property,
  match_score: 50,
  predicted_time_min: 24.6,
  time_saved_mins: 9.4,
  franjas: { manana: 30 },
  ...over,
});
const recA = rec(hA, { match_score: 70 });
const recB = rec(hB, { match_score: 90, predicted_time_min: 41.2, time_saved_mins: 0 });

const authUser = { id: 1, role: 'user', home_lat: -12.05, home_lon: -77.05, home_address: 'Mi casa' };
const wp1 = { id: 11, work_address: 'Oficina 1', work_lat: -12.0, work_lon: -77.0 };
const wp2 = { id: 22, work_address: 'Oficina 2', work_lat: -12.3, work_lon: -77.2 };

const guestHome = { address: 'Casa guest', lat: -12.06, lon: -77.06 };
const guestWork = { address: 'Av. Javier Prado 100, San Isidro', lat: -12.09, lon: -77.02, transport: 'Bicicleta', maxDistanceKm: 5 };

function authState(over: Record<string, any> = {}) {
  const s = {
    user: authUser,
    workplaces: [wp1, wp2],
    selectedId: null as number | null,
    prefs: [{ preferred_transportation: 'walking', max_distance_km: 7 }],
    recs: { results: [recA, recB] } as any,
    loading: false,
    ...over,
  };
  mockAuth.mockReturnValue({ user: s.user, isInitialized: true });
  mockGuest.mockReturnValue({ guestHome: null, guestWorkplace: null, guestRecommendations: null, isInitialized: true });
  mockUseWorkplaces.mockReturnValue({ data: s.workplaces });
  mockSelectedWorkplace.mockReturnValue({ selectedWorkplaceId: s.selectedId });
  mockUsePreferences.mockReturnValue({ data: s.prefs });
  mockUseLatest.mockReturnValue({ data: s.recs, isLoading: s.loading });
  mockUseIsMutating.mockReturnValue(0);
}

function guestState(over: Record<string, any> = {}) {
  const s = {
    home: guestHome as any,
    work: guestWork as any,
    recs: { results: [recA, recB] } as any,
    init: true,
    authInit: true,
    ...over,
  };
  mockAuth.mockReturnValue({ user: null, isInitialized: s.authInit });
  mockGuest.mockReturnValue({
    guestHome: s.home,
    guestWorkplace: s.work,
    guestRecommendations: s.recs,
    isInitialized: s.init,
  });
  mockUseWorkplaces.mockReturnValue({ data: undefined });
  mockSelectedWorkplace.mockReturnValue({ selectedWorkplaceId: null });
  mockUsePreferences.mockReturnValue({ data: undefined });
  mockUseLatest.mockReturnValue({ data: null, isLoading: false });
  mockUseIsMutating.mockReturnValue(0);
}

async function flush(ms = 0) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function setup() {
  const utils = await render(<MapScreen />);
  await flush(0);
  return utils;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetRouter();
  routeState2.route = null;
  mockRouteCalc.mockImplementation(() => ({ route: routeState2.route, calculateRoute, clearRoute }));
  authState();
});
afterEach(() => jest.useRealTimers());

describe('MapScreen asistente de invitado', () => {
  const visible = () => lastProps(mockSetupModal).visible;

  it('se abre cuando falta la casa', async () => {
    guestState({ home: null });
    await setup();
    expect(visible()).toBe(true);
  });

  it('se abre cuando falta el trabajo', async () => {
    guestState({ work: null });
    await setup();
    expect(visible()).toBe(true);
  });

  it('no se abre si ya hay casa y trabajo', async () => {
    guestState();
    await setup();
    expect(visible()).toBe(false);
  });

  it('no se abre antes de que se inicialicen la sesión o el almacenamiento de invitado', async () => {
    guestState({ home: null, init: false });
    await setup();
    expect(visible()).toBe(false);
    guestState({ home: null, authInit: false });
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(visible()).toBe(false);
  });

  it('no se abre para un usuario autenticado aunque falte casa o trabajo', async () => {
    authState({ user: { ...authUser, home_lat: null }, workplaces: [] });
    await setup();
    expect(visible()).toBe(false);
  });

  it('se abre al terminar de inicializar el almacenamiento', async () => {
    guestState({ home: null, init: false });
    await setup();
    guestState({ home: null, init: true });
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(visible()).toBe(true);
  });

  it('si el invitado inicia sesión con el asistente pendiente, deja de mostrarse', async () => {
    guestState({ home: null });
    await setup();
    expect(visible()).toBe(true);
    authState();
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(visible()).toBe(false);
  });

  it('onClose lo cierra', async () => {
    guestState({ home: null });
    await setup();
    await act(async () => lastProps(mockSetupModal).onClose());
    expect(visible()).toBe(false);
  });

  // El efecto depende de guestHome/guestWorkplace y vuelve a poner showSetup en true tras cerrarlo.
  it('una vez cerrado no se reabre cuando cambian las dependencias y sigue faltando algo', async () => {
    guestState({ home: null, work: null });
    await setup();
    await act(async () => lastProps(mockSetupModal).onClose());
    expect(visible()).toBe(false);
    guestState({ home: guestHome, work: null });
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(visible()).toBe(false);
  });

  it('si el usuario cierra sesión (o elimina su cuenta) vuelve a ofrecer el asistente una vez', async () => {
    guestState({ home: null, work: null });
    await setup();
    await act(async () => lastProps(mockSetupModal).onClose());
    expect(visible()).toBe(false);
    authState();
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(visible()).toBe(false);
    guestState({ home: null, work: null });
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(visible()).toBe(true);
  });

  it('una vez cerrado sigue cerrado si las dependencias no cambian', async () => {
    guestState({ home: null, work: null });
    await setup();
    await act(async () => lastProps(mockSetupModal).onClose());
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(visible()).toBe(false);
  });

  it('el buscador de un invitado lo abre de nuevo manualmente', async () => {
    guestState();
    await setup();
    expect(visible()).toBe(false);
    await fireEvent.press(screen.getByText('Av. Javier Prado 100'));
    expect(visible()).toBe(true);
  });
});

describe('MapScreen buscador y hoja de trabajo (autenticado)', () => {
  it('muestra la dirección del trabajo activo y abre la hoja del trabajo', async () => {
    await setup();
    expect(lastProps(mockWorkplaceSheet).visible).toBe(false);
    await fireEvent.press(screen.getAllByText('Oficina 1')[0]);
    expect(lastProps(mockWorkplaceSheet).visible).toBe(true);
    expect(lastProps(mockWorkplaceSheet).workplace).toBe(wp1);
    await act(async () => lastProps(mockWorkplaceSheet).onClose());
    expect(lastProps(mockWorkplaceSheet).visible).toBe(false);
  });

  it('el buscador de un autenticado no abre el asistente de invitado', async () => {
    await setup();
    await fireEvent.press(screen.getAllByText('Oficina 1')[0]);
    expect(lastProps(mockSetupModal).visible).toBe(false);
  });

  it('usa el trabajo seleccionado en lugar del primero', async () => {
    authState({ selectedId: 22 });
    await setup();
    expect(screen.getAllByText('Oficina 2').length).toBeGreaterThan(0);
    expect(screen.queryByText('Oficina 1')).toBeNull();
  });

  it('si el seleccionado no existe cae al primero', async () => {
    authState({ selectedId: 999 });
    await setup();
    expect(screen.getAllByText('Oficina 1').length).toBeGreaterThan(0);
  });

  it('sin trabajos pide configurar la búsqueda', async () => {
    authState({ workplaces: [], recs: null });
    await setup();
    expect(screen.getByText('Configura tu búsqueda')).toBeTruthy();
  });

  it('consulta trabajos solo con sesión y recomendaciones/preferencias del trabajo activo', async () => {
    authState({ selectedId: 22 });
    await setup();
    expect(mockUseWorkplaces).toHaveBeenCalledWith(true);
    expect(mockUsePreferences).toHaveBeenCalledWith(22);
    expect(mockUseLatest).toHaveBeenCalledWith(22);
  });

  it('un invitado no consulta trabajos ni recomendaciones del servidor', async () => {
    guestState();
    await setup();
    expect(mockUseWorkplaces).toHaveBeenCalledWith(false);
    expect(mockUseLatest).toHaveBeenCalledWith(null);
  });
});

describe('MapScreen buscador (invitado)', () => {
  it('muestra la primera parte de la dirección del trabajo', async () => {
    guestState();
    await setup();
    expect(screen.getByText('Av. Javier Prado 100')).toBeTruthy();
  });

  it('sin trabajo pide configurar la búsqueda', async () => {
    guestState({ work: null });
    await setup();
    expect(screen.getByText('Configura tu búsqueda')).toBeTruthy();
  });
});

describe('MapScreen marcadores de casa y trabajo', () => {
  it('autenticado con coordenadas muestra casa y trabajo, y la casa abre la hoja de vivienda', async () => {
    await setup();
    expect(lastProps(mockHomeSheet).visible).toBe(false);
    await fireEvent.press(screen.getByTestId('marker-Mi Casa Actual'));
    expect(lastProps(mockHomeSheet).visible).toBe(true);
    await act(async () => lastProps(mockHomeSheet).onClose());
    expect(lastProps(mockHomeSheet).visible).toBe(false);
    expect(screen.getByTestId('marker-Oficina 1').props.coordinate).toEqual({ latitude: -12.0, longitude: -77.0 });
  });

  it('autenticado sin coordenadas de casa no muestra marcador de casa', async () => {
    authState({ user: { ...authUser, home_lat: null } });
    await setup();
    expect(screen.queryByTestId('marker-Mi Casa Actual')).toBeNull();
  });

  it('el marcador del trabajo de un autenticado abre la hoja del trabajo', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('marker-Oficina 1'));
    expect(lastProps(mockWorkplaceSheet).visible).toBe(true);
  });

  it('el radio del círculo usa max_distance_km de las preferencias (7 km)', async () => {
    await setup();
    expect(screen.getByTestId('circle').props.children).toBe('7000');
  });

  it('sin preferencias el radio por defecto es 10 km', async () => {
    authState({ prefs: [] });
    await setup();
    expect(screen.getByTestId('circle').props.children).toBe('10000');
  });

  it('invitado: marcadores de casa y trabajo, y radio del trabajo guardado', async () => {
    guestState();
    await setup();
    expect(screen.getByTestId('marker-Mi Casa Actual').props.coordinate).toEqual({ latitude: -12.06, longitude: -77.06 });
    expect(screen.getByTestId('marker-Mi Trabajo').props.coordinate).toEqual({ latitude: -12.09, longitude: -77.02 });
    expect(screen.getByTestId('circle').props.children).toBe('5000');
  });

  it('invitado sin maxDistanceKm usa 10 km', async () => {
    guestState({ work: { ...guestWork, maxDistanceKm: undefined } });
    await setup();
    expect(screen.getByTestId('circle').props.children).toBe('10000');
  });

  it('invitado: el marcador de trabajo abre el asistente y el de casa la hoja de vivienda', async () => {
    guestState();
    await setup();
    await fireEvent.press(screen.getByTestId('marker-Mi Trabajo'));
    expect(lastProps(mockSetupModal).visible).toBe(true);
    await fireEvent.press(screen.getByTestId('marker-Mi Casa Actual'));
    expect(lastProps(mockHomeSheet).visible).toBe(true);
  });

  it('invitado sin casa guardada no muestra marcador de casa', async () => {
    guestState({ home: null });
    await setup();
    expect(screen.queryByTestId('marker-Mi Casa Actual')).toBeNull();
  });
});

describe('MapScreen recomendaciones y selección automática', () => {
  it('pinta un marcador por recomendación', async () => {
    await setup();
    expect(screen.getByTestId('housing-marker-A')).toBeTruthy();
    expect(screen.getByTestId('housing-marker-B')).toBeTruthy();
  });

  it('selecciona la de mayor match_score, muestra su tarjeta y calcula la ruta con el modo de preferencias', async () => {
    await setup();
    expect(screen.getByTestId('housing-marker-B').props.isSelected).toBe(true);
    expect(screen.getByTestId('housing-marker-A').props.isSelected).toBe(false);
    expect(screen.getByText(/Lince · 1 hab · 40 m²/)).toBeTruthy();
    expect(calculateRoute).toHaveBeenCalledWith(
      { latitude: -12.2, longitude: -77.1 },
      { latitude: -12.0, longitude: -77.0 },
      'walking',
    );
  });

  it('encuadra la seleccionada y el trabajo tras 350 ms, dejando margen para la tarjeta', async () => {
    await setup();
    expect(mapHandle.animateToRegion).not.toHaveBeenCalled();
    await flush(350);
    const [region, duration] = mapHandle.animateToRegion.mock.calls[0];
    expect(duration).toBe(700);
    for (const point of [hB, { latitude: wp1.work_lat, longitude: wp1.work_lon }]) {
      expect(Math.abs(point.latitude - region.latitude)).toBeLessThan(region.latitudeDelta / 2);
      expect(Math.abs(point.longitude - region.longitude)).toBeLessThan(region.longitudeDelta / 2);
    }
    expect(region.latitude).toBeLessThan((hB.latitude + wp1.work_lat) / 2);
  });

  it('si llega focusPropertyId enfoca esa vivienda en vez de la mejor', async () => {
    routeState.params = { focusPropertyId: 'A' };
    await setup();
    expect(screen.getByTestId('housing-marker-A').props.isSelected).toBe(true);
    await flush(350);
    const [region] = mapHandle.animateToRegion.mock.calls[0];
    expect(Math.abs(hA.latitude - region.latitude)).toBeLessThan(region.latitudeDelta / 2);
    expect(Math.abs(wp1.work_lat - region.latitude)).toBeLessThan(region.latitudeDelta / 2);
    expect(region.longitude).toBe(-77.0);
  });

  it('si focusPropertyId no existe vuelve a la mejor', async () => {
    routeState.params = { focusPropertyId: 'ZZ' };
    await setup();
    expect(screen.getByTestId('housing-marker-B').props.isSelected).toBe(true);
  });

  it('sin recomendaciones no hay selección ni tarjeta y se limpia la ruta', async () => {
    authState({ recs: { results: [] } });
    await setup();
    expect(screen.queryByTestId('housing-marker-A')).toBeNull();
    expect(screen.queryByText(/hab ·/)).toBeNull();
    expect(clearRoute).toHaveBeenCalled();
    expect(calculateRoute).not.toHaveBeenCalled();
  });

  it('no vuelve a forzar la mejor tras elegir otra aunque las recomendaciones cambien de referencia', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('housing-marker-A'));
    expect(screen.getByTestId('housing-marker-A').props.isSelected).toBe(true);
    authState({ recs: { results: [recA, recB] } });
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(screen.getByTestId('housing-marker-A').props.isSelected).toBe(true);
    expect(screen.getByTestId('housing-marker-B').props.isSelected).toBe(false);
  });

  it('al cambiar de trabajo activo vuelve a seleccionar la mejor del nuevo conjunto', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('housing-marker-A'));
    authState({ selectedId: 22, recs: { results: [recA, recB] } });
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(screen.getByTestId('housing-marker-B').props.isSelected).toBe(true);
  });

  it('invitado: usa las recomendaciones guardadas y el modo normalizado de su trabajo', async () => {
    guestState();
    await setup();
    expect(screen.getByTestId('housing-marker-B').props.isSelected).toBe(true);
    expect(calculateRoute).toHaveBeenCalledWith(
      { latitude: -12.2, longitude: -77.1 },
      { latitude: -12.09, longitude: -77.02 },
      'cycling',
    );
  });

  it('sin coordenadas del trabajo selecciona pero no calcula ruta', async () => {
    authState({ workplaces: [{ id: 11, work_address: 'Oficina 1', work_lat: null, work_lon: null }] });
    await setup();
    expect(screen.getByTestId('housing-marker-B').props.isSelected).toBe(true);
    expect(calculateRoute).not.toHaveBeenCalled();
  });

  it('con solo una de las dos coordenadas del trabajo no calcula ruta', async () => {
    authState({ workplaces: [{ id: 11, work_address: 'Oficina 1', work_lat: -12.0, work_lon: null }] });
    await setup();
    expect(calculateRoute).not.toHaveBeenCalled();
  });

  it('al empezar a cargar se quita la selección y se limpia la ruta', async () => {
    await setup();
    expect(screen.getByText(/Lince · 1 hab/)).toBeTruthy();
    clearRoute.mockClear();
    authState({ loading: true });
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(screen.queryByText(/hab ·/)).toBeNull();
    expect(clearRoute).toHaveBeenCalled();
  });

  it('si las recomendaciones pasan a estar vacías se quita la selección y se limpia la ruta', async () => {
    await setup();
    clearRoute.mockClear();
    authState({ recs: { results: [] } });
    await screen.rerender(<MapScreen />);
    await flush(0);
    expect(screen.queryByText(/hab ·/)).toBeNull();
    expect(clearRoute).toHaveBeenCalled();
  });

  it('dibuja la ruta cuando existe', async () => {
    routeState2.route = { waypoints: [1, 2, 3] };
    await setup();
    expect(screen.getByTestId('polyline').props.children).toBe('3');
  });

  it('viviendas con la misma coordenada reciben posiciones de pantalla distintas', async () => {
    const same = [rec(makeHousing({ id: 'X', latitude: -12.1, longitude: -77.0 })), rec(makeHousing({ id: 'Y', latitude: -12.1, longitude: -77.0 }))];
    authState({ recs: { results: same } });
    await setup();
    const x = screen.getByTestId('housing-marker-X').props.displayCoordinate;
    const y = screen.getByTestId('housing-marker-Y').props.displayCoordinate;
    expect(x).not.toEqual(y);
  });
});

describe('MapScreen carga de recomendaciones', () => {
  it('autenticado: muestra "Analizando viviendas..." mientras carga y quita la selección', async () => {
    authState({ loading: true });
    await setup();
    expect(screen.getByText('Analizando viviendas...')).toBeTruthy();
    expect(screen.queryByText(/hab ·/)).toBeNull();
  });

  it('autenticado: también al generar recomendaciones', async () => {
    mockUseIsMutating.mockImplementation((o: any) => (o.mutationKey[0] === 'generate' ? 1 : 0));
    await setup();
    expect(screen.getByText('Analizando viviendas...')).toBeTruthy();
  });

  it('autenticado: la generación de invitado no cuenta', async () => {
    await setup();
    mockUseIsMutating.mockImplementation((o: any) => (o.mutationKey[0] === 'guest-generate' ? 1 : 0));
    await screen.rerender(<MapScreen />);
    expect(screen.queryByText('Analizando viviendas...')).toBeNull();
  });

  it('invitado: solo cuenta la generación de invitado', async () => {
    guestState();
    mockUseIsMutating.mockImplementation((o: any) => (o.mutationKey[0] === 'guest-generate' ? 1 : 0));
    await setup();
    expect(screen.getByText('Analizando viviendas...')).toBeTruthy();
  });

  it('invitado: la generación de un autenticado no cuenta', async () => {
    guestState();
    mockUseIsMutating.mockImplementation((o: any) => (o.mutationKey[0] === 'generate' ? 1 : 0));
    await setup();
    expect(screen.queryByText('Analizando viviendas...')).toBeNull();
  });

  it('sin carga no muestra el aviso', async () => {
    await setup();
    expect(screen.queryByText('Analizando viviendas...')).toBeNull();
  });
});

describe('MapScreen tarjeta flotante', () => {
  it('muestra precio, especificaciones, tiempo redondeado y ahorro', async () => {
    authState({ recs: { results: [recA] } });
    await setup();
    expect(screen.getByText(/USD 1,500|USD 1.500/)).toBeTruthy();
    expect(screen.getByText(/Surco · 2 hab · 70 m²/)).toBeTruthy();
    expect(screen.getByText('25 min')).toBeTruthy();
    expect(screen.getByText('-9 min')).toBeTruthy();
  });

  it('sin ahorro positivo no muestra la etiqueta de ahorro', async () => {
    authState({ recs: { results: [recB] } });
    await setup();
    expect(screen.getByText('41 min')).toBeTruthy();
    expect(screen.queryByText(/^-/)).toBeNull();
  });

  it('con ahorro null tampoco la muestra', async () => {
    authState({ recs: { results: [rec(hA, { time_saved_mins: null })] } });
    await setup();
    expect(screen.queryByText(/^-/)).toBeNull();
  });

  it('pulsar la tarjeta abre el detalle con la vivienda y los datos de la recomendación', async () => {
    authState({ recs: { results: [recA] } });
    await setup();
    await fireEvent.press(screen.getByText(/Surco · 2 hab/));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/housing-detail',
      params: {
        id: 'A',
        data: JSON.stringify(hA),
        reco: JSON.stringify({ predicted_time_min: 24.6, time_saved_mins: 9.4, franjas: { manana: 30 } }),
      },
    });
  });

  it('elegir otro marcador cambia la tarjeta y recalcula la ruta', async () => {
    await setup();
    calculateRoute.mockClear();
    await fireEvent.press(screen.getByTestId('housing-marker-A'));
    expect(screen.getByText(/Surco · 2 hab/)).toBeTruthy();
    expect(calculateRoute).toHaveBeenCalledWith(
      { latitude: -12.1, longitude: -77.0 },
      { latitude: -12.0, longitude: -77.0 },
      'walking',
    );
  });
});

it('centra el mapa en el nuevo trabajo aunque no tenga recomendaciones', async () => {
  authState({ selectedId: 11, recs: { results: [] } });
  await setup();
  mapHandle.animateToRegion.mockClear();
  authState({ selectedId: 22, recs: { results: [] } });
  await screen.rerender(<MapScreen />);
  expect(mapHandle.animateToRegion).toHaveBeenCalledWith(
    expect.objectContaining({ latitude: wp2.work_lat, longitude: wp2.work_lon }),
    500,
  );
});
