/**
 * @layer app (pages)
 * @description Ruta modal para el wizard de publicación de viviendas.
 * Renderiza el PublishWizard del feature publish-housing.
 */

import { useAuth } from '@/features/auth';
import { PublishWizard } from '@/features/publish-housing';

export default function PublishHousingScreen() {
  const { user } = useAuth();
  return <PublishWizard user={user} />;
}
