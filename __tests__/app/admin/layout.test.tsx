import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import AdminLayout from '@/app/(admin)/_layout';
import { resetRouter, tabsCapture } from '@/__tests__/_helpers/app/expoRouter';

const mockAuth = jest.fn();
const logout = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('@/shared/ui/BottomSheet', () => require('@/__tests__/_helpers/app/sheets').bottomSheetModule);
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));

beforeEach(() => {
  resetRouter();
  mockAuth.mockReturnValue({ user: { name: 'ana', last_name: 'Pérez', email: 'a@mail.com' }, logout });
});

describe('AdminLayout', () => {
  it('declara las pestañas Pendientes (index) y Usuarios (users)', async () => {
    await render(<AdminLayout />);
    expect(tabsCapture.screens.map((s) => [s.name, s.options.title])).toEqual([
      ['index', 'Pendientes'],
      ['users', 'Usuarios'],
    ]);
  });

  it('el icono de cada pestaña cambia entre activo e inactivo', async () => {
    await render(<AdminLayout />);
    const icon = (i: number, focused: boolean) =>
      tabsCapture.screens[i].options.tabBarIcon({ color: 'c', size: 1, focused }).props.name;
    expect(icon(0, true)).toBe('list');
    expect(icon(0, false)).toBe('list-outline');
    expect(icon(1, true)).toBe('people');
    expect(icon(1, false)).toBe('people-outline');
  });

  it('el avatar muestra la inicial del nombre en mayúscula', async () => {
    await render(<AdminLayout />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('sin nombre usa "A" como inicial', async () => {
    mockAuth.mockReturnValue({ user: { email: 'a@mail.com' }, logout });
    await render(<AdminLayout />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('el panel de perfil está cerrado al inicio y se abre al pulsar el avatar', async () => {
    await render(<AdminLayout />);
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
    await fireEvent.press(screen.getByText('A'));
    expect(screen.getByTestId('bottom-sheet')).toBeTruthy();
    expect(screen.getByText('Administrador')).toBeTruthy();
    expect(screen.getByText('a@mail.com')).toBeTruthy();
  });

  it('el panel muestra nombre y apellido', async () => {
    await render(<AdminLayout />);
    await fireEvent.press(screen.getByText('A'));
    expect(screen.getByText('ana Pérez')).toBeTruthy();
  });

  it('sin nombre el panel muestra "Administrador" como título', async () => {
    mockAuth.mockReturnValue({ user: { email: 'a@mail.com' }, logout });
    await render(<AdminLayout />);
    await fireEvent.press(screen.getByText('A'));
    expect(screen.getAllByText('Administrador')).toHaveLength(2);
  });

  it('cerrar el panel lo oculta', async () => {
    await render(<AdminLayout />);
    await fireEvent.press(screen.getByText('A'));
    await fireEvent.press(screen.getByTestId('sheet-close'));
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });

  it('Cerrar Sesión llama a logout', async () => {
    await render(<AdminLayout />);
    await fireEvent.press(screen.getByText('A'));
    await fireEvent.press(screen.getByText('Cerrar Sesión'));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
