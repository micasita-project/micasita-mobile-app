/**
 * @layer features/publish-housing/model
 * @description Validación de cada paso del wizard de publicación.
 */

import type { HousingDraft } from '@/shared/types';
import { isWithinLima, LIMA_LOCATION_ERROR } from '@/shared/utils/geo';

export function validateStep(step: number, draft: HousingDraft): string | null {
  switch (step) {
    case 1:
      if (!draft.address.trim()) return 'Por favor ingresa la dirección.';
      if (!draft.district) return 'Por favor selecciona el distrito.';
      if (!isWithinLima(draft.latitude, draft.longitude)) return LIMA_LOCATION_ERROR;
      return null;
    case 2:
      if (!draft.title.trim()) return 'Por favor ingresa el título del anuncio.';
      if (draft.price <= 0) return 'El precio debe ser mayor a 0.';
      if (draft.total_area_sqm <= 0) return 'El área total debe ser mayor a 0 m².';
      if (!draft.description.trim()) return 'Por favor agrega una descripción.';
      if (draft.phone && draft.phone.trim().length > 0 && draft.phone.trim().length !== 9)
        return 'El teléfono de contacto debe tener exactamente 9 dígitos.';
      return null;
    case 3:
      if (draft.localImageUris.length === 0)
        return 'Por favor agrega al menos una foto de la propiedad.';
      return null;
    case 4:
      return null; // Amenidades son opcionales
    default:
      return null;
  }
}
