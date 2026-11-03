jest.mock('@/features/auth', () => ({
  useAuth: jest.fn(),
}));

import React, { type ReactNode } from 'react';
import { act } from 'react-test-renderer';
import { useAuth } from '@/features/auth';
import {
  SelectedWorkplaceProvider,
  useSelectedWorkplace,
} from '@/shared/model/SelectedWorkplaceContext';
import { mountHook, flush } from '../../_helpers/state/mountHook';

const mockUseAuth = useAuth as jest.Mock;

let authFlag = true;
let setAuth: (v: boolean) => void = () => {};

// Wrapper que permite cambiar el estado de autenticación y re-renderizar el provider.
function authWrapper({ children }: { children: ReactNode }) {
  const [flag, setFlag] = React.useState(true);
  authFlag = flag;
  setAuth = setFlag;
  return <SelectedWorkplaceProvider>{children}</SelectedWorkplaceProvider>;
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <SelectedWorkplaceProvider>{children}</SelectedWorkplaceProvider>
);

describe('useSelectedWorkplace', () => {
  beforeEach(() => {
    authFlag = true;
    mockUseAuth.mockImplementation(() => ({ isAuthenticated: authFlag }));
  });

  it('lanza un error fuera del provider', () => {
    expect(() => mountHook(() => useSelectedWorkplace())).toThrow(
      'useSelectedWorkplace debe usarse dentro de SelectedWorkplaceProvider',
    );
  });

  it('arranca sin workplace seleccionado', () => {
    const { result } = mountHook(() => useSelectedWorkplace(), wrapper);
    expect(result.current.selectedWorkplaceId).toBeNull();
  });

  it('permite seleccionar y deseleccionar un workplace', () => {
    const { result } = mountHook(() => useSelectedWorkplace(), wrapper);
    act(() => result.current.setSelectedWorkplaceId(7));
    expect(result.current.selectedWorkplaceId).toBe(7);
    act(() => result.current.setSelectedWorkplaceId(null));
    expect(result.current.selectedWorkplaceId).toBeNull();
  });

  it('conserva la selección mientras el usuario sigue autenticado', async () => {
    const { result } = mountHook(() => useSelectedWorkplace(), wrapper);
    act(() => result.current.setSelectedWorkplaceId(7));
    await flush();
    expect(result.current.selectedWorkplaceId).toBe(7);
  });

  it('resetea la selección cuando el usuario deja de estar autenticado', async () => {
    const { result } = mountHook(() => useSelectedWorkplace(), authWrapper);
    act(() => result.current.setSelectedWorkplaceId(7));
    expect(result.current.selectedWorkplaceId).toBe(7);

    act(() => setAuth(false));
    await flush();
    expect(result.current.selectedWorkplaceId).toBeNull();
  });

  it('tras cerrar sesión permite seleccionar de nuevo al volver a autenticarse', async () => {
    const { result } = mountHook(() => useSelectedWorkplace(), authWrapper);
    act(() => setAuth(false));
    act(() => setAuth(true));
    act(() => result.current.setSelectedWorkplaceId(3));
    await flush();
    expect(result.current.selectedWorkplaceId).toBe(3);
  });
});
