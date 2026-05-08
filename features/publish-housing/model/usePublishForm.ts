/**
 * @layer features/publish-housing/model
 * @description Hook de estado para el wizard de publicación de viviendas.
 * Gestiona los datos de los 4 pasos y el envío a Supabase.
 */

import { useState, useCallback } from 'react';
import type { HousingDraft } from '@/shared/types';
import { submitHousingListing, updateHousingListing } from './publishHousing.service';

const INITIAL_DRAFT: HousingDraft = {
  // Paso 1
  address: '',
  district: '',
  latitude: -12.0464,
  longitude: -77.0428, // Lima centro
  // Paso 2
  title: '',
  property_type: 'Departamento',
  currency: 'PEN',
  price: 0,
  total_area_sqm: 0,
  covered_area_sqm: 0,
  bedrooms: 1,
  bathrooms: 1,
  parking: 0,
  antiquity: 0,
  description: '',
  // Paso 3
  localImageUris: [],
  // Paso 4
  features: [],
};

export type WizardStep = 1 | 2 | 3 | 4;

interface UsePublishFormReturn {
  currentStep: WizardStep;
  draft: HousingDraft;
  isSubmitting: boolean;
  error: string | null;
  updateDraft: (partial: Partial<HousingDraft>) => void;
  nextStep: () => void;
  prevStep: () => void;
  submit: (userId: string, userEmail: string) => Promise<boolean>;
  update: (propertyId: string) => Promise<boolean>;
  reset: () => void;
}

export function usePublishForm(initialDraft?: HousingDraft, propertyId?: string): UsePublishFormReturn {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState<HousingDraft>(initialDraft || INITIAL_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDraft = useCallback((partial: Partial<HousingDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : prev));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev));
  }, []);

  const submit = useCallback(
    async (userId: string, userEmail: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        await submitHousingListing(draft, userId, userEmail);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [draft]
  );

  const update = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        await updateHousingListing(id, draft);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido al actualizar');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [draft]
  );

  const reset = useCallback(() => {
    setDraft(INITIAL_DRAFT);
    setCurrentStep(1);
    setError(null);
  }, []);

  return { currentStep, draft, isSubmitting, error, updateDraft, nextStep, prevStep, submit, update, reset };
}
