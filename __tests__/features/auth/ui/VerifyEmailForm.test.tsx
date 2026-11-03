import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { VerifyEmailForm } from '@/features/auth/ui/VerifyEmailForm';
import { verifyEmail } from '@/features/auth/api/auth.service';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockParams: { email?: string } = {};
const mockAuth: any = {
  pendingEmail: 'pendiente@mail.com',
  completePendingVerification: jest.fn(),
  resendVerification: jest.fn(),
  isLoading: false,
};
const mockGuest = { clearGuestData: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/features/auth/model/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/features/guest', () => ({ useGuest: () => mockGuest }));
jest.mock('@/features/auth/api/auth.service', () => ({ verifyEmail: jest.fn() }));

const verifyMock = verifyEmail as jest.Mock;
let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  mockAuth.pendingEmail = 'pendiente@mail.com';
  mockAuth.isLoading = false;
  mockParams.email = undefined;
  mockAuth.completePendingVerification.mockResolvedValue({ success: true });
  mockAuth.resendVerification.mockResolvedValue({ success: true });
  mockGuest.clearGuestData.mockResolvedValue(undefined);
  verifyMock.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
});

const enterCode = (code: string) => fireEvent.changeText(screen.getByTestId('otp-input'), code);
const digits = () => screen.getAllByTestId('otp-digit').map((d) => d.props.children);

async function advance(seconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

describe('VerifyEmailForm presentación', () => {
  it('muestra el correo pendiente de verificación', async () => {
    await render(<VerifyEmailForm />);
    expect(screen.getByText('pendiente@mail.com')).toBeTruthy();
    expect(screen.getByText('Verificar')).toBeTruthy();
  });

  it('sin correo pendiente usa el parámetro de la ruta', async () => {
    mockAuth.pendingEmail = null;
    mockParams.email = 'ruta@mail.com';
    await render(<VerifyEmailForm />);
    expect(screen.getByText('ruta@mail.com')).toBeTruthy();
  });

  it('con el correo pendiente y el de la ruta prefiere el pendiente', async () => {
    mockParams.email = 'ruta@mail.com';
    await render(<VerifyEmailForm />);
    expect(screen.getByText('pendiente@mail.com')).toBeTruthy();
    expect(screen.queryByText('ruta@mail.com')).toBeNull();
  });

  it('sin ningún correo muestra "tu correo"', async () => {
    mockAuth.pendingEmail = null;
    await render(<VerifyEmailForm />);
    expect(screen.getByText('tu correo')).toBeTruthy();
  });
});

describe('VerifyEmailForm verificación con sesión pendiente', () => {
  it('el botón con código incompleto avisa y no verifica', async () => {
    await render(<VerifyEmailForm />);
    await enterCode('123');
    await fireEvent.press(screen.getByText('Verificar'));
    expect(alertSpy).toHaveBeenCalledWith('Código incompleto', 'Ingresa los 6 dígitos del código.');
    expect(mockAuth.completePendingVerification).not.toHaveBeenCalled();
  });

  it('completar los 6 dígitos verifica automáticamente y limpia los datos de invitado', async () => {
    await render(<VerifyEmailForm />);
    await enterCode('528301');
    expect(mockAuth.completePendingVerification).toHaveBeenCalledWith('528301');
    expect(mockAuth.completePendingVerification).toHaveBeenCalledTimes(1);
    expect(mockGuest.clearGuestData).toHaveBeenCalledTimes(1);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('el botón Verificar usa el código escrito', async () => {
    await render(<VerifyEmailForm />);
    await enterCode('52830');
    await enterCode('528301');
    mockAuth.completePendingVerification.mockClear();
    await fireEvent.press(screen.getByText('Verificar'));
    expect(mockAuth.completePendingVerification).toHaveBeenCalledWith('528301');
  });

  it('si el servidor rechaza el código avisa, lo vacía y no limpia datos de invitado', async () => {
    mockAuth.completePendingVerification.mockResolvedValue({ success: false, error: 'Código vencido' });
    await render(<VerifyEmailForm />);
    await enterCode('528301');
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Código vencido');
    expect(digits()).toEqual(['', '', '', '', '', '']);
    expect(mockGuest.clearGuestData).not.toHaveBeenCalled();
  });

  it('usa un mensaje por defecto si el rechazo no trae error', async () => {
    mockAuth.completePendingVerification.mockResolvedValue({ success: false });
    await render(<VerifyEmailForm />);
    await enterCode('528301');
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Código incorrecto o expirado.');
  });

  it('si la verificación lanza una excepción muestra su detalle y vacía el código', async () => {
    mockAuth.completePendingVerification.mockRejectedValue({
      response: { data: { detail: 'Demasiados intentos' } },
    });
    await render(<VerifyEmailForm />);
    await enterCode('528301');
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Demasiados intentos');
    expect(digits()).toEqual(['', '', '', '', '', '']);
  });

  it('tras un fallo permite volver a intentar', async () => {
    mockAuth.completePendingVerification.mockResolvedValueOnce({ success: false, error: 'mal' });
    await render(<VerifyEmailForm />);
    await enterCode('111111');
    await enterCode('222222');
    expect(mockAuth.completePendingVerification).toHaveBeenNthCalledWith(2, '222222');
  });
});

describe('VerifyEmailForm verificación sin sesión pendiente', () => {
  beforeEach(() => {
    mockAuth.pendingEmail = null;
    mockParams.email = 'ruta@mail.com';
  });

  it('verifica con el correo de la ruta, avisa y manda a login', async () => {
    await render(<VerifyEmailForm />);
    await enterCode('528301');
    expect(verifyMock).toHaveBeenCalledWith('ruta@mail.com', '528301');
    expect(alertSpy).toHaveBeenCalledWith('Correo verificado', 'Tu cuenta fue verificada. Ahora inicia sesión.');
    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    expect(mockAuth.completePendingVerification).not.toHaveBeenCalled();
  });

  it('si el servicio falla muestra el detalle y no navega', async () => {
    verifyMock.mockRejectedValue({ response: { data: { detail: 'Código inválido' } } });
    await render(<VerifyEmailForm />);
    await enterCode('528301');
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Código inválido');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('si el servicio falla sin detalle usa el mensaje por defecto', async () => {
    verifyMock.mockRejectedValue(new Error('boom'));
    await render(<VerifyEmailForm />);
    await enterCode('528301');
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Código incorrecto o expirado.');
  });
});

describe('VerifyEmailForm estado ocupado', () => {
  it('con isLoading el botón queda deshabilitado y sin texto', async () => {
    mockAuth.isLoading = true;
    await render(<VerifyEmailForm />);
    expect(screen.queryByText('Verificar')).toBeNull();
    const disabled = screen.container.queryAll((n) => n.props.accessibilityState?.disabled === true);
    expect(disabled.length).toBeGreaterThanOrEqual(2);
  });
});

describe('VerifyEmailForm reenvío con cooldown', () => {
  it('al inicio permite reenviar', async () => {
    await render(<VerifyEmailForm />);
    expect(screen.getByText('¿No recibiste el código? Reenviar')).toBeTruthy();
  });

  it('reenviar llama al contexto, avisa y arranca el cooldown de 60 s', async () => {
    await render(<VerifyEmailForm />);
    await fireEvent.press(screen.getByText('¿No recibiste el código? Reenviar'));
    expect(mockAuth.resendVerification).toHaveBeenCalledWith('pendiente@mail.com');
    expect(alertSpy).toHaveBeenCalledWith('Código enviado', 'Revisa tu correo (y la carpeta de spam).');
    expect(screen.getByText('Reenviar código en 60s')).toBeTruthy();
  });

  it('la cuenta regresiva baja cada segundo y al llegar a 0 se habilita otra vez', async () => {
    await render(<VerifyEmailForm />);
    await fireEvent.press(screen.getByText('¿No recibiste el código? Reenviar'));
    await advance(1);
    expect(screen.getByText('Reenviar código en 59s')).toBeTruthy();
    await advance(58);
    expect(screen.getByText('Reenviar código en 1s')).toBeTruthy();
    await advance(1);
    expect(screen.getByText('¿No recibiste el código? Reenviar')).toBeTruthy();
  });

  it('durante el cooldown no vuelve a llamar al reenvío', async () => {
    await render(<VerifyEmailForm />);
    await fireEvent.press(screen.getByText('¿No recibiste el código? Reenviar'));
    mockAuth.resendVerification.mockClear();
    await fireEvent.press(screen.getByText('Reenviar código en 60s'));
    expect(mockAuth.resendVerification).not.toHaveBeenCalled();
  });

  it('si el reenvío falla muestra el error y no inicia el cooldown', async () => {
    mockAuth.resendVerification.mockResolvedValue({ success: false, error: 'Límite alcanzado' });
    await render(<VerifyEmailForm />);
    await fireEvent.press(screen.getByText('¿No recibiste el código? Reenviar'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Límite alcanzado');
    expect(screen.getByText('¿No recibiste el código? Reenviar')).toBeTruthy();
  });

  it('el fallo del reenvío usa un mensaje por defecto', async () => {
    mockAuth.resendVerification.mockResolvedValue({ success: false });
    await render(<VerifyEmailForm />);
    await fireEvent.press(screen.getByText('¿No recibiste el código? Reenviar'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo reenviar el código.');
  });

  it('sin correo conocido no intenta reenviar', async () => {
    mockAuth.pendingEmail = null;
    await render(<VerifyEmailForm />);
    await fireEvent.press(screen.getByText('¿No recibiste el código? Reenviar'));
    expect(mockAuth.resendVerification).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
