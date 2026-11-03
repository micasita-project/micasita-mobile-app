import {
  nextStep,
  previousStep,
  stepNumber,
  validateSetupStep,
} from '@/features/guest/model/setupSteps';

const FULL = { homeSelected: true, workSelected: true, budget: '1500' };

describe('navegación entre pasos', () => {
  it('avanza home → work → prefs y se queda en el último', () => {
    expect(nextStep('home')).toBe('work');
    expect(nextStep('work')).toBe('prefs');
    expect(nextStep('prefs')).toBe('prefs');
  });

  it('retrocede prefs → work → home y se queda en el primero', () => {
    expect(previousStep('prefs')).toBe('work');
    expect(previousStep('work')).toBe('home');
    expect(previousStep('home')).toBe('home');
  });

  it('numera los pasos de 1 a 3', () => {
    expect(['home', 'work', 'prefs'].map((s) => stepNumber(s as any))).toEqual([1, 2, 3]);
  });
});

describe('validateSetupStep', () => {
  it('exige la vivienda en el paso home', () => {
    expect(validateSetupStep('home', { ...FULL, homeSelected: false })?.message).toMatch(/vivienda/);
    expect(validateSetupStep('home', FULL)).toBeNull();
  });

  it('exige el lugar de trabajo en el paso work', () => {
    expect(validateSetupStep('work', { ...FULL, workSelected: false })?.message).toMatch(/trabajo/);
    expect(validateSetupStep('work', FULL)).toBeNull();
  });

  it('exige un presupuesto positivo en el paso prefs', () => {
    expect(validateSetupStep('prefs', { ...FULL, budget: '' })).not.toBeNull();
    expect(validateSetupStep('prefs', { ...FULL, budget: '0' })).not.toBeNull();
    expect(validateSetupStep('prefs', { ...FULL, budget: '-5' })).not.toBeNull();
    expect(validateSetupStep('prefs', { ...FULL, budget: 'abc' })).not.toBeNull();
    expect(validateSetupStep('prefs', FULL)).toBeNull();
  });

  it('cada paso solo valida lo suyo', () => {
    expect(validateSetupStep('work', { homeSelected: false, workSelected: true, budget: '' })).toBeNull();
    expect(validateSetupStep('prefs', { homeSelected: false, workSelected: false, budget: '900' })).toBeNull();
  });

  it('no valida el presupuesto en pasos anteriores', () => {
    expect(validateSetupStep('home', { ...FULL, budget: '' })).toBeNull();
    expect(validateSetupStep('work', { ...FULL, budget: '' })).toBeNull();
  });
});
