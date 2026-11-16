/**
 * @layer features/admin
 * @description API pública de features/admin.
 */

export { getAllUsers, getPendingProperties, updatePropertyStatus, updateUserStatus } from './api/admin.api';
export type { AdminUserResponse } from './api/admin.api';
export { AdminPropertyCard } from './ui/AdminPropertyCard';
export { AdminUserCard } from './ui/AdminUserCard';
