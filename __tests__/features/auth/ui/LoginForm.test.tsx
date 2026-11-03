import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { LoginForm } from '@/features/auth/ui/LoginForm';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
const mockAuth = {
  login: jest.fn(),
  register: jest.fn(),
  isLoading: false,
};
const mockGuest: any = {
  guestHome: null,
  guestWorkplace: null,
  guestRecommendations: null,
  clearGuestData: jest.fn(),
};

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/features/auth/model/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/features/guest', () => ({ useGuest: () => mockGuest }));

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  mockAuth.isLoading = false;
  mockGuest.guestHome = null;
  mockGuest.guestWorkplace = null;
  mockGuest.guestRecommendations = null;
  mockGuest.clearGuestData.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

const type = (placeholder: string, text: string) =>
  fireEvent.changeText(screen.getByPlaceholderText(placeholder), text);

async function fillLogin(email = ' ana@mail.com ', password = 'secreto123') {
  await type('Correo electrónico', email);
  await type('Contraseña', password);
}

async function goRegister() {
  await fireEvent.press(screen.getByText('Regístrate'));
}

async function fillRegister(over: Partial<Record<'email' | 'password' | 'confirm' | 'name' | 'last', string>> = {}) {
  await type('Nombre', over.name ?? ' Ana ');
  await type('Apellido', over.last ?? ' Pérez ');
  await type('Correo electrónico', over.email ?? ' ana@mail.com ');
  await type('Contraseña', over.password ?? 'clave12345');
  await type('Confirmar contraseña', over.confirm ?? 'clave12345');
}

describe('LoginForm modo login', () => {
  it('muestra solo correo, contraseña, ingresar y olvidé mi contraseña', async () => {
    await render(<LoginForm />);
    expect(screen.getByPlaceholderText('Correo electrónico')).toBeTruthy();
    expect(screen.getByPlaceholderText('Contraseña')).toBeTruthy();
    expect(screen.getByText('Ingresar')).toBeTruthy();
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Nombre')).toBeNull();
    expect(screen.queryByPlaceholderText('Confirmar contraseña')).toBeNull();
    expect(screen.queryByText('Política de Privacidad')).toBeNull();
  });

  it('avisa si faltan correo o contraseña y no llama a login', async () => {
    await render(<LoginForm />);
    await fireEvent.press(screen.getByText('Ingresar'));
    expect(alertSpy).toHaveBeenCalledWith('Campos requeridos', 'Ingresa tu correo y contraseña.');

    await type('Correo electrónico', 'ana@mail.com');
    await fireEvent.press(screen.getByText('Ingresar'));
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it('trata un correo de solo espacios como vacío', async () => {
    await render(<LoginForm />);
    await fillLogin('   ', 'secreto123');
    await fireEvent.press(screen.getByText('Ingresar'));
    expect(alertSpy).toHaveBeenCalledWith('Campos requeridos', 'Ingresa tu correo y contraseña.');
    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it('inicia sesión con el correo recortado y limpia los datos de invitado', async () => {
    mockAuth.login.mockResolvedValue({ success: true });
    await render(<LoginForm />);
    await fillLogin();
    await fireEvent.press(screen.getByText('Ingresar'));
    expect(mockAuth.login).toHaveBeenCalledWith('ana@mail.com', 'secreto123');
    expect(mockGuest.clearGuestData).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor y conserva los datos de invitado', async () => {
    mockAuth.login.mockResolvedValue({ success: false, error: 'Credenciales inválidas' });
    await render(<LoginForm />);
    await fillLogin();
    await fireEvent.press(screen.getByText('Ingresar'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Credenciales inválidas');
    expect(mockGuest.clearGuestData).not.toHaveBeenCalled();
  });

  it('usa un mensaje por defecto si el servidor no da error', async () => {
    mockAuth.login.mockResolvedValue({ success: false });
    await render(<LoginForm />);
    await fillLogin();
    await fireEvent.press(screen.getByText('Ingresar'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Email o contraseña incorrectos.');
  });

  it('si la cuenta no está verificada avisa y navega a verify-email con el correo', async () => {
    mockAuth.login.mockResolvedValue({ success: false, needsVerification: true });
    await render(<LoginForm />);
    await fillLogin();
    await fireEvent.press(screen.getByText('Ingresar'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Verifica tu correo',
      'Tu cuenta aún no está verificada. Ingresa el código que te enviamos.',
    );
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/verify-email',
      params: { email: 'ana@mail.com' },
    });
    expect(mockGuest.clearGuestData).not.toHaveBeenCalled();
  });

  it('el enlace de contraseña olvidada navega a /forgot-password', async () => {
    await render(<LoginForm />);
    await fireEvent.press(screen.getByText('¿Olvidaste tu contraseña?'));
    expect(mockRouter.push).toHaveBeenCalledWith('/forgot-password');
  });

  it('con isLoading no muestra el texto del botón ni permite enviar', async () => {
    mockAuth.isLoading = true;
    await render(<LoginForm />);
    expect(screen.queryByText('Ingresar')).toBeNull();
    await fillLogin();
    const disabled = screen.container.queryAll((n) => n.props.accessibilityState?.disabled === true);
    expect(disabled).toHaveLength(1);
    await fireEvent.press(disabled[0]);
    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it('el ojo alterna la visibilidad de la contraseña', async () => {
    await render(<LoginForm />);
    const eye = () => {
      const row = screen.getByPlaceholderText('Contraseña').parent!;
      return row.children[row.children.length - 1] as any;
    };
    expect(screen.getByPlaceholderText('Contraseña').props.secureTextEntry).toBe(true);
    await fireEvent.press(eye());
    expect(screen.getByPlaceholderText('Contraseña').props.secureTextEntry).toBe(false);
    await fireEvent.press(eye());
    expect(screen.getByPlaceholderText('Contraseña').props.secureTextEntry).toBe(true);
  });
});

describe('LoginForm modo registro', () => {
  it('al alternar muestra campos de registro, consentimiento y oculta olvidé mi contraseña', async () => {
    await render(<LoginForm />);
    await goRegister();
    expect(screen.getByPlaceholderText('Nombre')).toBeTruthy();
    expect(screen.getByPlaceholderText('Apellido')).toBeTruthy();
    expect(screen.getByPlaceholderText('Confirmar contraseña')).toBeTruthy();
    expect(screen.getByText('Política de Privacidad')).toBeTruthy();
    expect(screen.getByText('Crear cuenta')).toBeTruthy();
    expect(screen.getByText('Inicia sesión')).toBeTruthy();
    expect(screen.queryByText('¿Olvidaste tu contraseña?')).toBeNull();
  });

  it('al volver a login se descartan los campos exclusivos del registro', async () => {
    await render(<LoginForm />);
    await goRegister();
    await type('Nombre', 'Ana');
    await type('Confirmar contraseña', 'x');
    await fireEvent.press(screen.getByText('Inicia sesión'));
    await goRegister();
    expect(screen.getByPlaceholderText('Nombre').props.value).toBe('');
    expect(screen.getByPlaceholderText('Confirmar contraseña').props.value).toBe('');
  });

  it('al volver a registro el consentimiento queda desmarcado', async () => {
    await render(<LoginForm />);
    await goRegister();
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByText('Inicia sesión'));
    await goRegister();
    expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
  });

  it('rechaza una contraseña de menos de 8 caracteres', async () => {
    await render(<LoginForm />);
    await goRegister();
    await fillRegister({ password: '1234567', confirm: '1234567' });
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Contraseña muy corta',
      'La contraseña debe tener al menos 8 caracteres.',
    );
    expect(mockAuth.register).not.toHaveBeenCalled();
  });

  it('acepta una contraseña de exactamente 8 caracteres', async () => {
    mockAuth.register.mockResolvedValue({ success: true });
    await render(<LoginForm />);
    await goRegister();
    await fillRegister({ password: '12345678', confirm: '12345678' });
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(mockAuth.register).toHaveBeenCalledTimes(1);
  });

  it('rechaza contraseñas que no coinciden', async () => {
    await render(<LoginForm />);
    await goRegister();
    await fillRegister({ confirm: 'otra-clave' });
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Las contraseñas no coinciden.');
    expect(mockAuth.register).not.toHaveBeenCalled();
  });

  it('exige aceptar la Política de Privacidad', async () => {
    await render(<LoginForm />);
    await goRegister();
    await fillRegister();
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Política de Privacidad',
      'Debes aceptar la Política de Privacidad para crear tu cuenta.',
    );
    expect(mockAuth.register).not.toHaveBeenCalled();
  });

  it('en registro también exige correo y contraseña', async () => {
    await render(<LoginForm />);
    await goRegister();
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(alertSpy).toHaveBeenCalledWith('Campos requeridos', 'Ingresa tu correo y contraseña.');
  });

  it('el enlace de la política navega a /privacy-policy', async () => {
    await render(<LoginForm />);
    await goRegister();
    await fireEvent.press(screen.getByText('Política de Privacidad'));
    expect(mockRouter.push).toHaveBeenCalledWith('/privacy-policy');
  });

  it('registra sin datos de invitado y navega a verify-email', async () => {
    mockAuth.register.mockResolvedValue({ success: true });
    await render(<LoginForm />);
    await goRegister();
    await fillRegister();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(mockAuth.register).toHaveBeenCalledWith(
      'ana@mail.com',
      'clave12345',
      { home: undefined, workplace: undefined, recommendations: undefined },
      'Ana',
      'Pérez',
      true,
    );
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/verify-email',
      params: { email: 'ana@mail.com' },
    });
    expect(mockGuest.clearGuestData).not.toHaveBeenCalled();
  });

  it('envía nombre y apellido vacíos como undefined', async () => {
    mockAuth.register.mockResolvedValue({ success: true });
    await render(<LoginForm />);
    await goRegister();
    await fillRegister({ name: '  ', last: '' });
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Crear cuenta'));
    const args = mockAuth.register.mock.calls[0];
    expect(args[3]).toBeUndefined();
    expect(args[4]).toBeUndefined();
  });

  it('transfiere los datos de invitado (vivienda, trabajo y recomendaciones)', async () => {
    const recs = { items: [], total: 0 };
    mockGuest.guestHome = { lat: -12.1, lon: -77.0, address: 'Jr. Lima 1', extra: 'ignorado' };
    mockGuest.guestWorkplace = {
      lat: -12.0,
      lon: -77.1,
      budget: 1800,
      transport: 'walking',
      address: 'Av. Perú 2',
      maxDistanceKm: 7,
      extra: 'ignorado',
    };
    mockGuest.guestRecommendations = recs;
    mockAuth.register.mockResolvedValue({ success: true });
    await render(<LoginForm />);
    await goRegister();
    await fillRegister();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(mockAuth.register.mock.calls[0][2]).toEqual({
      home: { lat: -12.1, lon: -77.0, address: 'Jr. Lima 1' },
      workplace: {
        lat: -12.0,
        lon: -77.1,
        budget: 1800,
        transport: 'walking',
        address: 'Av. Perú 2',
        maxDistanceKm: 7,
      },
      recommendations: recs,
    });
  });

  it('si el registro falla muestra el error y no navega', async () => {
    mockAuth.register.mockResolvedValue({ success: false, error: 'Correo ya registrado' });
    await render(<LoginForm />);
    await goRegister();
    await fillRegister();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(alertSpy).toHaveBeenCalledWith('Error al registrar', 'Correo ya registrado');
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('usa un mensaje por defecto si el registro falla sin detalle', async () => {
    mockAuth.register.mockResolvedValue({ success: false });
    await render(<LoginForm />);
    await goRegister();
    await fillRegister();
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByText('Crear cuenta'));
    expect(alertSpy).toHaveBeenCalledWith('Error al registrar', 'Intenta con otro email.');
  });
});
