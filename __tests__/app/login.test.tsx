import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import LoginScreen from '@/app/login';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('@/features/auth', () => ({
  LoginForm: () => {
    const { Text } = require('react-native');
    return <Text testID="login-form">LoginForm</Text>;
  },
}));

beforeEach(resetRouter);

describe('LoginScreen', () => {
  it('compone el formulario de login con el título de la app', async () => {
    await render(<LoginScreen />);
    expect(screen.getByTestId('login-form')).toBeTruthy();
    expect(screen.getByText('MiCasita')).toBeTruthy();
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
