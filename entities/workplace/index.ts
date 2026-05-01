/**
 * @layer entities/workplace
 * @description Barrel export para la entidad Workplace.
 */

export {
  fetchWorkplaces,
  createWorkplace,
  deleteWorkplace,
} from './api/workplace.api';

export type { Workplace, CreateWorkplaceRequest } from './api/workplace.api';
