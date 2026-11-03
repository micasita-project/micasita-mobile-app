import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import EditProfileScreen from '@/app/edit-profile';
import { router, resetRouter } from '@/__tests__/_helpers/app/expoRouter';

const mockAuth = jest.fn();
const mockUpdateProfile = jest.fn();
const mockChangePassword = jest.fn();
const mockDeleteAccount = jest.fn();
const mockDeleteAndLeave = jest.fn();
const refreshUser = jest.fn();
const logout = jest.fn();

jest.mock('expo-router', () => require('@/__tests__/_helpers/app/expoRouter').expoRouterModule);
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/app/icons').iconsModule);
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 10, left: 0, right: 0 }),
}));
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/features/auth/api/auth.service', () => ({
  updateProfile: (...a: any[]) => mockUpdateProfile(...a),
  changePassword: (...a: any[]) => mockChangePassword(...a),
  deleteAccount: (...a: any[]) => mockDeleteAccount(...a),
}));
jest.mock('@/features/auth/model/deleteAccountFlow', () => ({
  deleteAccountAndLeave: (...a: any[]) => mockDeleteAndLeave(...a),
}));

const user = { email: 'ana@mail.com', name: 'Ana', last_name: 'Pérez', role: 'user' };
const alertCalls = () => (Alert.alert as jest.Mock).mock.calls;

beforeEach(() => {
  resetRouter();
  mockAuth.mockReturnValue({ user, refreshUser, logout });
  mockUpdateProfile.mockResolvedValue({});
  mockChangePassword.mockResolvedValue({});
  mockDeleteAccount.mockResolvedValue({});
  mockDeleteAndLeave.mockResolvedValue(undefined);
  refreshUser.mockResolvedValue(undefined);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

const type = (placeholder: string, text: string) =>
  fireEvent.changeText(screen.getByPlaceholderText(placeholder), text);

describe('EditProfileScreen datos personales', () => {
  it('precarga correo, nombre y apellido del usuario', async () => {
    await render(<EditProfileScreen />);
    expect(screen.getByText('ana@mail.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('Nombre').props.value).toBe('Ana');
    expect(screen.getByPlaceholderText('Apellido').props.value).toBe('Pérez');
  });

  it('Guardar cambios envía nombre y apellido recortados, refresca el usuario y avisa', async () => {
    await render(<EditProfileScreen />);
    await type('Nombre', '  Luz ');
    await type('Apellido', ' Díaz  ');
    await fireEvent.press(screen.getByText('Guardar cambios'));
    expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Luz', last_name: 'Díaz' });
    expect(refreshUser).toHaveBeenCalledTimes(1);
    expect(alertCalls()[0]).toEqual(['Listo', 'Tu perfil fue actualizado.']);
  });

  it('los campos vacíos se envían como undefined', async () => {
    await render(<EditProfileScreen />);
    await type('Nombre', '   ');
    await type('Apellido', '');
    await fireEvent.press(screen.getByText('Guardar cambios'));
    expect(mockUpdateProfile).toHaveBeenCalledWith({ name: undefined, last_name: undefined });
  });

  it('si falla el guardado avisa del error y no refresca el usuario', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('x'));
    await render(<EditProfileScreen />);
    await fireEvent.press(screen.getByText('Guardar cambios'));
    expect(refreshUser).not.toHaveBeenCalled();
    expect(alertCalls()[0]).toEqual(['Error', 'No se pudo actualizar el perfil.']);
    expect(screen.getByText('Guardar cambios')).toBeTruthy();
  });

  it('el botón de retroceso vuelve atrás', async () => {
    await render(<EditProfileScreen />);
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});

describe('EditProfileScreen cambio de contraseña', () => {
  const press = () => fireEvent.press(screen.getByText('Cambiar contraseña'));

  it('exige la contraseña actual', async () => {
    await render(<EditProfileScreen />);
    await press();
    expect(alertCalls()[0]).toEqual(['Campo requerido', 'Ingresa tu contraseña actual.']);
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña nueva de menos de 8 caracteres', async () => {
    await render(<EditProfileScreen />);
    await type('Contraseña actual', 'vieja123');
    await type('Mínimo 8 caracteres', '1234567');
    await type('Repite la nueva contraseña', '1234567');
    await press();
    expect(alertCalls()[0][0]).toBe('Contraseña muy corta');
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('acepta exactamente 8 caracteres', async () => {
    await render(<EditProfileScreen />);
    await type('Contraseña actual', 'vieja123');
    await type('Mínimo 8 caracteres', '12345678');
    await type('Repite la nueva contraseña', '12345678');
    await press();
    expect(mockChangePassword).toHaveBeenCalledWith('vieja123', '12345678');
  });

  it('rechaza una confirmación distinta', async () => {
    await render(<EditProfileScreen />);
    await type('Contraseña actual', 'vieja123');
    await type('Mínimo 8 caracteres', 'nueva1234');
    await type('Repite la nueva contraseña', 'otra12345');
    await press();
    expect(alertCalls()[0]).toEqual(['Error', 'Las contraseñas no coinciden.']);
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('al cambiarla limpia los tres campos y avisa', async () => {
    await render(<EditProfileScreen />);
    await type('Contraseña actual', 'vieja123');
    await type('Mínimo 8 caracteres', 'nueva1234');
    await type('Repite la nueva contraseña', 'nueva1234');
    await press();
    expect(alertCalls()[0]).toEqual(['Listo', 'Tu contraseña fue actualizada.']);
    expect(screen.getByPlaceholderText('Contraseña actual').props.value).toBe('');
    expect(screen.getByPlaceholderText('Mínimo 8 caracteres').props.value).toBe('');
    expect(screen.getByPlaceholderText('Repite la nueva contraseña').props.value).toBe('');
  });

  it('si el servidor rechaza muestra su detalle y conserva los campos', async () => {
    mockChangePassword.mockRejectedValue({ response: { data: { detail: 'Contraseña actual incorrecta' } } });
    await render(<EditProfileScreen />);
    await type('Contraseña actual', 'mala');
    await type('Mínimo 8 caracteres', 'nueva1234');
    await type('Repite la nueva contraseña', 'nueva1234');
    await press();
    expect(alertCalls()[0]).toEqual(['Error', 'Contraseña actual incorrecta']);
    expect(screen.getByPlaceholderText('Contraseña actual').props.value).toBe('mala');
  });

  it('sin detalle del servidor usa el mensaje genérico', async () => {
    mockChangePassword.mockRejectedValue(new Error('red'));
    await render(<EditProfileScreen />);
    await type('Contraseña actual', 'vieja123');
    await type('Mínimo 8 caracteres', 'nueva1234');
    await type('Repite la nueva contraseña', 'nueva1234');
    await press();
    expect(alertCalls()[0]).toEqual(['Error', 'No se pudo cambiar la contraseña.']);
  });

  it('el ojo alterna la visibilidad de la contraseña actual y de la nueva (con su confirmación)', async () => {
    await render(<EditProfileScreen />);
    expect(screen.getByPlaceholderText('Contraseña actual').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getAllByTestId('icon-eye-outline')[0]);
    expect(screen.getByPlaceholderText('Contraseña actual').props.secureTextEntry).toBe(false);
    expect(screen.getByPlaceholderText('Mínimo 8 caracteres').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getAllByTestId('icon-eye-outline')[0]);
    expect(screen.getByPlaceholderText('Mínimo 8 caracteres').props.secureTextEntry).toBe(false);
    expect(screen.getByPlaceholderText('Repite la nueva contraseña').props.secureTextEntry).toBe(false);
  });
});

describe('EditProfileScreen eliminar cuenta', () => {
  const press = () => fireEvent.press(screen.getByText('Eliminar mi cuenta'));
  const confirm = async () => {
    const buttons = alertCalls()[0][2];
    await React.act(async () => {
      await buttons.find((b: any) => b.text === 'Eliminar').onPress();
    });
  };

  it('un administrador no ve la zona de riesgo', async () => {
    mockAuth.mockReturnValue({ user: { ...user, role: 'admin' }, refreshUser, logout });
    await render(<EditProfileScreen />);
    expect(screen.queryByText('ZONA DE RIESGO')).toBeNull();
    expect(screen.queryByText('Eliminar mi cuenta')).toBeNull();
  });

  it('exige la contraseña antes de pedir confirmación', async () => {
    await render(<EditProfileScreen />);
    await press();
    expect(alertCalls()[0]).toEqual(['Campo requerido', 'Ingresa tu contraseña para confirmar.']);
    expect(mockDeleteAndLeave).not.toHaveBeenCalled();
  });

  it('con contraseña pide confirmación y no elimina hasta aceptarla', async () => {
    await render(<EditProfileScreen />);
    await type('Ingresa tu contraseña para confirmar', 'secreta');
    await press();
    expect(alertCalls()[0][0]).toBe('Eliminar cuenta');
    expect(alertCalls()[0][2].map((b: any) => b.text)).toEqual(['Cancelar', 'Eliminar']);
    expect(mockDeleteAndLeave).not.toHaveBeenCalled();
  });

  it('al confirmar usa deleteAccountAndLeave con la contraseña, el servicio, logout y el router', async () => {
    await render(<EditProfileScreen />);
    await type('Ingresa tu contraseña para confirmar', 'secreta');
    await press();
    await confirm();
    expect(mockDeleteAndLeave).toHaveBeenCalledTimes(1);
    const arg = mockDeleteAndLeave.mock.calls[0][0];
    expect(arg.password).toBe('secreta');
    expect(arg.logout).toBe(logout);
    expect(arg.router).toBe(router);
    await arg.deleteAccount('secreta');
    expect(mockDeleteAccount).toHaveBeenCalledWith('secreta');
  });

  it('si falla muestra el detalle del servidor', async () => {
    mockDeleteAndLeave.mockRejectedValue({ response: { data: { detail: 'Contraseña incorrecta' } } });
    await render(<EditProfileScreen />);
    await type('Ingresa tu contraseña para confirmar', 'mala');
    await press();
    await confirm();
    expect(alertCalls()[1]).toEqual(['Error', 'Contraseña incorrecta']);
  });

  it('si falla sin detalle muestra el mensaje genérico', async () => {
    mockDeleteAndLeave.mockRejectedValue(new Error('red'));
    await render(<EditProfileScreen />);
    await type('Ingresa tu contraseña para confirmar', 'x');
    await press();
    await confirm();
    expect(alertCalls()[1]).toEqual(['Error', 'No se pudo eliminar la cuenta.']);
  });
});
