import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import RecommendationInsightScreen from '@/app/recommendation-insight';
import { router, routeState, resetRouter } from '@/__tests__/_helpers/app/expoRouter';
import { makeHousing } from '@/__tests__/_helpers/app/housingCard';

const mockAuth = jest.fn();
const mockGuest = jest.fn();
const mockWorkplaces = jest.fn();
const mockPreferences = jest.fn();
const mockSelected = jest.fn();
const mockFetchFranja = jest.fn();
const mockFetchModeRoute = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}));
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Circle: () => null }));
jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () =>
  require('@/__tests__/_helpers/app/rnPieces').activityIndicatorModule,
);
jest.mock('@/entities/route', () => ({
  fetchModeRoute: (...a: any[]) => mockFetchModeRoute(...a),
  formatDistance: (km: number) => `${km} km`,
  fetchTimeByFranja: (...a: any[]) => mockFetchFranja(...a),
  formatTravelTime: (m: number) => `${m}min`,
}));
jest.mock('@/entities/recommendation-preferences', () => ({ usePreferences: (id: any) => mockPreferences(id) }));
jest.mock('@/entities/workplace/model/useWorkplaces', () => ({ useWorkplaces: (e: any) => mockWorkplaces(e) }));
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/features/guest', () => ({ useGuest: () => mockGuest() }));
jest.mock('@/shared/model/SelectedWorkplaceContext', () => ({ useSelectedWorkplace: () => mockSelected() }));
jest.mock('@/features/recommendation/model/recommendationMessage', () => ({
  scoreLabel: (s: number) => `Etiqueta ${s}`,
  buildInsightTitle: () => 'Título IA',
  buildInsightBody: () => 'Cuerpo IA',
}));

const property = makeHousing({
  id: 'h1',
  address: 'Av. Larco 123',
  district: 'Miraflores',
  price: 1500,
  currency: 'USD',
  bedrooms: 2,
  bathrooms: 1,
  total_area_sqm: 70,
  images: ['a.jpg'],
});
const franjas = { punta_manana: 40.4, valle: 20, punta_tarde: 50.6 };
const wp = { id: 7, work_lat: -12.05, work_lon: -77.04, work_address: 'Oficina' };

function item(over: Record<string, any> = {}, propOver: Record<string, any> = {}) {
  return {
    property: { ...property, ...propOver },
    match_score: 85,
    predicted_time_min: 20,
    time_saved_mins: 10,
    franjas: null,
    ...over,
  };
}
const setItem = (it: any) => {
  routeState.params = { data: JSON.stringify(it) };
};

beforeEach(() => {
  resetRouter();
  mockAuth.mockReturnValue({ user: { id: 1 } });
  mockGuest.mockReturnValue({ guestWorkplace: null });
  mockWorkplaces.mockReturnValue({ data: [wp] });
  mockPreferences.mockReturnValue({ data: [{ preferred_transportation: 'driving' }] });
  mockSelected.mockReturnValue({ selectedWorkplaceId: null });
  mockFetchFranja.mockResolvedValue(franjas);
  mockFetchModeRoute.mockResolvedValue({ distanceKm: 3.5 });
  setItem(item());
});

async function setup() {
  const utils = await render(<RecommendationInsightScreen />);
  await act(async () => {});
  return utils;
}

describe('RecommendationInsightScreen datos', () => {
  it('sin datos no pinta nada', async () => {
    routeState.params = {};
    await setup();
    expect(screen.queryByText('Análisis IA')).toBeNull();
  });

  it('con JSON inválido no pinta nada ni lanza', async () => {
    routeState.params = { data: '{roto' };
    await setup();
    expect(screen.queryByText('Análisis IA')).toBeNull();
  });

  it('muestra el encabezado, puntuación, etiqueta, título y cuerpo', async () => {
    await setup();
    expect(screen.getByText('Análisis IA')).toBeTruthy();
    expect(screen.getByText('Etiqueta 85')).toBeTruthy();
    expect(screen.getByText('Título IA')).toBeTruthy();
    expect(screen.getByText('Cuerpo IA')).toBeTruthy();
  });

  it('muestra distrito, dirección y precio de la vivienda', async () => {
    await setup();
    expect(screen.getByText('Miraflores')).toBeTruthy();
    expect(screen.getByText('Av. Larco 123')).toBeTruthy();
    expect(screen.getAllByText(/USD 1,500|USD 1.500/).length).toBeGreaterThan(0);
  });

  it('el botón de retroceso vuelve atrás', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('icon-arrow-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('sin imagen muestra el icono de casa', async () => {
    setItem(item({}, { images: [] }));
    await setup();
    expect(screen.getByTestId('icon-home-outline')).toBeTruthy();
  });
});

describe('RecommendationInsightScreen métricas', () => {
  it('redondea el tiempo al trabajo', async () => {
    setItem(item({ predicted_time_min: 19.6 }));
    await setup();
    expect(screen.getByText('20min')).toBeTruthy();
  });

  it('con ahorro positivo muestra "Ahorras vs tu hogar" y "menos"', async () => {
    setItem(item({ time_saved_mins: 9.6 }));
    await setup();
    expect(screen.getByText('Ahorras vs tu hogar')).toBeTruthy();
    expect(screen.getByText('10min menos')).toBeTruthy();
    expect(screen.getByTestId('icon-trending-down')).toBeTruthy();
  });

  it('con ahorro 0 cuenta como ahorro', async () => {
    setItem(item({ time_saved_mins: 0 }));
    await setup();
    expect(screen.getByText('Ahorras vs tu hogar')).toBeTruthy();
    expect(screen.getByTestId('icon-trending-down')).toBeTruthy();
  });

  it('con ahorro negativo muestra "Tiempo adicional" con valor absoluto y "más"', async () => {
    setItem(item({ time_saved_mins: -7.2 }));
    await setup();
    expect(screen.getByText('Tiempo adicional')).toBeTruthy();
    expect(screen.getByText('7min más')).toBeTruthy();
    expect(screen.getByTestId('icon-trending-up')).toBeTruthy();
  });

  it('con ahorro null oculta la métrica', async () => {
    setItem(item({ time_saved_mins: null }));
    await setup();
    expect(screen.queryByText('Ahorras vs tu hogar')).toBeNull();
    expect(screen.queryByText('Tiempo adicional')).toBeNull();
  });

  it('con ahorro no finito oculta la métrica', async () => {
    routeState.params = { data: JSON.stringify(item()).replace('"time_saved_mins":10', '"time_saved_mins":1e999') };
    await setup();
    expect(screen.queryByText('Ahorras vs tu hogar')).toBeNull();
    expect(screen.queryByText('Tiempo adicional')).toBeNull();
  });

  it('muestra precio, habitaciones, baños y área cuando son positivos', async () => {
    await setup();
    expect(screen.getByText('Precio mensual')).toBeTruthy();
    expect(screen.getByText('Habitaciones')).toBeTruthy();
    expect(screen.getByText('Baños')).toBeTruthy();
    expect(screen.getByText('70 m²')).toBeTruthy();
  });

  it('oculta las métricas con valor 0 o ausente', async () => {
    setItem(item({}, { price: 0, bedrooms: 0, bathrooms: undefined, total_area_sqm: 0 }));
    await setup();
    expect(screen.queryByText('Precio mensual')).toBeNull();
    expect(screen.queryByText('Habitaciones')).toBeNull();
    expect(screen.queryByText('Baños')).toBeNull();
    expect(screen.queryByText('Área total')).toBeNull();
  });
});

describe('RecommendationInsightScreen franjas horarias', () => {
  it('en auto con ruta de trabajo pide las franjas origen trabajo, destino vivienda', async () => {
    await setup();
    expect(mockFetchFranja).toHaveBeenCalledWith(
      { latitude: wp.work_lat, longitude: wp.work_lon },
      { latitude: property.latitude, longitude: property.longitude },
      'driving',
    );
  });

  it('muestra las tres franjas redondeadas', async () => {
    await setup();
    expect(screen.getByText('¿Cómo cambia el tiempo según la hora?')).toBeTruthy();
    expect(screen.getByText('40 min')).toBeTruthy();
    expect(screen.getByText('20 min')).toBeTruthy();
    expect(screen.getByText('51 min')).toBeTruthy();
    expect(screen.getByText('7:00 a.m.')).toBeTruthy();
    expect(screen.getByText('Tráfico bajo')).toBeTruthy();
  });

  it('mientras cargan muestra el indicador', async () => {
    mockFetchFranja.mockReturnValue(new Promise(() => {}));
    await setup();
    expect(screen.getByTestId('spinner')).toBeTruthy();
    expect(screen.queryByText('40 min')).toBeNull();
  });

  it('si el modo pasa de auto a otro, las franjas ya cargadas se ocultan', async () => {
    const { rerender } = await setup();
    expect(screen.getByText('40 min')).toBeTruthy();
    mockPreferences.mockReturnValue({ data: [{ preferred_transportation: 'cycling' }] });
    await rerender(<RecommendationInsightScreen />);
    expect(screen.queryByText('¿Cómo cambia el tiempo según la hora?')).toBeNull();
  });

  it('al recalcular por otro trabajo mantiene las franjas visibles en lugar del indicador', async () => {
    const { rerender } = await setup();
    mockFetchFranja.mockReturnValue(new Promise(() => {}));
    mockWorkplaces.mockReturnValue({ data: [{ ...wp, work_lat: -12.9 }] });
    await rerender(<RecommendationInsightScreen />);
    await act(async () => {});
    expect(screen.queryByTestId('spinner')).toBeNull();
    expect(screen.getByText('40 min')).toBeTruthy();
  });

  it('en bicicleta no pide ni muestra franjas', async () => {
    mockPreferences.mockReturnValue({ data: [{ preferred_transportation: 'cycling' }] });
    await setup();
    expect(mockFetchFranja).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Cómo cambia el tiempo según la hora?')).toBeNull();
  });

  it('sin coordenadas de trabajo no las pide', async () => {
    mockWorkplaces.mockReturnValue({ data: [] });
    await setup();
    expect(mockFetchFranja).not.toHaveBeenCalled();
    expect(screen.queryByText('¿Cómo cambia el tiempo según la hora?')).toBeNull();
  });

  it('un invitado usa su trabajo local y modo (Auto normalizado a driving)', async () => {
    mockAuth.mockReturnValue({ user: null });
    mockWorkplaces.mockReturnValue({ data: [] });
    mockGuest.mockReturnValue({ guestWorkplace: { lat: -12.3, lon: -77.2, transport: 'Auto', address: 'x' } });
    await setup();
    expect(mockPreferences).toHaveBeenCalledWith(null);
    expect(mockFetchFranja).toHaveBeenCalledWith({ latitude: -12.3, longitude: -77.2 }, expect.anything(), 'driving');
  });

  it('un invitado caminando no pide franjas', async () => {
    mockAuth.mockReturnValue({ user: null });
    mockWorkplaces.mockReturnValue({ data: [] });
    mockGuest.mockReturnValue({ guestWorkplace: { lat: -12.3, lon: -77.2, transport: 'Caminando', address: 'x' } });
    await setup();
    expect(mockFetchFranja).not.toHaveBeenCalled();
  });

  it('usa el workplace seleccionado para las coordenadas y las preferencias', async () => {
    const wp2 = { id: 9, work_lat: -12.2, work_lon: -77.1, work_address: 'Sede' };
    mockWorkplaces.mockReturnValue({ data: [wp, wp2] });
    mockSelected.mockReturnValue({ selectedWorkplaceId: 9 });
    await setup();
    expect(mockPreferences).toHaveBeenCalledWith(9);
    expect(mockFetchFranja.mock.calls[0][0]).toEqual({ latitude: -12.2, longitude: -77.1 });
  });
});

describe('RecommendationInsightScreen acción', () => {
  it('Ver propiedad completa abre el detalle con vivienda y tiempos de la recomendación', async () => {
    const it0 = item({ franjas });
    setItem(it0);
    await setup();
    await fireEvent.press(screen.getByText('Ver propiedad completa'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/housing-detail',
      params: {
        id: 'h1',
        data: JSON.stringify(it0.property),
        reco: JSON.stringify({ predicted_time_min: 20, time_saved_mins: 10, franjas }),
      },
    });
  });
});

it('muestra la distancia de la ruta al trabajo en las variables del análisis', async () => {
  await setup();
  expect(screen.getByText('Distancia al trabajo')).toBeTruthy();
  expect(screen.getByText('3.5 km')).toBeTruthy();
  expect(mockFetchModeRoute).toHaveBeenCalledWith(
    { latitude: wp.work_lat, longitude: wp.work_lon },
    { latitude: property.latitude, longitude: property.longitude },
    'driving',
  );
});
