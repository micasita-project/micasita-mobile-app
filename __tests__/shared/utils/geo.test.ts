import { isWithinLima } from '@/shared/utils/geo';

// Lima bbox: lat ∈ [-12.55, -11.70], lon ∈ [-77.20, -76.65]

describe('isWithinLima', () => {
  it('returns true for Lima Centro', () => {
    expect(isWithinLima(-12.046, -77.042)).toBe(true);
  });

  it('returns true for Miraflores', () => {
    expect(isWithinLima(-12.119, -77.029)).toBe(true);
  });

  it('returns true for San Isidro', () => {
    expect(isWithinLima(-12.097, -77.036)).toBe(true);
  });

  it('returns false when latitude is too far south (< -12.55)', () => {
    expect(isWithinLima(-13.0, -77.042)).toBe(false);
  });

  it('returns false when latitude is too far north (> -11.70)', () => {
    expect(isWithinLima(-11.0, -77.042)).toBe(false);
  });

  it('returns false when longitude is too far west (< -77.20)', () => {
    expect(isWithinLima(-12.046, -78.0)).toBe(false);
  });

  it('returns false when longitude is too far east (> -76.65)', () => {
    expect(isWithinLima(-12.046, -76.0)).toBe(false);
  });

  it('returns true at the southern boundary (-12.55)', () => {
    expect(isWithinLima(-12.55, -77.0)).toBe(true);
  });

  it('returns true at the northern boundary (-11.70)', () => {
    expect(isWithinLima(-11.70, -77.0)).toBe(true);
  });

  it('returns true at the western boundary (-77.20)', () => {
    expect(isWithinLima(-12.0, -77.20)).toBe(true);
  });

  it('returns true at the eastern boundary (-76.65)', () => {
    expect(isWithinLima(-12.0, -76.65)).toBe(true);
  });

  it('returns false for completely outside Lima', () => {
    expect(isWithinLima(-15.0, -75.0)).toBe(false);
  });
});
