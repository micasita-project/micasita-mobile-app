jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
  },
  saveAuthToken: jest.fn(),
  removeAuthToken: jest.fn(),
}));

import { apiClient } from '@/shared/api';
import {
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '@/features/auth/api/auth.service';

const mockPost = apiClient.post as jest.Mock;

// ── verifyEmail ───────────────────────────────────────────────────────────────

describe('verifyEmail', () => {
  it('posts email and otp to /auth/verify-email', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'ok' } });

    await verifyEmail('user@test.com', '123456');

    expect(mockPost).toHaveBeenCalledWith('/auth/verify-email', {
      email: 'user@test.com',
      otp: '123456',
    });
  });

  it('returns the backend message', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'Correo verificado' } });

    const result = await verifyEmail('user@test.com', '123456');

    expect(result.message).toBe('Correo verificado');
  });

  it('re-throws backend errors (e.g. código incorrecto)', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { detail: 'Código incorrecto o expirado' } } });

    await expect(verifyEmail('user@test.com', '000000')).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});

// ── resendVerification ────────────────────────────────────────────────────────

describe('resendVerification', () => {
  it('posts only the email to /auth/resend-verification', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'enviado' } });

    await resendVerification('user@test.com');

    expect(mockPost).toHaveBeenCalledWith('/auth/resend-verification', {
      email: 'user@test.com',
    });
  });

  it('returns the backend message', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'Nuevo código enviado' } });

    const result = await resendVerification('user@test.com');

    expect(result.message).toBe('Nuevo código enviado');
  });
});

// ── forgotPassword ────────────────────────────────────────────────────────────

describe('forgotPassword', () => {
  it('posts only the email to /auth/forgot-password', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'generic' } });

    await forgotPassword('user@test.com');

    expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'user@test.com',
    });
  });

  it('returns the generic backend message', async () => {
    mockPost.mockResolvedValueOnce({
      data: { message: 'Si ese correo está registrado, recibirás un código en breve.' },
    });

    const result = await forgotPassword('user@test.com');

    expect(result.message).toContain('recibirás un código');
  });
});

// ── resetPassword ─────────────────────────────────────────────────────────────

describe('resetPassword', () => {
  it('maps newPassword to new_password in the request body', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'ok' } });

    await resetPassword('user@test.com', '654321', 'newSecret123');

    expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
      email: 'user@test.com',
      otp: '654321',
      new_password: 'newSecret123',
    });
  });

  it('returns the backend message on success', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'Contraseña actualizada correctamente.' } });

    const result = await resetPassword('user@test.com', '654321', 'newSecret123');

    expect(result.message).toContain('Contraseña actualizada');
  });

  it('re-throws when the OTP is invalid', async () => {
    mockPost.mockRejectedValueOnce({ response: { status: 400, data: { detail: 'Código incorrecto o expirado' } } });

    await expect(resetPassword('user@test.com', '000000', 'newSecret123')).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});
