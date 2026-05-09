/**
 * @layer entities/housing/model
 * @description React Query hooks para la entidad Housing.
 * Usa useInfiniteQuery para el scroll infinito con soporte de filtros.
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllProperties,
  createProperty,
  deleteProperty,
  uploadPropertyImage,
} from '../api/housing.api';
import type { CreatePropertyRequest, PropertyFilters } from '../api/housing.api';

/** Keys centralizadas para invalidar cache */
export const propertyKeys = {
  all: ['properties'] as const,
  list: (filters: PropertyFilters) => [...propertyKeys.all, 'list', filters] as const,
};

const LIMIT = 10;

/**
 * Hook para listar propiedades con infinite scroll y filtros.
 * Público: no requiere auth.
 */
export function useProperties(filters: PropertyFilters = {}) {
  return useInfiniteQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: ({ pageParam = 0 }) => fetchAllProperties(pageParam as number, LIMIT, filters),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.flatMap((p) => p.items).length;
      if (loaded >= lastPage.total) return undefined;
      return loaded; // next skip = total items loaded so far
    },
    initialPageParam: 0,
  });
}

/**
 * Hook para crear una nueva propiedad.
 * Invalida la cache de propiedades automáticamente al completarse.
 */
export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePropertyRequest) => createProperty(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

/**
 * Hook para eliminar una propiedad.
 */
export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: number) => deleteProperty(propertyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

/**
 * Hook para subir una imagen.
 * Retorna la URL pública.
 */
export function useUploadPropertyImage() {
  return useMutation({
    mutationFn: (fileUri: string) => uploadPropertyImage(fileUri),
  });
}
