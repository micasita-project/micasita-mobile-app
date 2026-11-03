import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { AdminUserCard } from '@/features/admin/ui/AdminUserCard';
import type { AdminUserResponse } from '@/features/admin/api/admin.api';
import { Colors } from '@/shared/config/colors';
import { allByType, flat } from '@/__tests__/_helpers/ui/host';

jest.mock('@expo/vector-icons', () => require('@/__tests__/_helpers/ui/mockIcons'));

const makeUser = (over: Partial<AdminUserResponse> = {}): AdminUserResponse => ({
  id: 5,
  email: 'maria@correo.com',
  role: 'user',
  is_active: true,
  name: 'María',
  last_name: 'Pérez',
  ...over,
});

async function setup(over: Partial<AdminUserResponse> = {}) {
  const onToggleStatus = jest.fn();
  const user = makeUser(over);
  const utils = await render(<AdminUserCard user={user} onToggleStatus={onToggleStatus} />);
  const sw = () => allByType(utils.root!, 'RCTSwitch')[0];
  return { ...utils, user, onToggleStatus, sw };
}

describe('AdminUserCard datos', () => {
  it('muestra nombre completo y correo', async () => {
    const { getByText } = await setup();
    expect(getByText('María Pérez')).toBeTruthy();
    expect(getByText('maria@correo.com')).toBeTruthy();
  });

  it('sin apellido muestra solo el nombre', async () => {
    const { getByText } = await setup({ last_name: null });
    expect(getByText('María')).toBeTruthy();
  });

  it('sin nombre muestra "Sin nombre"', async () => {
    const { getByText } = await setup({ name: null });
    expect(getByText('Sin nombre')).toBeTruthy();
  });

  it('el nombre vacío también cuenta como "Sin nombre"', async () => {
    const { getByText } = await setup({ name: '' });
    expect(getByText('Sin nombre')).toBeTruthy();
  });

  it('la inicial sale del nombre en mayúscula', async () => {
    const { getByText } = await setup({ name: 'carlos' });
    expect(getByText('C')).toBeTruthy();
  });

  it('sin nombre la inicial sale del correo en mayúscula', async () => {
    const { getByText } = await setup({ name: null, email: 'zeta@correo.com' });
    expect(getByText('Z')).toBeTruthy();
  });
});

describe('AdminUserCard rol', () => {
  it('un usuario normal muestra "Usuario" con icono de persona', async () => {
    const { getByText, getByTestId, queryByTestId } = await setup({ role: 'user' });
    expect(getByText('Usuario')).toBeTruthy();
    expect(getByTestId('icon-person-outline')).toBeTruthy();
    expect(queryByTestId('icon-shield-checkmark')).toBeNull();
  });

  it('un administrador muestra "Admin" con icono de escudo', async () => {
    const { getByText, getByTestId, queryByText } = await setup({ role: 'admin' });
    expect(getByText('Admin')).toBeTruthy();
    expect(getByTestId('icon-shield-checkmark')).toBeTruthy();
    expect(queryByText('Usuario')).toBeNull();
  });
});

describe('AdminUserCard estado', () => {
  it('activo muestra "Activo" en verde y el interruptor encendido', async () => {
    const { getByText, sw, queryByText } = await setup({ is_active: true });
    expect(getByText('Activo')).toBeTruthy();
    expect(queryByText('Bloqueado')).toBeNull();
    expect(flat(getByText('Activo')).color).toBe(Colors.success);
    expect(sw().props.value).toBe(true);
  });

  it('bloqueado muestra "Bloqueado" en rojo y el interruptor apagado', async () => {
    const { getByText, sw, queryByText } = await setup({ is_active: false });
    expect(getByText('Bloqueado')).toBeTruthy();
    expect(queryByText('Activo')).toBeNull();
    expect(flat(getByText('Bloqueado')).color).toBe(Colors.error);
    expect(sw().props.value).toBe(false);
  });

  it('la inicial toma el color del estado', async () => {
    const a = await setup({ is_active: true, name: 'Ana' });
    expect(flat(a.getByText('A')).color).toBe(Colors.success);
    const b = await setup({ is_active: false, name: 'Beto' });
    expect(flat(b.getByText('B')).color).toBe(Colors.error);
  });
});

describe('AdminUserCard interruptor', () => {
  it('cambiarlo llama a onToggleStatus con el id y el estado actual', async () => {
    const { sw, onToggleStatus } = await setup({ id: 9, is_active: true });
    await act(async () => sw().props.onChange({ nativeEvent: { value: false } }));
    expect(onToggleStatus).toHaveBeenCalledTimes(1);
    expect(onToggleStatus).toHaveBeenCalledWith(9, true);
  });

  it('con un usuario bloqueado informa el estado actual false', async () => {
    const { sw, onToggleStatus } = await setup({ id: 9, is_active: false });
    await act(async () => sw().props.onChange({ nativeEvent: { value: true } }));
    expect(onToggleStatus).toHaveBeenCalledWith(9, false);
  });

  it('un usuario normal tiene el interruptor habilitado', async () => {
    const { sw } = await setup({ role: 'user' });
    expect(sw().props.disabled).toBeFalsy();
  });

  it('el interruptor de un administrador está deshabilitado', async () => {
    const { sw } = await setup({ role: 'admin' });
    expect(sw().props.disabled).toBe(true);
  });
});
