/**
 * @layer shared/api
 * @description Barrel export para la capa de API compartida.
 */

export { apiClient, saveAuthToken, getAuthToken, removeAuthToken } from './apiClient';
export { queryClient } from './queryClient';

export { reverseAddress, searchAddress } from './geocode.service';
export type { GeocodeSuggestion } from './geocode.service';
