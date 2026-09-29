/**
 * @layer features/auth/model
 * @description Decide si un usuario debe aceptar la política de privacidad antes de usar la app.
 */

import type { AuthUser } from '../api/auth.service';

export function needsConsent(user: AuthUser | null): boolean {
  return !!user && !user.consent_accepted_at;
}
