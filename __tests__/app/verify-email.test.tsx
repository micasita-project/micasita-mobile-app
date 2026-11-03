import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import VerifyEmailScreen from '@/app/verify-email';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('@/features/auth/ui/VerifyEmailForm', () => ({
  VerifyEmailForm: () => {
    const { Text } = require('react-native');
    return <Text testID="verify-form">VerifyEmailForm</Text>;
  },
}));

beforeEach(resetRouter);

describe('VerifyEmailScreen', () => {
  it('muestra el título y el formulario de verificación', async () => {
    await render(<VerifyEmailScreen />);
    expect(screen.getByText('Verifica tu correo')).toBeTruthy();
    expect(screen.getByTestId('verify-form')).toBeTruthy();
  });

  it('muestra Volver cuando hay historial y vuelve atrás', async () => {
    router.canGoBack.mockReturnValue(true);
    await render(<VerifyEmailScreen />);
    await fireEvent.press(screen.getByText('Volver'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('oculta Volver sin historial', async () => {
    router.canGoBack.mockReturnValue(false);
    await render(<VerifyEmailScreen />);
    expect(screen.queryByText('Volver')).toBeNull();
  });
});
