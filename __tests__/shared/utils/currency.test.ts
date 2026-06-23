import { getCurrencySymbol, formatPrice } from '@/shared/utils/currency';

describe('getCurrencySymbol', () => {
  it('returns USD for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('USD');
  });

  it('returns S/ for PEN', () => {
    expect(getCurrencySymbol('PEN')).toBe('S/');
  });

  it('returns S/ for unknown currency codes', () => {
    expect(getCurrencySymbol('EUR')).toBe('S/');
    expect(getCurrencySymbol('GBP')).toBe('S/');
  });

  it('returns S/ for null', () => {
    expect(getCurrencySymbol(null)).toBe('S/');
  });

  it('returns S/ for undefined', () => {
    expect(getCurrencySymbol(undefined)).toBe('S/');
  });
});

describe('formatPrice', () => {
  it('formats PEN price with S/ prefix', () => {
    const result = formatPrice(1500, 'PEN');
    expect(result).toContain('S/');
    expect(result).toContain('1');
  });

  it('formats USD price with USD prefix', () => {
    const result = formatPrice(1000, 'USD');
    expect(result).toContain('USD');
    expect(result).toContain('1');
  });

  it('defaults price to 0 when null', () => {
    const result = formatPrice(null, 'PEN');
    expect(result).toContain('0');
  });

  it('defaults price to 0 when undefined', () => {
    const result = formatPrice(undefined, 'PEN');
    expect(result).toContain('0');
  });

  it('defaults currency to S/ when null', () => {
    const result = formatPrice(500, null);
    expect(result).toContain('S/');
  });

  it('formats zero price without crashing', () => {
    const result = formatPrice(0, 'PEN');
    expect(result).toContain('S/');
    expect(result).toContain('0');
  });
});
