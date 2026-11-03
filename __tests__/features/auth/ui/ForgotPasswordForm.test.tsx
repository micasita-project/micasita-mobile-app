import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { ForgotPasswordForm } from '@/features/auth/ui/ForgotPasswordForm';
import { forgotPassword, resetPassword } from '@/features/auth/api/auth.service';

const mockRouter = { push: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/features/auth/api/auth.service', () => ({
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
}));

const forgotMock = forgotPassword as jest.Mock;
const resetMock = resetPassword as jest.Mock;
let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  forgotMock.mockResolvedValue(undefined);
  resetMock.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
});

const type = (placeholder: string, text: string) =>
  fireEvent.changeText(screen.getByPlaceholderText(placeholder), text);

async function advance(seconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(seconds * 1000);
  });
}

async function toResetStep(email = ' ana@mail.com ') {
  await render(<ForgotPasswordForm />);
  await type('Correo electrónico', email);
  await fireEvent.press(screen.getByText('Enviar código'));
}

async function fillReset(over: { otp?: string; password?: string; confirm?: string } = {}) {
  await fireEvent.changeText(screen.getByTestId('otp-input'), over.otp ?? '123456');
  await type('Nueva contraseña', over.password ?? 'nuevaClave1');
  await type('Confirmar contraseña', over.confirm ?? 'nuevaClave1');
}

describe('ForgotPasswordForm paso solicitar', () => {
  it('muestra el campo de correo y el botón de envío', async () => {
    await render(<ForgotPasswordForm />);
    expect(screen.getByPlaceholderText('Correo electrónico')).toBeTruthy();
    expect(screen.getByText('Enviar código')).toBeTruthy();
    expect(screen.queryByTestId('otp-input')).toBeNull();
  });

  it('pide el correo si está vacío y no llama al servicio', async () => {
    await render(<ForgotPasswordForm />);
    await type('Correo electrónico', '   ');
    await fireEvent.press(screen.getByText('Enviar código'));
    expect(alertSpy).toHaveBeenCalledWith('Campo requerido', 'Ingresa tu correo electrónico.');
    expect(forgotMock).not.toHaveBeenCalled();
  });

  it('envía el correo recortado y pasa al paso de restablecer', async () => {
    await toResetStep();
    expect(forgotMock).toHaveBeenCalledWith('ana@mail.com');
    expect(screen.getByText('Restablecer contraseña')).toBeTruthy();
    expect(screen.getByTestId('otp-input')).toBeTruthy();
  });

  it('si el envío falla avisa y se queda en el primer paso', async () => {
    forgotMock.mockRejectedValue(new Error('red'));
    await toResetStep();
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo enviar el código. Intenta de nuevo.');
    expect(screen.getByText('Enviar código')).toBeTruthy();
    expect(screen.queryByTestId('otp-input')).toBeNull();
  });
});

describe('ForgotPasswordForm paso restablecer', () => {
  it('muestra el correo al que se envió el código', async () => {
    await toResetStep('ana@mail.com');
    expect(screen.getByText('ana@mail.com')).toBeTruthy();
  });

  it('rechaza un código incompleto', async () => {
    await toResetStep();
    await fillReset({ otp: '12345' });
    await fireEvent.press(screen.getByText('Restablecer contraseña'));
    expect(alertSpy).toHaveBeenCalledWith('Código incompleto', 'Ingresa los 6 dígitos del código.');
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('rechaza una contraseña de menos de 8 caracteres', async () => {
    await toResetStep();
    await fillReset({ password: '1234567', confirm: '1234567' });
    await fireEvent.press(screen.getByText('Restablecer contraseña'));
    expect(alertSpy).toHaveBeenCalledWith('Contraseña muy corta', 'Debe tener al menos 8 caracteres.');
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('rechaza contraseñas que no coinciden', async () => {
    await toResetStep();
    await fillReset({ confirm: 'distinta123' });
    await fireEvent.press(screen.getByText('Restablecer contraseña'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Las contraseñas no coinciden.');
    expect(resetMock).not.toHaveBeenCalled();
  });

  it('restablece con correo, código y contraseña, avisa y vuelve a login', async () => {
    await toResetStep();
    await fillReset();
    await fireEvent.press(screen.getByText('Restablecer contraseña'));
    expect(resetMock).toHaveBeenCalledWith('ana@mail.com', '123456', 'nuevaClave1');
    expect(alertSpy).toHaveBeenCalledWith(
      'Contraseña actualizada',
      'Ya puedes iniciar sesión con tu nueva contraseña.',
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
  });

  it('si el servidor rechaza el código muestra su detalle, vacía el código y no navega', async () => {
    resetMock.mockRejectedValue({ response: { data: { detail: 'Código expirado' } } });
    await toResetStep();
    await fillReset();
    await fireEvent.press(screen.getByText('Restablecer contraseña'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Código expirado');
    expect(screen.getAllByTestId('otp-digit').map((d) => d.props.children)).toEqual(['', '', '', '', '', '']);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('usa un mensaje por defecto si el error no trae detalle', async () => {
    resetMock.mockRejectedValue(new Error('boom'));
    await toResetStep();
    await fillReset();
    await fireEvent.press(screen.getByText('Restablecer contraseña'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Código incorrecto o expirado.');
  });

  it('el ojo alterna la visibilidad de las contraseñas', async () => {
    await toResetStep();
    const eye = () => {
      const row = screen.getByPlaceholderText('Nueva contraseña').parent!;
      return row.children[row.children.length - 1] as any;
    };
    expect(screen.getByPlaceholderText('Nueva contraseña').props.secureTextEntry).toBe(true);
    await fireEvent.press(eye());
    expect(screen.getByPlaceholderText('Nueva contraseña').props.secureTextEntry).toBe(false);
    expect(screen.getByPlaceholderText('Confirmar contraseña').props.secureTextEntry).toBe(false);
  });
});

describe('ForgotPasswordForm reenvío con cooldown', () => {
  it('tras enviar el código el reenvío queda bloqueado 60 s', async () => {
    await toResetStep();
    expect(screen.getByText('Reenviar código en 60s')).toBeTruthy();
  });

  it('la cuenta regresiva baja cada segundo', async () => {
    await toResetStep();
    await advance(1);
    expect(screen.getByText('Reenviar código en 59s')).toBeTruthy();
    await advance(29);
    expect(screen.getByText('Reenviar código en 30s')).toBeTruthy();
  });

  it('pulsar el reenvío durante el cooldown no llama al servicio', async () => {
    await toResetStep();
    forgotMock.mockClear();
    await fireEvent.press(screen.getByText('Reenviar código en 60s'));
    expect(forgotMock).not.toHaveBeenCalled();
  });

  it('al terminar los 60 s se habilita el reenvío', async () => {
    await toResetStep();
    await advance(59);
    expect(screen.getByText('Reenviar código en 1s')).toBeTruthy();
    await advance(1);
    expect(screen.getByText('¿No recibiste el código? Reenviar')).toBeTruthy();
  });

  it('reenviar vuelve a pedir el código, avisa y reinicia el cooldown', async () => {
    await toResetStep();
    await advance(60);
    forgotMock.mockClear();
    await fireEvent.press(screen.getByText('¿No recibiste el código? Reenviar'));
    expect(forgotMock).toHaveBeenCalledWith('ana@mail.com');
    expect(alertSpy).toHaveBeenCalledWith('Código enviado', 'Revisa tu correo (y la carpeta de spam).');
    expect(screen.getByText('Reenviar código en 60s')).toBeTruthy();
  });

  it('si el reenvío falla avisa y no reinicia el cooldown', async () => {
    await toResetStep();
    await advance(60);
    forgotMock.mockRejectedValue(new Error('red'));
    await fireEvent.press(screen.getByText('¿No recibiste el código? Reenviar'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'No se pudo reenviar el código.');
    expect(screen.getByText('¿No recibiste el código? Reenviar')).toBeTruthy();
  });
});
