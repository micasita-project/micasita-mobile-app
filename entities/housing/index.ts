/**
 * @layer entities/housing
 * @description Barrel export para la entidad Housing.
 * Centraliza todas las exportaciones del slice.
 */

// Model (lógica de negocio)
export {
  fetchAllProperties,
  fetchPropertyById,
} from './api/housing.api';

// UI (componentes de presentación)
export { HousingCard } from './ui/HousingCard';
export { HousingMarker } from './ui/HousingMarker';
