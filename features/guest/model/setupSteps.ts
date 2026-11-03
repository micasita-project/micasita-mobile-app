/**
 * @layer features/guest/model
 * @description Pasos y validación del asistente de configuración de búsqueda.
 */

export type SetupStep = 'home' | 'work' | 'prefs';

export const SETUP_STEPS: SetupStep[] = ['home', 'work', 'prefs'];

export function stepNumber(step: SetupStep): number {
  return SETUP_STEPS.indexOf(step) + 1;
}

export function nextStep(step: SetupStep): SetupStep {
  return SETUP_STEPS[Math.min(SETUP_STEPS.indexOf(step) + 1, SETUP_STEPS.length - 1)];
}

export function previousStep(step: SetupStep): SetupStep {
  return SETUP_STEPS[Math.max(SETUP_STEPS.indexOf(step) - 1, 0)];
}

export interface SetupDraft {
  homeSelected: boolean;
  workSelected: boolean;
  budget: string;
}

/** Devuelve el mensaje de error del paso, o null si puede avanzar. */
export function validateSetupStep(step: SetupStep, draft: SetupDraft): { title: string; message: string } | null {
  if (step === 'home' && !draft.homeSelected) {
    return { title: 'Falta dirección', message: 'Busca y selecciona tu vivienda actual.' };
  }
  if (step === 'work' && !draft.workSelected) {
    return { title: 'Falta dirección', message: 'Busca y selecciona tu lugar de trabajo.' };
  }
  if (step === 'prefs') {
    const budget = parseFloat(draft.budget);
    if (isNaN(budget) || budget <= 0) {
      return { title: 'Presupuesto inválido', message: 'Ingresa un presupuesto mensual válido.' };
    }
  }
  return null;
}
