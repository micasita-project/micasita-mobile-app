/**
 * @layer entities/recommendation
 * @description Barrel export para la feature de Recomendaciones IA.
 */

export {
  generateRecommendations,
  getGuestRecommendations,
  getLatestRecommendations,
} from "./api/recommendation.api";

export type {
  GuestRecommendRequest,
  RecommendationItem,
  RecommendationPageResponse,
} from "./api/recommendation.api";

export {
  useGenerateRecommendations,
  useGuestRecommendations,
  useLatestRecommendations,
} from "./model/useRecommendations";

export {
  buildInsightBody,
  buildInsightTitle,
  buildRecommendationMessage,
  scoreLabel,
} from "./model/recommendationMessage";

export { importGuestRecommendations } from './api/recommendation.api';
export { guestGenerateKey, recommendKeys } from './model/useRecommendations';
