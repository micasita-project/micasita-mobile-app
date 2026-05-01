/**
 * @layer features/recommendation
 * @description Barrel export para la feature de Recomendaciones IA.
 */

export {
  getGuestRecommendations,
  generateRecommendations,
  getLatestRecommendations,
} from './api/recommendation.api';

export type {
  GuestRecommendRequest,
  RecommendationItem,
} from './api/recommendation.api';

export {
  useGuestRecommendations,
  useLatestRecommendations,
  useGenerateRecommendations,
} from './model/useRecommendations';
