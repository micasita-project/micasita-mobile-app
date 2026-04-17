/**
 * @layer entities/housing
 * @description Barrel export para la entidad Housing.
 * Centraliza todas las exportaciones del slice.
 */

// Model (lógica de negocio)
export {
  getAllHousing,
  getHousingById,
  getHousingByDistrict,
  getAvailableDistricts,
  getHousingByPriceRange,
} from './api/housing.service';

// UI (componentes de presentación)
export { HousingCard } from './ui/HousingCard';
export { HousingMarker } from './ui/HousingMarker';
