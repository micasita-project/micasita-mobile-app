import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import LoginScreen from '@/app/login';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
const mockLoginForm = jest.fn();
const mockGuest = {
  guestHome: { lat: -12.1, lon: -77.0, address: 'Jr. Lima 1' },
  guestWorkplace: null,
  guestRecommendations: null,
  clearGuestData: jest.fn(),
};
jest.mock('@/features/auth', () => ({
  LoginForm: (props: any) => {
    mockLoginForm(props);
    const { Text } = require('react-native');
    return <Text testID="login-form">LoginForm</Text>;
  },
}));
jest.mock('@/features/guest', () => ({
  useGuest: () => mockGuest,
  toGuestTransferData: jest.requireActual('@/features/guest/model/guestTransfer').toGuestTransferData,
}));

beforeEach(() => {
  resetRouter();
  mockLoginForm.mockClear();
});

describe('LoginScreen', () => {
  it('compone el formulario de login con el título de la app', async () => {
    await render(<LoginScreen />);
    expect(screen.getByTestId('login-form')).toBeTruthy();
    expect(screen.getByText('MiCasita')).toBeTruthy();
  });

  it('pasa al formulario los datos del invitado y la función para borrarlos', async () => {
    await render(<LoginScreen />);
    const props = mockLoginForm.mock.calls[0][0];
    expect(props.guestData).toEqual({
      home: { lat: -12.1, lon: -77.0, address: 'Jr. Lima 1' },
      workplace: undefined,
      recommendations: undefined,
    });
    expect(props.clearGuestData).toBe(mockGuest.clearGuestData);
  });

  it('muestra el botón Volver cuando hay historial y vuelve atrás al pulsarlo', async () => {
    router.canGoBack.mockReturnValue(true);
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByText('Volver'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('oculta el botón Volver cuando no hay a dónde volver', async () => {
    router.canGoBack.mockReturnValue(false);
    await render(<LoginScreen />);
    expect(screen.queryByText('Volver')).toBeNull();
    expect(screen.getByTestId('login-form')).toBeTruthy();
  });
});
