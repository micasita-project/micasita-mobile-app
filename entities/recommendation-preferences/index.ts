/**
 * @layer entities/recommendation-preferences
 * @description Barrel export para la entidad RecommendationPreferences.
 */

export {
  createPreference,
  fetchPreferences,
  updatePreference,
} from './api/recommendation-preferences.api';

export type {
  RecommendationPreference,
  CreatePreferenceRequest,
  UpdatePreferenceRequest,
} from './api/recommendation-preferences.api';

export {
  usePreferences,
  useCreatePreference,
  useUpdatePreference,
} from './model/useRecommendationPreferences';
