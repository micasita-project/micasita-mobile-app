/**
 * @layer shared/model
 * @description Context para compartir el workplace seleccionado entre tabs
 * (recommend → map). Permite que el mapa refleje el workplace activo del tab de recomendaciones.
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/features/auth';

interface SelectedWorkplaceContextValue {
  selectedWorkplaceId: number | null;
  setSelectedWorkplaceId: (id: number | null) => void;
}

const SelectedWorkplaceContext = createContext<SelectedWorkplaceContextValue | undefined>(undefined);

export function SelectedWorkplaceProvider({ children }: { children: ReactNode }) {
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<number | null>(null);
  const { isAuthenticated } = useAuth();

  // Resetear selección al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedWorkplaceId(null);
    }
  }, [isAuthenticated]);

  return (
    <SelectedWorkplaceContext.Provider value={{ selectedWorkplaceId, setSelectedWorkplaceId }}>
      {children}
    </SelectedWorkplaceContext.Provider>
  );
}

export function useSelectedWorkplace() {
  const ctx = useContext(SelectedWorkplaceContext);
  if (!ctx) throw new Error('useSelectedWorkplace debe usarse dentro de SelectedWorkplaceProvider');
  return ctx;
}
