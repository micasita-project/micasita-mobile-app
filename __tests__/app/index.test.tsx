import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Index from '@/app/index';

const mockAuth = jest.fn();
jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));

describe('Index (ruta raíz)', () => {
  it('mientras la sesión no se inicializa muestra un indicador y no redirige', async () => {
    mockAuth.mockReturnValue({ user: null, isInitialized: false });
    await render(<Index />);
    expect(screen.queryByTestId('redirect')).toBeNull();
  });

  it('un administrador va al panel (admin)', async () => {
    mockAuth.mockReturnValue({ user: { role: 'admin' }, isInitialized: true });
    await render(<Index />);
    expect(screen.getByTestId('redirect').props.children).toBe('/(admin)');
  });

  it('un usuario normal va a las pestañas', async () => {
    mockAuth.mockReturnValue({ user: { role: 'user' }, isInitialized: true });
    await render(<Index />);
    expect(screen.getByTestId('redirect').props.children).toBe('/(tabs)');
  });

  it('un invitado va a las pestañas', async () => {
    mockAuth.mockReturnValue({ user: null, isInitialized: true });
    await render(<Index />);
    expect(screen.getByTestId('redirect').props.children).toBe('/(tabs)');
  });
});
