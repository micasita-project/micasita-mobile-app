import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

const mockAuth = jest.fn();
const mockHomeSheet = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/widgets/home/ui/HomeSheet', () => ({
  HomeSheet: (props: any) => {
    mockHomeSheet(props);
    return null;
  },
}));

const logout = jest.fn();
const baseUser = {
  email: 'ana@mail.com',
  name: 'Ana',
  last_name: 'Pérez',
  home_address: 'Av. Larco 123',
  role: 'user',
};
const lastSheetProps = () => mockHomeSheet.mock.calls[mockHomeSheet.mock.calls.length - 1][0];

beforeEach(() => {
  resetRouter();
  mockAuth.mockReturnValue({ user: baseUser, logout });
});

describe('ProfileScreen invitado', () => {
  beforeEach(() => mockAuth.mockReturnValue({ user: null, logout }));

  it('muestra la bienvenida y los beneficios de crear cuenta', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByText('¡Bienvenido a MiCasita!')).toBeTruthy();
    expect(screen.getByText('Guarda tus lugares de trabajo')).toBeTruthy();
    expect(screen.queryByText('Cerrar sesión')).toBeNull();
  });

  it('Iniciar sesión lleva al login', async () => {
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByText('Iniciar sesión'));
    expect(router.push).toHaveBeenCalledWith('/login');
  });

  it('Crear cuenta lleva al login con la pestaña de registro', async () => {
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/login', params: { tab: 'register' } });
  });
});

describe('ProfileScreen usuario autenticado', () => {
  it('muestra nombre completo, correo e iniciales', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByText('Ana Pérez')).toBeTruthy();
    expect(screen.getByText('ana@mail.com')).toBeTruthy();
    expect(screen.getByText('AP')).toBeTruthy();
  });

  it('sin apellido muestra solo el nombre y una inicial', async () => {
    mockAuth.mockReturnValue({ user: { ...baseUser, last_name: undefined }, logout });
    await render(<ProfileScreen />);
    expect(screen.getByText('Ana').props.children).toBe('Ana');
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('sin nombre muestra "Usuario" y la inicial del correo', async () => {
    mockAuth.mockReturnValue({ user: { ...baseUser, name: undefined, last_name: undefined }, logout });
    await render(<ProfileScreen />);
    expect(screen.getByText('Usuario')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('muestra la dirección de la vivienda o "No configurada"', async () => {
    const { rerender } = await render(<ProfileScreen />);
    expect(screen.getByText('Av. Larco 123')).toBeTruthy();
    mockAuth.mockReturnValue({ user: { ...baseUser, home_address: '' }, logout });
    await rerender(<ProfileScreen />);
    expect(screen.getByText('No configurada')).toBeTruthy();
  });

  it('el lápiz abre la edición de perfil', async () => {
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByTestId('icon-pencil'));
    expect(router.push).toHaveBeenCalledWith('/edit-profile');
  });

  it('Favoritos y Publicaciones navegan a sus pantallas', async () => {
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByText('Favoritos'));
    expect(router.push).toHaveBeenLastCalledWith('/favorites');
    await fireEvent.press(screen.getByText('Publicaciones'));
    expect(router.push).toHaveBeenLastCalledWith('/my-listings');
  });

  it('Cerrar sesión llama a logout', async () => {
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByText('Cerrar sesión'));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('la hoja de vivienda se abre al tocar la dirección y se cierra con onClose', async () => {
    await render(<ProfileScreen />);
    expect(lastSheetProps().visible).toBe(false);
    await fireEvent.press(screen.getByText('Av. Larco 123'));
    expect(lastSheetProps().visible).toBe(true);
    await React.act(async () => lastSheetProps().onClose());
    expect(lastSheetProps().visible).toBe(false);
  });
});
