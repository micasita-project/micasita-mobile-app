import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import AdminUsersScreen from '@/app/(admin)/users';
import { resetRouter } from '@/__tests__/_helpers/app/expoRouter';

const mockGetAllUsers = jest.fn();
const mockUpdateUserStatus = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native/Libraries/Lists/FlatList', () => require('@/__tests__/_helpers/app/rnPieces').flatListModule);
jest.mock('react-native/Libraries/Components/ActivityIndicator/ActivityIndicator', () => require('@/__tests__/_helpers/app/rnPieces').activityIndicatorModule);
jest.mock('@/features/admin/api/admin.api', () => ({
  getAllUsers: (...a: any[]) => mockGetAllUsers(...a),
  updateUserStatus: (...a: any[]) => mockUpdateUserStatus(...a),
}));
jest.mock('@/features/admin/ui/AdminUserCard', () => ({
  AdminUserCard: ({ user, onToggleStatus }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={`toggle-${user.id}`} onPress={() => onToggleStatus(user.id, user.is_active)}>
        <Text>{`${user.email}|${user.is_active ? 'activo' : 'bloqueado'}`}</Text>
      </Pressable>
    );
  },
}));

const mk = (id: number, over: Record<string, any> = {}) => ({
  id,
  email: `u${id}@mail.com`,
  is_active: true,
  ...over,
});
const page = (from: number, n: number) => Array.from({ length: n }, (_, i) => mk(from + i));
const alertCalls = () => (Alert.alert as jest.Mock).mock.calls;

async function flush(ms = 0) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

async function setup() {
  await render(<AdminUsersScreen />);
  await flush(0);
}

beforeEach(() => {
  jest.useFakeTimers();
  resetRouter();
  mockGetAllUsers.mockResolvedValue(page(1, 3));
  mockUpdateUserStatus.mockResolvedValue({});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('AdminUsersScreen carga', () => {
  it('muestra el indicador mientras llega la primera carga', async () => {
    mockGetAllUsers.mockReturnValue(new Promise(() => {}));
    await render(<AdminUsersScreen />);
    expect(screen.getByTestId('spinner')).toBeTruthy();
  });

  it('pide la primera página (skip 0, límite 7, sin búsqueda) y lista usuarios', async () => {
    await setup();
    expect(mockGetAllUsers).toHaveBeenCalledWith(0, 7, '');
    expect(screen.getByText('u1@mail.com|activo')).toBeTruthy();
    expect(screen.getByText('u3@mail.com|activo')).toBeTruthy();
  });

  it('sin usuarios muestra el vacío neutro', async () => {
    mockGetAllUsers.mockResolvedValue([]);
    await setup();
    expect(screen.getByText('Sin usuarios')).toBeTruthy();
    expect(screen.getByText('No hay usuarios registrados aún.')).toBeTruthy();
  });

  it('si falla la carga avisa del error', async () => {
    mockGetAllUsers.mockRejectedValue(new Error('x'));
    await setup();
    expect(alertCalls()[0]).toEqual(['Error', 'No se pudo cargar la lista de usuarios.']);
  });

  it('refrescar vuelve a pedir desde el inicio y reemplaza la lista', async () => {
    await setup();
    mockGetAllUsers.mockResolvedValue([mk(9)]);
    await act(async () => {
      fireEvent.press(screen.getByTestId('refresh'));
    });
    expect(mockGetAllUsers).toHaveBeenLastCalledWith(0, 7, '');
    expect(screen.getByText('u9@mail.com|activo')).toBeTruthy();
    expect(screen.queryByText('u1@mail.com|activo')).toBeNull();
  });
});

describe('AdminUsersScreen paginación', () => {
  it('con una página completa, al llegar al final pide la siguiente y la agrega', async () => {
    mockGetAllUsers.mockResolvedValueOnce(page(1, 7));
    await setup();
    mockGetAllUsers.mockResolvedValueOnce(page(8, 2));
    await act(async () => {
      fireEvent.press(screen.getByTestId('end-reached'));
    });
    expect(mockGetAllUsers).toHaveBeenLastCalledWith(7, 7, '');
    expect(screen.getByText('u1@mail.com|activo')).toBeTruthy();
    expect(screen.getByText('u9@mail.com|activo')).toBeTruthy();
  });

  it('una página incompleta marca el final y no vuelve a pedir', async () => {
    await setup();
    const calls = mockGetAllUsers.mock.calls.length;
    await act(async () => {
      fireEvent.press(screen.getByTestId('end-reached'));
    });
    expect(mockGetAllUsers).toHaveBeenCalledTimes(calls);
  });
});

describe('AdminUsersScreen búsqueda', () => {
  it('espera 500 ms de pausa y busca solo con el último texto', async () => {
    await setup();
    mockGetAllUsers.mockClear();
    const input = screen.getByPlaceholderText('Buscar por nombre o correo...');
    await fireEvent.changeText(input, 'an');
    await flush(300);
    await fireEvent.changeText(input, 'ana');
    await flush(499);
    expect(mockGetAllUsers).not.toHaveBeenCalled();
    await flush(1);
    expect(mockGetAllUsers).toHaveBeenCalledTimes(1);
    expect(mockGetAllUsers).toHaveBeenCalledWith(0, 7, 'ana');
  });

  it('sin coincidencias muestra "Sin resultados"', async () => {
    await setup();
    mockGetAllUsers.mockResolvedValue([]);
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar por nombre o correo...'), 'zzz');
    await flush(500);
    expect(screen.getByText('Sin resultados')).toBeTruthy();
    expect(screen.getByText('No se encontraron usuarios que coincidan.')).toBeTruthy();
  });

  it('el botón de borrar limpia el texto y vuelve a la lista completa', async () => {
    await setup();
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar por nombre o correo...'), 'ana');
    await flush(500);
    await fireEvent.press(screen.getByTestId('icon-close-circle'));
    expect(screen.getByPlaceholderText('Buscar por nombre o correo...').props.value).toBe('');
    await flush(500);
    expect(mockGetAllUsers).toHaveBeenLastCalledWith(0, 7, '');
  });

  it('el botón de borrar solo aparece cuando hay texto', async () => {
    await setup();
    expect(screen.queryByTestId('icon-close-circle')).toBeNull();
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar por nombre o correo...'), 'a');
    expect(screen.getByTestId('icon-close-circle')).toBeTruthy();
  });
});

describe('AdminUsersScreen bloquear y desbloquear', () => {
  const confirm = async () => {
    const buttons = alertCalls()[alertCalls().length - 1][2];
    await act(async () => {
      await buttons[1].onPress();
    });
  };

  it('bloquear pide confirmación sin tocar nada hasta aceptarla', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('toggle-1'));
    expect(alertCalls()[0][0]).toBe('Bloquear Usuario');
    expect(alertCalls()[0][2][1].text).toBe('Sí, bloquear');
    expect(alertCalls()[0][2][1].style).toBe('destructive');
    expect(mockUpdateUserStatus).not.toHaveBeenCalled();
  });

  it('al confirmar bloquea al usuario, actualiza la lista y llama al servicio con false', async () => {
    await setup();
    await fireEvent.press(screen.getByTestId('toggle-1'));
    await confirm();
    expect(mockUpdateUserStatus).toHaveBeenCalledWith(1, false);
    expect(screen.getByText('u1@mail.com|bloqueado')).toBeTruthy();
    expect(screen.getByText('u2@mail.com|activo')).toBeTruthy();
  });

  it('un usuario bloqueado se desbloquea con el servicio en true', async () => {
    mockGetAllUsers.mockResolvedValue([mk(1, { is_active: false })]);
    await setup();
    await fireEvent.press(screen.getByTestId('toggle-1'));
    expect(alertCalls()[0][0]).toBe('Desbloquear Usuario');
    expect(alertCalls()[0][2][1].style).toBe('default');
    await confirm();
    expect(mockUpdateUserStatus).toHaveBeenCalledWith(1, true);
    expect(screen.getByText('u1@mail.com|activo')).toBeTruthy();
  });

  it('si el servicio falla revierte el estado y avisa', async () => {
    mockUpdateUserStatus.mockRejectedValue(new Error('x'));
    await setup();
    await fireEvent.press(screen.getByTestId('toggle-1'));
    await confirm();
    expect(screen.getByText('u1@mail.com|activo')).toBeTruthy();
    expect(alertCalls()[1]).toEqual(['Error', 'No se pudo bloquear al usuario.']);
  });
});

describe('AdminUsersScreen carga inicial', () => {
  it('pide la primera página una sola vez al abrir, sin repetirla tras el temporizador del buscador', async () => {
    await setup();
    await flush(600);
    expect(mockGetAllUsers).toHaveBeenCalledTimes(1);
  });
});
