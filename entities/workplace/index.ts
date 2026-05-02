/**
 * @layer entities/workplace
 * @description Barrel export para la entidad Workplace.
 */

export {
  fetchWorkplaces,
  createWorkplace,
  deleteWorkplace,
  updateWorkplace,
} from './api/workplace.api';

export type {
  Workplace,
  CreateWorkplaceRequest,
  UpdateWorkplaceRequest,
} from './api/workplace.api';
