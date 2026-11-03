import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Step1Location } from '@/features/publish-housing/ui/Step1Location';
import {
  makeSuggestion,
  setNextSuggestion,
  resetNextSuggestion,
  mapHandle,
} from '@/__tests__/_helpers/features/mockFeatureUi';

jest.mock('@/shared/ui/AddressSearchInput', () => require('@/__tests__/_helpers/features/mockFeatureUi').addressSearchModule);
jest.mock('@/shared/ui/map', () => require('@/__tests__/_helpers/features/mockFeatureUi').mapModule);

const onChange = jest.fn();
const onOpenMapPicker = jest.fn();

const data = (over: Record<string, any> = {}) => ({
  address: '',
  district: '',
  latitude: -12.0464,
  longitude: -77.0428,
  ...over,
});

const setup = (over: Record<string, any> = {}) =>
  render(<Step1Location data={data(over)} onChange={onChange} onOpenMapPicker={onOpenMapPicker} />);

beforeEach(() => resetNextSuggestion());

describe('Step1Location', () => {
  it('pide la dirección exacta y ofrece elegir en el mapa', async () => {
    await setup();
    expect(screen.getByText('Elegir en el mapa')).toBeTruthy();
    expect(screen.getByPlaceholderText('Ej: Av. Caminos del Inca 1250, Piso 8')).toBeTruthy();
  });

  it('sin dirección no muestra el mapa de vista previa', async () => {
    await setup();
    expect(screen.queryByTestId('map')).toBeNull();
    expect(screen.queryByText('Ubicación en el Mapa')).toBeNull();
  });

  it('un espacio en blanco como dirección tampoco muestra el mapa', async () => {
    await setup({ address: '   ' });
    expect(screen.queryByTestId('map')).toBeNull();
  });

  it('con dirección muestra el mapa centrado en las coordenadas con su marcador', async () => {
    await setup({ address: 'Av. Perú 1', latitude: -12.1, longitude: -77.0 });
    expect(screen.getByText('Ubicación en el Mapa')).toBeTruthy();
    expect(screen.getByTestId('map').props.initialRegion).toEqual({
      latitude: -12.1,
      longitude: -77.0,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
    expect(screen.getByTestId('marker').props.coordinate).toEqual({ latitude: -12.1, longitude: -77.0 });
  });

  it('centra el mapa con animación en las coordenadas actuales', async () => {
    await setup({ address: 'Av. Perú 1', latitude: -12.1, longitude: -77.0 });
    expect(mapHandle.animateToRegion).toHaveBeenCalledWith(
      { latitude: -12.1, longitude: -77.0, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      1000,
    );
  });

  it('al cambiar las coordenadas vuelve a centrar el mapa', async () => {
    const view = await setup({ address: 'Av. Perú 1', latitude: -12.1, longitude: -77.0 });
    mapHandle.animateToRegion.mockClear();
    await view.rerender(
      <Step1Location
        data={data({ address: 'Av. Perú 1', latitude: -12.2, longitude: -77.1 })}
        onChange={onChange}
        onOpenMapPicker={onOpenMapPicker}
      />,
    );
    expect(mapHandle.animateToRegion).toHaveBeenCalledWith(
      { latitude: -12.2, longitude: -77.1, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      1000,
    );
  });

  it('escribir actualiza solo la dirección', async () => {
    await setup();
    await fireEvent.changeText(screen.getByTestId('address-input'), 'Av. Perú');
    expect(onChange).toHaveBeenCalledWith({ address: 'Av. Perú' });
  });

  it('Elegir en el mapa abre el selector de mapa', async () => {
    await setup();
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    expect(onOpenMapPicker).toHaveBeenCalledTimes(1);
  });
});

describe('Step1Location selección de sugerencia', () => {
  it('usa el distrito que trae la sugerencia', async () => {
    await setup();
    setNextSuggestion(makeSuggestion({ display_name: 'Calle 1, Lima', district: 'Barranco', latitude: -12.14, longitude: -77.02 }));
    await fireEvent.press(screen.getByTestId('address-pick'));
    expect(onChange).toHaveBeenCalledWith({
      address: 'Calle 1, Lima',
      latitude: -12.14,
      longitude: -77.02,
      district: 'Barranco',
    });
  });

  it('sin distrito en la sugerencia lo deduce del nombre', async () => {
    await setup();
    setNextSuggestion(makeSuggestion({ display_name: 'Av. Larco 345, miraflores, Lima' }));
    await fireEvent.press(screen.getByTestId('address-pick'));
    expect(onChange.mock.calls[0][0].district).toBe('Miraflores');
  });

  it('si no reconoce ningún distrito usa Lima', async () => {
    await setup();
    setNextSuggestion(makeSuggestion({ display_name: 'Calle Sin Nombre 9, Perú' }));
    await fireEvent.press(screen.getByTestId('address-pick'));
    expect(onChange.mock.calls[0][0].district).toBe('Lima');
  });

  it('el distrito de la sugerencia tiene prioridad sobre el deducido', async () => {
    await setup();
    setNextSuggestion(makeSuggestion({ display_name: 'Av. Larco 345, Miraflores', district: 'Barranco' }));
    await fireEvent.press(screen.getByTestId('address-pick'));
    expect(onChange.mock.calls[0][0].district).toBe('Barranco');
  });

  it('no confunde "Mateo" con el distrito Ate al deducir el distrito', async () => {
    await setup();
    setNextSuggestion(makeSuggestion({ display_name: 'Av. Mateo Pumacahua 100, Santiago de Surco, Lima' }));
    await fireEvent.press(screen.getByTestId('address-pick'));
    expect(onChange.mock.calls[0][0].district).toBe('Santiago de Surco');
  });
});
