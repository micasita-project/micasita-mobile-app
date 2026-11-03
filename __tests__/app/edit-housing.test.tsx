import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import EditHousingScreen from '@/app/edit-housing';
import { router, routeState, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

const mockWizard = jest.fn((_props: any) => null);
jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('@/features/publish-housing', () => ({
  PublishWizard: (props: any) => {
    mockWizard(props);
    const { Text } = require('react-native');
    return <Text testID="wizard">wizard</Text>;
  },
}));

const listing = {
  id: 'p-9',
  status: 'approved',
  address: 'Av. Larco 123',
  district: 'Miraflores',
  latitude: -12.1,
  longitude: -77.03,
  title: 'Depa',
  property_type: 'apartment',
  currency: 'USD',
  price: 900,
  total_area_sqm: 60,
  covered_area_sqm: null,
  bedrooms: 2,
  bathrooms: 1,
  parking: null,
  antiquity: null,
  description: 'Bonito',
  images: ['file://a.jpg'],
  features: ['balcon'],
  phone: null,
};

beforeEach(() => {
  resetRouter();
  mockWizard.mockClear();
});

describe('EditHousingScreen', () => {
  it('sin datos muestra el estado de carga y no abre el asistente', async () => {
    await render(<EditHousingScreen />);
    expect(screen.getByText('Cargando datos de la propiedad...')).toBeTruthy();
    expect(mockWizard).not.toHaveBeenCalled();
  });

  it('con JSON inválido se queda cargando y avisa por consola sin lanzar', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    routeState.params = { data: '{no es json' };
    await render(<EditHousingScreen />);
    expect(screen.getByText('Cargando datos de la propiedad...')).toBeTruthy();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('con una publicación pendiente bloquea la edición y permite volver', async () => {
    routeState.params = { data: JSON.stringify({ ...listing, status: 'pending' }) };
    await render(<EditHousingScreen />);
    expect(screen.getByText('Publicación en revisión')).toBeTruthy();
    expect(mockWizard).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Volver atrás'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('con una publicación aprobada abre el asistente con id y borrador', async () => {
    routeState.params = { data: JSON.stringify(listing) };
    await render(<EditHousingScreen />);
    expect(screen.getByTestId('wizard')).toBeTruthy();
    const props = mockWizard.mock.calls[0][0];
    expect(props.propertyId).toBe('p-9');
    expect(props.initialDraft).toMatchObject({
      address: 'Av. Larco 123',
      district: 'Miraflores',
      price: 900,
      localImageUris: ['file://a.jpg'],
      features: ['balcon'],
    });
  });

  it('rellena con valores por defecto los campos opcionales ausentes', async () => {
    routeState.params = { data: JSON.stringify(listing) };
    await render(<EditHousingScreen />);
    expect(mockWizard.mock.calls[0][0].initialDraft).toMatchObject({
      covered_area_sqm: 0,
      parking: 0,
      antiquity: 0,
      phone: '',
    });
  });

  it('una publicación en borrador o rechazada sí se puede editar', async () => {
    routeState.params = { data: JSON.stringify({ ...listing, status: 'rejected' }) };
    await render(<EditHousingScreen />);
    expect(screen.getByTestId('wizard')).toBeTruthy();
  });
});
