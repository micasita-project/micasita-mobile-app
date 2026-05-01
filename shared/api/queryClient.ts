/**
 * @layer shared/api
 * @description Instancia global de React Query para manejar cache, refetch y estados de loading.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Los datos se consideran frescos por 5 minutos
      retry: 2,
    },
  },
});
