import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ForgotPasswordScreen from '@/app/forgot-password';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('@/features/auth/ui/ForgotPasswordForm', () => ({
  ForgotPasswordForm: () => {
    const { Text } = require('react-native');
    return <Text testID="forgot-form">ForgotPasswordForm</Text>;
  },
}));

beforeEach(resetRouter);

describe('ForgotPasswordScreen', () => {
  it('muestra el título y el formulario de recuperación', async () => {
    await render(<ForgotPasswordScreen />);
    expect(screen.getByText('Recuperar contraseña')).toBeTruthy();
    expect(screen.getByTestId('forgot-form')).toBeTruthy();
  });

  it('muestra Volver cuando hay historial y vuelve atrás', async () => {
    router.canGoBack.mockReturnValue(true);
    await render(<ForgotPasswordScreen />);
    await fireEvent.press(screen.getByText('Volver'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('oculta Volver sin historial', async () => {
    router.canGoBack.mockReturnValue(false);
    await render(<ForgotPasswordScreen />);
    expect(screen.queryByText('Volver')).toBeNull();
  });
});
