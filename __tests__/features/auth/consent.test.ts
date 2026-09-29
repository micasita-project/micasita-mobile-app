import { needsConsent } from '@/features/auth/model/consent';
import type { AuthUser } from '@/features/auth/api/auth.service';

const baseUser: AuthUser = {
  id: 1,
  email: 'u@test.com',
  role: 'user',
  home_lat: null,
  home_lon: null,
  home_address: null,
};

describe('needsConsent', () => {
  it('is false when nobody is logged in', () => {
    expect(needsConsent(null)).toBe(false);
  });

  it('is true for an account that never accepted the policy (null)', () => {
    expect(needsConsent({ ...baseUser, consent_accepted_at: null })).toBe(true);
  });

  it('is true when the field is missing from the API response', () => {
    expect(needsConsent(baseUser)).toBe(true);
  });

  it('is false once the account has a consent date', () => {
    expect(needsConsent({ ...baseUser, consent_accepted_at: '2026-09-28T15:00:00' })).toBe(false);
  });
});
