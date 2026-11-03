import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { ConsentModal } from '@/features/auth/ui/ConsentModal';
import { acceptPrivacyPolicy } from '@/features/auth/api/auth.service';

const mockRouter = { push: jest.fn() };
const mockAuth: any = { user: null, refreshUser: jest.fn(), logout: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/features/auth/model/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/features/auth/api/auth.service', () => ({ acceptPrivacyPolicy: jest.fn() }));

const acceptMock = acceptPrivacyPolicy as jest.Mock;
let alertSpy: jest.SpyInstance;

const pendingUser = { id: 1, email: 'a@b.c', consent_accepted_at: null };
const consentedUser = { id: 1, email: 'a@b.c', consent_accepted_at: '2026-01-01T00:00:00Z' };

beforeEach(() => {
  mockAuth.user = pendingUser;
  mockAuth.refreshUser.mockResolvedValue(undefined);
  acceptMock.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('ConsentModal visibilidad', () => {
  it('no se muestra si no hay usuario', async () => {
    mockAuth.user = null;
    await render(<ConsentModal />);
    expect(screen.queryByText('Política de Privacidad')).toBeNull();
  });

  it('no se muestra si el usuario ya aceptó la política', async () => {
    mockAuth.user = consentedUser;
    await render(<ConsentModal />);
    expect(screen.queryByText('Acepto')).toBeNull();
  });

  it('se muestra si el usuario no ha aceptado la política', async () => {
    await render(<ConsentModal />);
    expect(screen.getByText('Política de Privacidad')).toBeTruthy();
    expect(screen.getByText('Acepto')).toBeTruthy();
    expect(screen.getByText('No acepto y cerrar sesión')).toBeTruthy();
  });
});

describe('ConsentModal acciones', () => {
  it('leer la política navega a /privacy-policy', async () => {
    await render(<ConsentModal />);
    await fireEvent.press(screen.getByText('Leer la Política de Privacidad'));
    expect(mockRouter.push).toHaveBeenCalledWith('/privacy-policy');
  });

  it('aceptar registra el consentimiento y luego refresca al usuario', async () => {
    const order: string[] = [];
    acceptMock.mockImplementation(async () => {
      order.push('accept');
    });
    mockAuth.refreshUser.mockImplementation(async () => {
      order.push('refresh');
    });
    await render(<ConsentModal />);
    await fireEvent.press(screen.getByText('Acepto'));
    expect(order).toEqual(['accept', 'refresh']);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('si el registro del consentimiento falla avisa y no refresca al usuario', async () => {
    acceptMock.mockRejectedValue(new Error('red'));
    await render(<ConsentModal />);
    await fireEvent.press(screen.getByText('Acepto'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo registrar tu aceptación. Inténtalo de nuevo.');
    expect(mockAuth.refreshUser).not.toHaveBeenCalled();
  });

  it('tras un fallo el botón Acepto vuelve a estar disponible', async () => {
    acceptMock.mockRejectedValue(new Error('red'));
    await render(<ConsentModal />);
    await fireEvent.press(screen.getByText('Acepto'));
    expect(screen.getByText('Acepto')).toBeTruthy();
  });

  it('mientras guarda oculta el texto del botón y lo deshabilita', async () => {
    let release!: () => void;
    acceptMock.mockReturnValue(new Promise<void>((r) => (release = r)));
    await render(<ConsentModal />);
    let press!: Promise<unknown>;
    await act(async () => {
      press = fireEvent.press(screen.getByText('Acepto'));
    });
    expect(screen.queryByText('Acepto')).toBeNull();
    const disabled = screen.container.queryAll((n) => n.props.accessibilityState?.disabled === true);
    expect(disabled).toHaveLength(2);
    await act(async () => {
      release();
      await press;
    });
    expect(screen.getByText('Acepto')).toBeTruthy();
  });

  it('rechazar cierra la sesión', async () => {
    await render(<ConsentModal />);
    await fireEvent.press(screen.getByText('No acepto y cerrar sesión'));
    expect(mockAuth.logout).toHaveBeenCalledTimes(1);
    expect(acceptMock).not.toHaveBeenCalled();
  });
});
