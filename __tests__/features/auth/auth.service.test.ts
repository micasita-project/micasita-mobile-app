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

import { apiClient, saveAuthToken, removeAuthToken } from '@/shared/api';
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateHome,
  updateProfile,
} from '@/features/auth/api/auth.service';

const mockPost = apiClient.post as jest.Mock;
const mockGet = apiClient.get as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;
const mockSaveToken = saveAuthToken as jest.Mock;
const mockRemoveToken = removeAuthToken as jest.Mock;

// ── registerUser ──────────────────────────────────────────────────────────────

describe('registerUser', () => {
  it('posts to /auth/register and returns the response', async () => {
    const response = { id: 1, email: 'user@test.com', role: 'user' };
    mockPost.mockResolvedValueOnce({ data: response });

    const result = await registerUser({ email: 'user@test.com', password: 'secret' });

    expect(mockPost).toHaveBeenCalledWith('/auth/register', { email: 'user@test.com', password: 'secret' });
    expect(result).toEqual(response);
  });

  it('includes optional name fields when provided', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 2, email: 'u@t.com', role: 'user' } });

    await registerUser({ email: 'u@t.com', password: 'pass', name: 'Juan', last_name: 'Pérez' });

    expect(mockPost).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
      name: 'Juan',
      last_name: 'Pérez',
    }));
  });
});

// ── loginUser ─────────────────────────────────────────────────────────────────

describe('loginUser', () => {
  it('sends form-data to /auth/login (not JSON)', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'tok', token_type: 'bearer' } });

    await loginUser('user@test.com', 'password');

    expect(mockPost).toHaveBeenCalledWith(
      '/auth/login',
      expect.any(String), // URLSearchParams stringified body
      expect.objectContaining({ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    );
  });

  it('encodes email as username in form body', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'tok', token_type: 'bearer' } });

    await loginUser('user@test.com', 'mypass');

    const body = mockPost.mock.calls[0][1] as string;
    expect(body).toContain('username=');
    expect(body).toContain('user');
  });

  it('saves the access token after login', async () => {
    mockPost.mockResolvedValueOnce({ data: { access_token: 'jwt123', token_type: 'bearer' } });

    await loginUser('u@t.com', 'pass');

    expect(mockSaveToken).toHaveBeenCalledWith('jwt123');
  });

  it('returns the login response data', async () => {
    const loginData = { access_token: 'mytoken', token_type: 'bearer' };
    mockPost.mockResolvedValueOnce({ data: loginData });

    const result = await loginUser('u@t.com', 'pass');

    expect(result).toEqual(loginData);
  });
});

// ── logoutUser ────────────────────────────────────────────────────────────────

describe('logoutUser', () => {
  it('removes the auth token', async () => {
    await logoutUser();
    expect(mockRemoveToken).toHaveBeenCalledTimes(1);
  });

  it('does not make any API requests', async () => {
    await logoutUser();
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockGet).not.toHaveBeenCalled();
  });
});

// ── getMe ─────────────────────────────────────────────────────────────────────

describe('getMe', () => {
  it('calls GET /auth/me and returns user data', async () => {
    const user = { id: 1, email: 'u@test.com', role: 'user', home_lat: null, home_lon: null, home_address: null };
    mockGet.mockResolvedValueOnce({ data: user });

    const result = await getMe();

    expect(mockGet).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual(user);
  });
});

// ── updateHome ────────────────────────────────────────────────────────────────

describe('updateHome', () => {
  it('calls PUT /auth/me/home with location data', async () => {
    const homeData = { home_lat: -12.046, home_lon: -77.042, home_address: 'Av. Lima 123' };
    const updated = { id: 1, email: 'u@test.com', role: 'user', ...homeData };
    mockPut.mockResolvedValueOnce({ data: updated });

    const result = await updateHome(homeData);

    expect(mockPut).toHaveBeenCalledWith('/auth/me/home', homeData);
    expect(result.home_lat).toBe(-12.046);
    expect(result.home_lon).toBe(-77.042);
  });
});

// ── updateProfile ─────────────────────────────────────────────────────────────

describe('updateProfile', () => {
  it('calls PATCH /auth/me with name data', async () => {
    const updated = { id: 1, email: 'u@test.com', role: 'user', name: 'Juan', last_name: 'Pérez', home_lat: null, home_lon: null, home_address: null };
    mockPatch.mockResolvedValueOnce({ data: updated });

    const result = await updateProfile({ name: 'Juan', last_name: 'Pérez' });

    expect(mockPatch).toHaveBeenCalledWith('/auth/me', { name: 'Juan', last_name: 'Pérez' });
    expect(result.name).toBe('Juan');
    expect(result.last_name).toBe('Pérez');
  });
});
