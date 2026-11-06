import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import RecommendScreen from '@/app/(tabs)/recommend';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';
import { makeHousing } from '@/__tests__/_helpers/app/housingCard';
import { formatPrice } from '@/shared/utils/currency';

const mockAuth = jest.fn();
const mockGuest = jest.fn();
const mockUseWorkplaces = jest.fn();
const mockSelected = jest.fn();
const mockSetSelected = jest.fn();
const mockLatest = jest.fn();
const mockGenerate = jest.fn();
const mockGuestMutation = jest.fn();
const mockMutating = jest.fn();
const mockSetupModal = jest.fn();
const mockWorkplaceSheet = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => require('@/__tests__/_helpers/app/rnPieces').activityIndicatorModule);
jest.mock('react-native/Libraries/Lists/FlatList', () => require('@/__tests__/_helpers/app/rnPieces').flatListModule);
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Circle: View };
});
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/features/guest', () => ({
  useGuest: () => mockGuest(),
  GuestSetupModal: (props: any) => {
    mockSetupModal(props);
    return null;
  },
}));
jest.mock('@/widgets/workplace/ui/WorkplaceSheet', () => ({
  WorkplaceSheet: (props: any) => {
    mockWorkplaceSheet(props);
    return null;
  },
}));
jest.mock('@/entities/workplace/model/useWorkplaces', () => ({
  useWorkplaces: (enabled: boolean) => mockUseWorkplaces(enabled),
}));
jest.mock('@/shared/model/SelectedWorkplaceContext', () => ({
  useSelectedWorkplace: () => mockSelected(),
}));
jest.mock('@/entities/housing/model/useProperties', () => ({ useToggleFavorite: () => ({ mutate: jest.fn() }) }));
jest.mock('@tanstack/react-query', () => ({
  useIsMutating: ({ mutationKey }: any) => mockMutating(mutationKey),
}));
jest.mock('@/features/recommendation/model/useRecommendations', () => ({
  guestGenerateKey: ['guest-generate'],
  recommendKeys: { generate: ['auth-generate'] },
  useLatestRecommendations: (id: any) => mockLatest(id),
  useGenerateRecommendations: () => mockGenerate(),
  useGuestRecommendations: () => mockGuestMutation(),
}));

const wp1 = { id: 1, work_address: 'Av. Javier Prado 100' };
const wp2 = { id: 2, work_address: 'Calle Los Pinos 5' };

const rec = (id: string, over: Record<string, any> = {}) => ({
  property: makeHousing({ id, district: `Distrito ${id}`, price: 1500, currency: 'PEN', images: [] }),
  match_score: 85,
  predicted_time_min: 25,
  time_saved_mins: null,
  franjas: null,
  ...over,
});

const guestWp = {
  lat: -12.1, lon: -77.0, budget: 2000, transport: 'driving', address: 'Av. Arequipa 123, Lima', maxDistanceKm: 8,
};
const guestHome = { lat: -12.2, lon: -77.1 };

let generateMutate: jest.Mock;
let guestMutateAsync: jest.Mock;
let saveGuestRecommendations: jest.Mock;
let counts: { guest: number; auth: number };

const setupProps = () => mockSetupModal.mock.calls[mockSetupModal.mock.calls.length - 1][0];
const sheetProps = () => mockWorkplaceSheet.mock.calls[mockWorkplaceSheet.mock.calls.length - 1][0];
const alertCalls = () => (Alert.alert as jest.Mock).mock.calls;

const NO_DATA = Symbol('sin datos');

function authState({
  workplaces = [wp1, wp2], loading = false, selected = 1, latest = { results: [rec('a')], message: null, min_price_in_area: null },
  loadingCached = false, gen = {},
}: any = {}) {
  mockAuth.mockReturnValue({ isAuthenticated: true });
  mockUseWorkplaces.mockReturnValue({ data: workplaces, isLoading: loading });
  mockSelected.mockReturnValue({ selectedWorkplaceId: selected, setSelectedWorkplaceId: mockSetSelected });
  mockLatest.mockReturnValue({ data: latest === NO_DATA ? undefined : latest, isLoading: loadingCached });
  mockGenerate.mockReturnValue({ mutate: generateMutate, data: undefined, isPending: false, ...gen });
}

function guestState({ workplace = guestWp, recs = null as any, home = guestHome } = {}) {
  mockAuth.mockReturnValue({ isAuthenticated: false });
  mockUseWorkplaces.mockReturnValue({ data: undefined, isLoading: false });
  mockSelected.mockReturnValue({ selectedWorkplaceId: null, setSelectedWorkplaceId: mockSetSelected });
  mockLatest.mockReturnValue({ data: undefined, isLoading: false });
  mockGenerate.mockReturnValue({ mutate: generateMutate, data: undefined, isPending: false });
  mockGuest.mockReturnValue({
    guestHome: home,
    guestWorkplace: workplace,
    guestRecommendations: recs,
    saveGuestRecommendations,
  });
}

beforeEach(() => {
  resetRouter();
  generateMutate = jest.fn();
  guestMutateAsync = jest.fn().mockResolvedValue([rec('g')]);
  saveGuestRecommendations = jest.fn().mockResolvedValue(undefined);
  counts = { guest: 0, auth: 0 };
  mockMutating.mockImplementation((key: any) => (key?.[0] === 'guest-generate' ? counts.guest : counts.auth));
  mockGuestMutation.mockReturnValue({ mutateAsync: guestMutateAsync });
  mockGuest.mockReturnValue({
    guestHome: null, guestWorkplace: null, guestRecommendations: null, saveGuestRecommendations,
  });
  authState();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('RecommendScreen autenticado: lugares de trabajo', () => {
  it('consulta los workplaces solo si hay sesión', async () => {
    await render(<RecommendScreen />);
    expect(mockUseWorkplaces).toHaveBeenCalledWith(true);
  });

  it('mientras cargan los workplaces muestra el indicador y no la lista', async () => {
    authState({ loading: true, workplaces: [] });
    await render(<RecommendScreen />);
    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByText('Agregar lugar de trabajo')).toBeNull();
  });

  it('sin workplaces muestra el estado vacío', async () => {
    authState({ workplaces: [], selected: null, latest: undefined });
    await render(<RecommendScreen />);
    expect(screen.getByText('No tienes lugares de trabajo.')).toBeTruthy();
  });

  it('lista los workplaces y marca solo el seleccionado', async () => {
    await render(<RecommendScreen />);
    expect(screen.getByText('Av. Javier Prado 100')).toBeTruthy();
    expect(screen.getByText('Calle Los Pinos 5')).toBeTruthy();
    expect(screen.getAllByTestId('icon-checkmark-circle')).toHaveLength(1);
  });

  it('tocar un workplace lo selecciona', async () => {
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Calle Los Pinos 5'));
    expect(mockSetSelected).toHaveBeenCalledWith(2);
  });

  it('sin selección previa elige el primero', async () => {
    authState({ selected: null });
    await render(<RecommendScreen />);
    expect(mockSetSelected).toHaveBeenCalledWith(1);
  });

  it('si el id seleccionado ya no existe elige el primero', async () => {
    authState({ selected: 99 });
    await render(<RecommendScreen />);
    expect(mockSetSelected).toHaveBeenCalledWith(1);
  });

  it('si el seleccionado existe no cambia la selección', async () => {
    authState({ selected: 2 });
    await render(<RecommendScreen />);
    expect(mockSetSelected).not.toHaveBeenCalled();
  });

  it('sin workplaces no intenta autoseleccionar', async () => {
    authState({ workplaces: [], selected: null, latest: undefined });
    await render(<RecommendScreen />);
    expect(mockSetSelected).not.toHaveBeenCalled();
  });

  it('el lápiz abre la hoja con ese workplace y permite eliminar', async () => {
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getAllByTestId('icon-pencil-outline')[1]);
    expect(sheetProps().visible).toBe(true);
    expect(sheetProps().workplace).toEqual(wp2);
    expect(sheetProps().allowDelete).toBe(true);
  });

  it('Agregar abre la hoja sin workplace y sin eliminar', async () => {
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Agregar lugar de trabajo'));
    expect(sheetProps().visible).toBe(true);
    expect(sheetProps().workplace).toBeNull();
    expect(sheetProps().allowDelete).toBe(false);
  });

  it('cerrar la hoja la oculta y limpia el workplace en edición', async () => {
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getAllByTestId('icon-pencil-outline')[0]);
    await act(async () => sheetProps().onClose());
    expect(sheetProps().visible).toBe(false);
    expect(sheetProps().workplace).toBeNull();
  });

  it('al crear un workplace nuevo lo selecciona y cierra la hoja', async () => {
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Agregar lugar de trabajo'));
    await act(async () => sheetProps().onSuccess(7));
    expect(mockSetSelected).toHaveBeenCalledWith(7);
    expect(sheetProps().visible).toBe(false);
  });

  it('al editar uno existente no cambia la selección', async () => {
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getAllByTestId('icon-pencil-outline')[1]);
    await act(async () => sheetProps().onSuccess(2));
    expect(mockSetSelected).not.toHaveBeenCalled();
    expect(sheetProps().visible).toBe(false);
  });

  it('onSuccess sin id no selecciona nada', async () => {
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Agregar lugar de trabajo'));
    await act(async () => sheetProps().onSuccess(undefined));
    expect(mockSetSelected).not.toHaveBeenCalled();
  });
});

describe('RecommendScreen autenticado: resultados', () => {
  it('pide las recomendaciones del workplace seleccionado', async () => {
    authState({ selected: 2 });
    await render(<RecommendScreen />);
    expect(mockLatest).toHaveBeenCalledWith(2);
  });

  it('mientras carga la caché muestra el análisis y oculta resultados', async () => {
    authState({ loadingCached: true });
    await render(<RecommendScreen />);
    expect(screen.getByText('Analizando viviendas...')).toBeTruthy();
    expect(screen.queryByText('#1')).toBeNull();
  });

  it('mientras se genera (desde cualquier componente) muestra el análisis', async () => {
    counts.auth = 1;
    await render(<RecommendScreen />);
    expect(screen.getByText('Analizando viviendas...')).toBeTruthy();
    expect(screen.queryByText('#1')).toBeNull();
  });

  it('una generación de invitado no afecta al flujo autenticado', async () => {
    counts.guest = 1;
    await render(<RecommendScreen />);
    expect(screen.queryByText('Analizando viviendas...')).toBeNull();
  });

  it('muestra el conteo en singular', async () => {
    await render(<RecommendScreen />);
    expect(screen.getByText('1 vivienda recomendada')).toBeTruthy();
  });

  it('muestra el conteo en plural y el ranking en orden', async () => {
    authState({ latest: { results: [rec('a'), rec('b')], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    expect(screen.getByText('2 viviendas recomendadas')).toBeTruthy();
    expect(screen.getByText('#1')).toBeTruthy();
    expect(screen.getByText('#2')).toBeTruthy();
  });

  it('muestra precio, distrito y tiempo estimado', async () => {
    await render(<RecommendScreen />);
    expect(screen.getByText(new RegExp(formatPrice(1500, 'PEN').replace('/', '\\/')))).toBeTruthy();
    expect(screen.getByText('Distrito a')).toBeTruthy();
    expect(screen.getByText('~25 min al trabajo')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('con tiempo ahorrado positivo muestra "Ahorras N min"', async () => {
    authState({ latest: { results: [rec('a', { time_saved_mins: 12 })], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    expect(screen.getByText('Ahorras 12 min')).toBeTruthy();
    expect(screen.getByTestId('icon-trending-down')).toBeTruthy();
  });

  it('con tiempo ahorrado negativo muestra "N min más" en valor absoluto', async () => {
    authState({ latest: { results: [rec('a', { time_saved_mins: -7 })], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    expect(screen.getByText('7 min más')).toBeTruthy();
    expect(screen.getByTestId('icon-trending-up')).toBeTruthy();
  });

  it.each([[0], [null]])('con tiempo ahorrado %s no muestra la insignia', async (v) => {
    authState({ latest: { results: [rec('a', { time_saved_mins: v })], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    expect(screen.queryByTestId('icon-trending-down')).toBeNull();
    expect(screen.queryByTestId('icon-trending-up')).toBeNull();
  });

  it('con franjas muestra las tres horas con minutos redondeados', async () => {
    const franjas = { punta_manana: 30.4, valle: 20.5, punta_tarde: 41.2 };
    authState({ latest: { results: [rec('a', { franjas })], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    expect(screen.getByText('7am')).toBeTruthy();
    expect(screen.getByText('1pm')).toBeTruthy();
    expect(screen.getByText('6pm')).toBeTruthy();
    expect(screen.getByText('30m')).toBeTruthy();
    expect(screen.getByText('21m')).toBeTruthy();
    expect(screen.getByText('41m')).toBeTruthy();
  });

  it('sin franjas no muestra la fila de horas', async () => {
    await render(<RecommendScreen />);
    expect(screen.queryByText('7am')).toBeNull();
  });

  it('pulsar la tarjeta abre el detalle con la vivienda y los datos de la recomendación', async () => {
    const franjas = { punta_manana: 30, valle: 20, punta_tarde: 40 };
    const item = rec('a', { time_saved_mins: 5, franjas });
    authState({ latest: { results: [item], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Distrito a'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/housing-detail',
      params: {
        id: 'a',
        data: JSON.stringify(item.property),
        reco: JSON.stringify({ predicted_time_min: 25, time_saved_mins: 5, franjas }),
      },
    });
  });

  it('pulsar el anillo abre el análisis con la recomendación completa', async () => {
    const item = rec('a');
    authState({ latest: { results: [item], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Ver análisis'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/recommendation-insight',
      params: { data: JSON.stringify(item) },
    });
  });
});

describe('RecommendScreen autenticado: actualizar', () => {
  it('Actualizar resultados pide confirmación y no genera hasta aceptarla', async () => {
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Actualizar resultados'));
    expect(alertCalls()[0][0]).toBe('Actualizar recomendaciones');
    expect(generateMutate).not.toHaveBeenCalled();
  });

  it('al confirmar genera para el workplace seleccionado', async () => {
    authState({ selected: 2 });
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Actualizar resultados'));
    alertCalls()[0][2].find((b: any) => b.text === 'Actualizar').onPress();
    expect(generateMutate).toHaveBeenCalledWith({ workplaceId: 2 });
  });

  it('Cancelar no genera', async () => {
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Actualizar resultados'));
    expect(alertCalls()[0][2].find((b: any) => b.text === 'Cancelar').onPress).toBeUndefined();
    expect(generateMutate).not.toHaveBeenCalled();
  });

  it('el botón se deshabilita mientras hay una generación en curso', async () => {
    authState({ gen: { isPending: true } });
    await render(<RecommendScreen />);
    expect(screen.getByText('Actualizar resultados')).toBeDisabled();
  });

  it('sin workplace seleccionado no ofrece actualizar', async () => {
    authState({ selected: null, workplaces: [] });
    await render(<RecommendScreen />);
    expect(screen.queryByText('Actualizar resultados')).toBeNull();
  });
});

describe('RecommendScreen autenticado: sin resultados', () => {
  const empty = (over: Record<string, any> = {}) => ({ results: [], message: null, min_price_in_area: null, ...over });

  it('con historial vacío muestra el texto por defecto y no ofrece generar', async () => {
    authState({ latest: empty() });
    await render(<RecommendScreen />);
    expect(screen.getByText('Sin recomendaciones guardadas')).toBeTruthy();
    expect(screen.queryByText('Generar recomendaciones')).toBeNull();
  });

  it('mientras no hay datos (undefined) no ofrece generar, solo el estado vacío', async () => {
    authState({ latest: NO_DATA });
    await render(<RecommendScreen />);
    expect(screen.getByText('Sin recomendaciones guardadas')).toBeTruthy();
    expect(screen.queryByText('Generar recomendaciones')).toBeNull();
  });

  it('prefiere el mensaje del servidor guardado', async () => {
    authState({ latest: empty({ message: 'Presupuesto insuficiente' }) });
    await render(<RecommendScreen />);
    expect(screen.getByText('Presupuesto insuficiente')).toBeTruthy();
  });

  it('prefiere el mensaje de la última generación sobre el guardado', async () => {
    authState({
      latest: empty({ message: 'Antiguo' }),
      gen: { data: { message: 'Nuevo', min_price_in_area: null } },
    });
    await render(<RecommendScreen />);
    expect(screen.getByText('Nuevo')).toBeTruthy();
    expect(screen.queryByText('Antiguo')).toBeNull();
  });

  it('muestra el precio mínimo de la zona', async () => {
    authState({ latest: empty({ min_price_in_area: 1800 }) });
    await render(<RecommendScreen />);
    expect(screen.getByText(new RegExp('Las más económicas en la zona parten desde'))).toBeTruthy();
    expect(screen.getByText(`S/ ${(1800).toLocaleString('es-PE')}`)).toBeTruthy();
  });

  it('el precio mínimo de la generación tiene prioridad', async () => {
    authState({
      latest: empty({ min_price_in_area: 1800 }),
      gen: { data: { message: null, min_price_in_area: 900 } },
    });
    await render(<RecommendScreen />);
    expect(screen.getByText(`S/ ${(900).toLocaleString('es-PE')}`)).toBeTruthy();
  });

  it('un precio mínimo de 0 también se muestra', async () => {
    authState({ latest: empty({ min_price_in_area: 0 }) });
    await render(<RecommendScreen />);
    expect(screen.getByText('S/ 0')).toBeTruthy();
  });

  it('sin historial (null) ofrece generar y lanza la generación', async () => {
    authState({ latest: null });
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Generar recomendaciones'));
    expect(generateMutate).toHaveBeenCalledWith({ workplaceId: 1 });
  });

  it('Cambiar preferencias abre la hoja con el workplace seleccionado', async () => {
    authState({ latest: empty(), selected: 2 });
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Cambiar preferencias'));
    expect(sheetProps().visible).toBe(true);
    expect(sheetProps().workplace).toEqual(wp2);
  });

  it('no muestra el vacío sin workplace seleccionado', async () => {
    authState({ latest: empty(), selected: null, workplaces: [] });
    await render(<RecommendScreen />);
    expect(screen.queryByText('Sin recomendaciones guardadas')).toBeNull();
  });

  it('no muestra el vacío mientras carga la caché', async () => {
    authState({ latest: empty(), loadingCached: true });
    await render(<RecommendScreen />);
    expect(screen.queryByText('Sin recomendaciones guardadas')).toBeNull();
  });
});

describe('RecommendScreen invitado', () => {
  it('no consulta workplaces', async () => {
    guestState();
    await render(<RecommendScreen />);
    expect(mockUseWorkplaces).toHaveBeenCalledWith(false);
  });

  it('sin búsqueda configurada invita a configurarla y abre el asistente', async () => {
    guestState({ workplace: null as any });
    await render(<RecommendScreen />);
    expect(screen.getByText(/Configura tu trabajo y presupuesto/)).toBeTruthy();
    expect(setupProps().visible).toBe(false);
    await fireEvent.press(screen.getByText('Configurar búsqueda'));
    expect(setupProps().visible).toBe(true);
  });

  it('el asistente se cierra con onClose', async () => {
    guestState({ workplace: null as any });
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Configurar búsqueda'));
    await act(async () => setupProps().onClose());
    expect(setupProps().visible).toBe(false);
  });

  it('con búsqueda muestra trabajo (primer tramo de la dirección), presupuesto y modo', async () => {
    guestState();
    await render(<RecommendScreen />);
    expect(screen.getByText('Av. Arequipa 123')).toBeTruthy();
    expect(screen.getByText(formatPrice(2000, 'PEN'))).toBeTruthy();
    expect(screen.getByText('Auto')).toBeTruthy();
  });

  it('muestra la etiqueta del modo de transporte configurado', async () => {
    guestState({ workplace: { ...guestWp, transport: 'walking' } });
    await render(<RecommendScreen />);
    expect(screen.getByText('A pie')).toBeTruthy();
  });

  it('Editar abre el asistente', async () => {
    guestState();
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getByText('Editar'));
    expect(setupProps().visible).toBe(true);
  });

  it('sin recomendaciones previas el botón dice "Generar recomendaciones"', async () => {
    guestState({ recs: null });
    await render(<RecommendScreen />);
    expect(screen.getByText('Generar recomendaciones')).toBeTruthy();
  });

  it('con recomendaciones previas el botón dice "Actualizar resultados"', async () => {
    guestState({ recs: { results: [rec('g')], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    expect(screen.getAllByText('Actualizar resultados')).toHaveLength(1);
  });

  it('generar por primera vez llama al motor con la configuración y guarda el resultado, sin confirmar', async () => {
    guestState({ recs: null });
    await render(<RecommendScreen />);
    await act(async () => {
      fireEvent.press(screen.getByText('Generar recomendaciones'));
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(guestMutateAsync).toHaveBeenCalledWith({
      work_lat: -12.1,
      work_lon: -77.0,
      budget: 2000,
      preferred_transportation: 'driving',
      max_distance_km: 8,
      home_lat: -12.2,
      home_lon: -77.1,
    });
    expect(saveGuestRecommendations).toHaveBeenCalledWith([rec('g')]);
  });

  it('sin casa de invitado envía home_lat y home_lon indefinidos', async () => {
    guestState({ recs: null, home: null as any });
    await render(<RecommendScreen />);
    await act(async () => {
      fireEvent.press(screen.getByText('Generar recomendaciones'));
    });
    const arg = guestMutateAsync.mock.calls[0][0];
    expect(arg.home_lat).toBeUndefined();
    expect(arg.home_lon).toBeUndefined();
  });

  it('con resultados previos pide confirmación y solo ejecuta al aceptar', async () => {
    guestState({ recs: { results: [rec('g')], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getAllByText('Actualizar resultados')[0]);
    expect(alertCalls()[0][0]).toBe('Actualizar recomendaciones');
    expect(guestMutateAsync).not.toHaveBeenCalled();
    await act(async () => {
      await alertCalls()[0][2].find((b: any) => b.text === 'Actualizar').onPress();
    });
    expect(guestMutateAsync).toHaveBeenCalledTimes(1);
    expect(saveGuestRecommendations).toHaveBeenCalledTimes(1);
  });

  it('con resultados previos vacíos no pide confirmación', async () => {
    guestState({ recs: { results: [], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    await act(async () => {
      fireEvent.press(screen.getByText('Actualizar resultados'));
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(guestMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('mientras genera el botón está deshabilitado, sin etiqueta, y se ve el análisis', async () => {
    counts.guest = 1;
    guestState({ recs: null });
    await render(<RecommendScreen />);
    expect(screen.queryByText('Generar recomendaciones')).toBeNull();
    expect(screen.getByText('Analizando viviendas...')).toBeTruthy();
  });

  it('mientras genera, pulsar el botón no lanza otra generación', async () => {
    counts.guest = 1;
    guestState({ recs: null });
    await render(<RecommendScreen />);
    await fireEvent.press(screen.getAllByTestId('spinner')[0]);
    expect(guestMutateAsync).not.toHaveBeenCalled();
  });

  it('el icono del botón cambia a "refresh" cuando ya hay recomendaciones', async () => {
    guestState({ recs: { results: [rec('g')], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    expect(screen.getByTestId('icon-refresh')).toBeTruthy();
  });

  it('el invitado no autoselecciona workplaces ni ve el botón de actualizar de autenticado', async () => {
    guestState({ recs: { results: [rec('g')], message: null, min_price_in_area: null } });
    mockUseWorkplaces.mockReturnValue({ data: [wp1], isLoading: false });
    mockSelected.mockReturnValue({ selectedWorkplaceId: 99, setSelectedWorkplaceId: mockSetSelected });
    await render(<RecommendScreen />);
    expect(mockSetSelected).not.toHaveBeenCalled();
    expect(screen.queryByTestId('icon-refresh-outline')).toBeNull();
  });

  it('una generación autenticada no afecta al invitado', async () => {
    counts.auth = 1;
    guestState({ recs: null });
    await render(<RecommendScreen />);
    expect(screen.queryByText('Analizando viviendas...')).toBeNull();
  });

  it('lista las recomendaciones del invitado sin botón de actualizar de autenticado', async () => {
    guestState({ recs: { results: [rec('g1'), rec('g2')], message: null, min_price_in_area: null } });
    await render(<RecommendScreen />);
    expect(screen.getByText('2 viviendas recomendadas')).toBeTruthy();
    expect(screen.getAllByText('Actualizar resultados')).toHaveLength(1);
  });

  describe('sin resultados', () => {
    const emptyRecs = (over: Record<string, any> = {}) => ({ results: [], message: null, min_price_in_area: null, ...over });

    it('muestra el texto por defecto en el aviso en línea y en el vacío inferior', async () => {
      guestState({ recs: emptyRecs() });
      await render(<RecommendScreen />);
      expect(screen.getAllByText('No encontramos viviendas con esos criterios.')).toHaveLength(2);
    });

    it('usa el mensaje del servidor', async () => {
      guestState({ recs: emptyRecs({ message: 'Sube tu presupuesto' }) });
      await render(<RecommendScreen />);
      expect(screen.getAllByText('Sube tu presupuesto')).toHaveLength(2);
    });

    it('muestra el precio mínimo cuando existe', async () => {
      guestState({ recs: emptyRecs({ min_price_in_area: 2500 }) });
      await render(<RecommendScreen />);
      expect(screen.getAllByText(`S/ ${(2500).toLocaleString('es-PE')}`)).toHaveLength(2);
    });

    it('sin precio mínimo no muestra la pista', async () => {
      guestState({ recs: emptyRecs() });
      await render(<RecommendScreen />);
      expect(screen.queryByText(/parten desde/)).toBeNull();
    });

    it('Cambiar configuración abre el asistente', async () => {
      guestState({ recs: emptyRecs() });
      await render(<RecommendScreen />);
      await fireEvent.press(screen.getAllByText('Cambiar configuración')[0]);
      expect(setupProps().visible).toBe(true);
    });

    it('sin haber generado nunca (null) no hay avisos de vacío', async () => {
      guestState({ recs: null });
      await render(<RecommendScreen />);
      expect(screen.queryByText('Cambiar configuración')).toBeNull();
    });

    it('mientras genera no muestra el vacío', async () => {
      counts.guest = 1;
      guestState({ recs: emptyRecs() });
      await render(<RecommendScreen />);
      expect(screen.queryByText('Cambiar configuración')).toBeNull();
    });
  });
});

describe('RecommendScreen transporte heredado', () => {
  it('una búsqueda de invitado guardada con la etiqueta antigua "Auto" no rompe la pantalla', async () => {
    guestState({ workplace: { ...guestWp, transport: 'Auto' as any } });
    await render(<RecommendScreen />);
    expect(screen.getByText('Auto')).toBeTruthy();
  });
});

describe('RecommendScreen invitado y recomendaciones guardadas', () => {
  it('un invitado no consulta las últimas recomendaciones aunque quede un trabajo seleccionado de una sesión anterior', async () => {
    guestState();
    mockSelected.mockReturnValue({ selectedWorkplaceId: 7, setSelectedWorkplaceId: mockSetSelected });
    await render(<RecommendScreen />);
    expect(mockLatest).not.toHaveBeenCalledWith(7);
    expect(mockLatest).toHaveBeenCalledWith(null);
  });
});


describe('Paginación de recomendaciones', () => {
  it.each([true, false])('muestra bloques de diez y conserva el ranking (sesión: %s)', async (authenticated) => {
    const results = Array.from({ length: 25 }, (_, i) => rec(String(i + 1)));
    const ranking = { results, message: null, min_price_in_area: null };
    if (authenticated) authState({ latest: ranking });
    else guestState({ recs: ranking });
    const view = await render(<RecommendScreen />);
    const ranks = () => screen.getAllByTestId(/^recommend-insight-/);
    expect(ranks()).toHaveLength(10);
    expect(screen.getByText('#10')).toBeTruthy();
    expect(screen.queryByText('#11')).toBeNull();
    await fireEvent.press(screen.getByTestId('end-reached'));
    expect(ranks()).toHaveLength(20);
    expect(screen.getByText('#20')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('end-reached'));
    expect(ranks()).toHaveLength(25);
    await fireEvent.press(screen.getByTestId('end-reached'));
    expect(ranks()).toHaveLength(25);
    expect(generateMutate).not.toHaveBeenCalled();
    expect(guestMutateAsync).not.toHaveBeenCalled();

    const updated = { ...ranking, results: results.slice().reverse() };
    if (authenticated) authState({ latest: updated });
    else guestState({ recs: updated });
    await view.rerender(<RecommendScreen />);
    expect(ranks()).toHaveLength(10);
    expect(screen.getByText('Distrito 25')).toBeTruthy();
    expect(screen.queryByText('Distrito 1')).toBeNull();
  });

  it('reinicia la página al cambiar de lugar de trabajo', async () => {
    const ranking = { results: Array.from({ length: 30 }, (_, i) => rec(String(i))), message: null, min_price_in_area: null };
    authState({ latest: ranking });
    const view = await render(<RecommendScreen />);
    await fireEvent.press(screen.getByTestId('end-reached'));
    expect(screen.getAllByTestId(/^recommend-insight-/)).toHaveLength(20);
    authState({ latest: ranking, selected: 2 });
    await view.rerender(<RecommendScreen />);
    expect(screen.getAllByTestId(/^recommend-insight-/)).toHaveLength(10);
    authState({ latest: ranking, selected: 1 });
    await view.rerender(<RecommendScreen />);
    expect(screen.getAllByTestId(/^recommend-insight-/)).toHaveLength(10);
  });
});
