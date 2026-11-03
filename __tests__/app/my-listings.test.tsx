import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import MyListingsScreen from '@/app/my-listings';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}));
jest.mock('@/features/publish-housing', () => ({
  MyListingsPanel: () => {
    const { Text } = require('react-native');
    return <Text testID="panel">MyListingsPanel</Text>;
  },
}));

beforeEach(resetRouter);

describe('MyListingsScreen', () => {
  it('muestra el encabezado y el panel de publicaciones', async () => {
    await render(<MyListingsScreen />);
    expect(screen.getByText('Mis publicaciones')).toBeTruthy();
    expect(screen.getByTestId('panel')).toBeTruthy();
  });

  it('el botón de retroceso vuelve atrás', async () => {
    await render(<MyListingsScreen />);
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('el botón Publicar lleva al asistente de publicación', async () => {
    await render(<MyListingsScreen />);
    await fireEvent.press(screen.getByText('Publicar'));
    expect(router.push).toHaveBeenCalledWith('/publish-housing');
  });
});
