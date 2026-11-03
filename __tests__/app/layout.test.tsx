import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RootLayout from '@/app/_layout';
import { router, routeState, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

const mockAuth = jest.fn();
const mockUseWorkplaces = jest.fn();

const passthrough = ({ children }: any) => children;

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-reanimated', () => ({}));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: ({ children }: any) => children }));
jest.mock('@gorhom/bottom-sheet', () => ({ BottomSheetModalProvider: ({ children }: any) => children }));
jest.mock('@tanstack/react-query', () => ({ QueryClientProvider: ({ children }: any) => children }));
jest.mock('@/shared/api', () => ({ queryClient: {} }));
jest.mock('@/shared/model/SelectedWorkplaceContext', () => ({
  SelectedWorkplaceProvider: ({ children }: any) => children,
}));
jest.mock('@/features/guest', () => ({ GuestProvider: ({ children }: any) => children }));
jest.mock('@/features/auth', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => mockAuth(),
  ConsentModal: () => {
    const { Text } = require('react-native');
    return <Text testID="consent-modal">ConsentModal</Text>;
  },
}));
jest.mock('@/entities/workplace/model/useWorkplaces', () => ({
  useWorkplaces: (enabled: boolean) => mockUseWorkplaces(enabled),
}));

const normalUser = { role: 'user', home_address: 'Av. Larco 123' };
const adminUser = { role: 'admin', home_address: 'Av. Admin 1' };
const workplaces = [{ id: 1 }];

function state(over: {
  auth?: Record<string, any>;
  wp?: Record<string, any>;
  segments?: string[];
}) {
  mockAuth.mockReturnValue({ isAuthenticated: false, isInitialized: true, user: null, ...over.auth });
  mockUseWorkplaces.mockReturnValue({
    data: workplaces,
    isLoading: false,
    isFetching: false,
    ...over.wp,
  });
  routeState.segments = over.segments ?? [];
}

beforeEach(() => {
  resetRouter();
  state({});
});

describe('RootLayout estructura', () => {
  it('registra las pantallas de la app y el modal de consentimiento', async () => {
    await render(<RootLayout />);
    const names = screen.getAllByTestId('stack-screen').map((n) => n.props.children);
    expect(names).toEqual(
      expect.arrayContaining([
        'login', 'forgot-password', 'verify-email', 'edit-profile', 'onboarding', '(tabs)', '(admin)',
        'housing-detail', 'publish-housing', 'my-listings', 'recommendation-insight', 'favorites',
        'property-map', 'privacy-policy',
      ]),
    );
    expect(screen.getByTestId('consent-modal')).toBeTruthy();
  });
});

describe('RootLayout redirecciones: antes de inicializar', () => {
  it('no redirige nada mientras la sesión no está inicializada', async () => {
    state({
      auth: { isInitialized: false, isAuthenticated: true, user: adminUser },
      segments: ['login'],
    });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('RootLayout redirecciones: administrador', () => {
  const admin = { isAuthenticated: true, user: adminUser };

  it('desde cualquier ruta que no sea admin lo manda al panel (admin)', async () => {
    state({ auth: admin, segments: ['(tabs)'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/(admin)');
  });

  it('ya dentro de (admin) no redirige', async () => {
    state({ auth: admin, segments: ['(admin)'] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('puede abrir el detalle de una vivienda sin ser expulsado', async () => {
    state({ auth: admin, segments: ['housing-detail'] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('no consulta workplaces y no espera por ellos', async () => {
    state({ auth: admin, wp: { isLoading: true }, segments: [] });
    await render(<RootLayout />);
    expect(mockUseWorkplaces).toHaveBeenCalledWith(false);
    expect(router.replace).toHaveBeenCalledWith('/(admin)');
  });
});

describe('RootLayout redirecciones: usuario normal', () => {
  const auth = { isAuthenticated: true, user: normalUser };

  it('consulta workplaces solo si tiene casa configurada', async () => {
    state({ auth });
    await render(<RootLayout />);
    expect(mockUseWorkplaces).toHaveBeenCalledWith(true);
  });

  it('sin casa va al onboarding', async () => {
    state({ auth: { ...auth, user: { role: 'user', home_address: null } }, segments: ['(tabs)'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/onboarding');
    expect(mockUseWorkplaces).toHaveBeenCalledWith(false);
  });

  it('sin casa y ya en onboarding no redirige', async () => {
    state({ auth: { ...auth, user: { role: 'user', home_address: null } }, segments: ['onboarding'] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('sin casa no espera a los workplaces aunque estén cargando', async () => {
    state({
      auth: { ...auth, user: { role: 'user', home_address: '' } },
      wp: { isLoading: true },
      segments: [],
    });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/onboarding');
  });

  it('con casa, mientras cargan los workplaces no redirige', async () => {
    state({ auth, wp: { data: undefined, isLoading: true }, segments: ['login'] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('con casa, mientras se vuelven a pedir los workplaces no redirige', async () => {
    state({ auth, wp: { data: [], isFetching: true }, segments: [] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('con casa y sin workplaces (lista vacía) va al onboarding', async () => {
    state({ auth, wp: { data: [] }, segments: ['(tabs)'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/onboarding');
  });

  it('con casa y workplaces sin definir va al onboarding', async () => {
    state({ auth, wp: { data: undefined }, segments: ['(tabs)'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/onboarding');
  });

  it('sin workplaces y ya en onboarding no redirige', async () => {
    state({ auth, wp: { data: [] }, segments: ['onboarding'] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('completo y viniendo del login va a las pestañas', async () => {
    state({ auth, segments: ['login'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('completo y viniendo de verificar correo va a las pestañas', async () => {
    state({ auth, segments: ['verify-email'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('completo y en las pestañas no redirige', async () => {
    state({ auth, segments: ['(tabs)'] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('completo y en otra pantalla (favoritos) no redirige', async () => {
    state({ auth, segments: ['favorites'] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('si entra a (admin) vuelve a las pestañas', async () => {
    state({ auth, segments: ['(admin)'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    expect(router.replace).not.toHaveBeenCalledWith('/onboarding');
  });

  it('un usuario sin casa que entra a (admin) vuelve a las pestañas antes que al onboarding', async () => {
    state({ auth: { ...auth, user: { role: 'user', home_address: null } }, segments: ['(admin)'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    expect(router.replace).not.toHaveBeenCalledWith('/onboarding');
  });
});

describe('RootLayout redirecciones: invitado', () => {
  it('en las pestañas no redirige', async () => {
    state({ segments: ['(tabs)'] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('puede abrir el login sin redirección', async () => {
    state({ segments: ['login'] });
    await render(<RootLayout />);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('no puede quedarse en el onboarding: va a las pestañas', async () => {
    state({ segments: ['onboarding'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('no puede entrar a (admin): va a las pestañas', async () => {
    state({ segments: ['(admin)'] });
    await render(<RootLayout />);
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('no consulta workplaces', async () => {
    state({});
    await render(<RootLayout />);
    expect(mockUseWorkplaces).toHaveBeenCalledWith(false);
  });
});
