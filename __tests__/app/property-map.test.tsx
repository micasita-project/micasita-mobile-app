import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import PropertyMapScreen from '@/app/property-map';
import { router, routeState, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}));
jest.mock('@/shared/ui/map', () => require('@/__tests__/_helpers/app/map').mapModule);

beforeEach(resetRouter);

describe('PropertyMapScreen', () => {
  it('centra el mapa en las coordenadas recibidas por parámetros', async () => {
    routeState.params = { lat: '-12.1', lon: '-77.03', title: 'Depa Miraflores' };
    await render(<PropertyMapScreen />);
    const region = screen.getByTestId('map').props.initialRegion;
    expect(region).toMatchObject({ latitude: -12.1, longitude: -77.03 });
  });

  it('pone un único marcador con el título de la vivienda', async () => {
    routeState.params = { lat: '-12.1', lon: '-77.03', title: 'Depa Miraflores' };
    await render(<PropertyMapScreen />);
    const marker = screen.getByTestId('marker-Depa Miraflores');
    expect(marker.props.coordinate).toEqual({ latitude: -12.1, longitude: -77.03 });
  });

  it('con título lo muestra también en la barra superior', async () => {
    routeState.params = { lat: '-12.1', lon: '-77.03', title: 'Depa Miraflores' };
    await render(<PropertyMapScreen />);
    expect(screen.getAllByText('Depa Miraflores')).toHaveLength(2);
  });

  it('sin título usa "Vivienda" y no muestra la barra de título', async () => {
    routeState.params = { lat: '-12.1', lon: '-77.03' };
    await render(<PropertyMapScreen />);
    expect(screen.getByTestId('marker-Vivienda')).toBeTruthy();
    expect(screen.getAllByText('Vivienda')).toHaveLength(1);
  });

  it('el botón de retroceso vuelve atrás', async () => {
    routeState.params = { lat: '-12.1', lon: '-77.03' };
    await render(<PropertyMapScreen />);
    await fireEvent.press(screen.getByTestId('icon-arrow-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
